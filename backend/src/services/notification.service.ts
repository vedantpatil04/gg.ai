/**
 * Automation 3 — Central Notification Service (In-App + Email + FCM)
 *
 * Single centralized service responsible for:
 *  - Determining recipients
 *  - Writing In-App Notification records (source of truth for Notification Center)
 *  - Delivering Emails via existing Gmail SMTP (email.service.ts)
 *  - Delivering Push notifications via existing Android FCM (push.service.ts)
 *  - Non-blocking delivery (SMTP/FCM failure never breaks complaint transactions)
 *  - Deduplication / Idempotency protection
 */

import mongoose from "mongoose";
import {
  Notification,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationRecipientRole,
} from "../models/Notification";
import { User, type IUser } from "../models/User";
import { NOTIFICATION_CATEGORIES } from "../constants/notifications";
import { logger } from "../utils/logger";
import { sendPushToUser, sendPushToUsers } from "./push.service";
import {
  sendEmail,
  complaintSubmittedEmailHtml,
  complaintAssignedEmailHtml,
  investigationStartedEmailHtml,
  resolutionSubmittedEmailHtml,
  reworkRequestedEmailHtml,
  complaintClosedEmailHtml,
  routingFailedEmailHtml,
  criticalEscalationEmailHtml,
} from "./email.service";

function getNotificationFrontendUrl(): string {
  const envUrl = process.env.FRONTEND_URL?.trim().replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      return envUrl;
    }
    return "https://gg-ai-system.vercel.app";
  }
  return envUrl || "http://localhost:5173";
}

const FRONTEND_URL = getNotificationFrontendUrl();

// ─── Deduplication / Idempotency Cache ────────────────────────────────────────
const recentEvents = new Map<string, number>();

function isDuplicateEvent(key: string, windowMs = 5000): boolean {
  const now = Date.now();
  const lastTime = recentEvents.get(key);
  if (lastTime && now - lastTime < windowMs) {
    return true;
  }
  recentEvents.set(key, now);
  if (recentEvents.size > 2000) {
    for (const [k, v] of recentEvents.entries()) {
      if (now - v > 60000) recentEvents.delete(k);
    }
  }
  return false;
}

// ─── Preference Category Mapping ──────────────────────────────────────────────
const PREFERENCE_CATEGORY_MAP: Record<NotificationCategory, (typeof NOTIFICATION_CATEGORIES)[number]> = {
  complaints: "complaints",
  assignments: "authority",
  authorities: "authority",
  platform: "admin",
  environmental: "environment",
  security: "security",
  ai: "system",
  system: "system",
  support: "system",
};

async function isEmailEnabledForUser(
  userId: mongoose.Types.ObjectId | string,
  category: NotificationCategory,
): Promise<{ enabled: boolean; email?: string; name?: string }> {
  try {
    const user = await User.findById(userId).select("email name preferences.notifications").lean();
    if (!user || !user.email) return { enabled: false };

    const prefCategory = PREFERENCE_CATEGORY_MAP[category] ?? "system";
    const channels = user.preferences?.notifications?.[prefCategory];
    if (channels && typeof channels.email === "boolean" && !channels.email) {
      return { enabled: false, email: user.email, name: user.name };
    }
    return { enabled: true, email: user.email, name: user.name };
  } catch (err) {
    logger.error("[notification] Failed to evaluate email preference:", err);
    return { enabled: false };
  }
}

// ─── Admin ID Resolution Helper ───────────────────────────────────────────────
export async function getAdminUserIds(): Promise<mongoose.Types.ObjectId[]> {
  try {
    const admins = await User.find({ role: "administrator", isActive: true }).select("_id").lean();
    return admins.map((a) => a._id as mongoose.Types.ObjectId);
  } catch (err) {
    logger.error("[notification] Failed to query admin IDs:", err);
    return [];
  }
}

// ─── Core creation helper ─────────────────────────────────────────────────────

export interface EmailPayloadInput {
  subject: string;
  html: string;
  to?: string;
}

export interface CreateNotificationInput {
  userId: mongoose.Types.ObjectId | string;
  recipientRole: NotificationRecipientRole;
  title: string;
  summary: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  link?: string;
  entityId?: string;
  entityType?: "complaint" | "authority" | "platform" | "user" | "ticket" | "bug" | "feature" | "feedback";
  emailPayload?: EmailPayloadInput;
  idempotencyKey?: string;
}

/**
 * Creates an in-app notification and dispatches push (FCM) + email (Gmail SMTP).
 * Delivery failures in push or email are non-blocking and never throw.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const dedupKey = input.idempotencyKey || `${String(input.userId)}:${input.entityType || ""}:${input.entityId || ""}:${input.title}`;
    if (isDuplicateEvent(dedupKey)) {
      logger.info(`[notification] Duplicate event suppressed for key: ${dedupKey}`);
      return;
    }

    const notification = await Notification.create({
      userId: input.userId,
      recipientRole: input.recipientRole,
      title: input.title,
      summary: input.summary,
      category: input.category,
      priority: input.priority ?? "medium",
      status: "unread",
      link: input.link,
      entityId: input.entityId,
      entityType: input.entityType,
    });

    // Push delivery (FCM) — safe, non-blocking
    await sendPushToUser(input.userId, {
      notificationId: notification._id.toString(),
      type: input.category,
      title: input.title,
      body: input.summary,
      entityType: input.entityType,
      entityId: input.entityId,
      route: input.link,
      priority: input.priority ?? "medium",
    }).catch((pushErr) => {
      logger.error("[notification] Push delivery failed:", pushErr);
    });

    // Email delivery (Gmail SMTP) — safe, non-blocking
    if (input.emailPayload) {
      const emailPref = await isEmailEnabledForUser(input.userId, input.category);
      if (emailPref.enabled && (input.emailPayload.to || emailPref.email)) {
        await sendEmail({
          to: input.emailPayload.to || emailPref.email!,
          subject: input.emailPayload.subject,
          html: input.emailPayload.html,
        }).catch((emailErr) => {
          logger.error("[notification] Email delivery failed:", emailErr);
        });
      }
    }
  } catch (err) {
    logger.error("Failed to create notification:", err);
  }
}

// ─── Bulk creation (fan-out to multiple users) ────────────────────────────────

export interface BulkNotificationInput extends Omit<CreateNotificationInput, "userId" | "recipientRole"> {
  recipients: Array<{ userId: mongoose.Types.ObjectId | string; role: NotificationRecipientRole }>;
  emailFactory?: (recipientId: string, recipientName: string) => EmailPayloadInput | null;
}

export async function fanOutNotification(input: BulkNotificationInput): Promise<void> {
  try {
    if (input.recipients.length === 0) return;

    const docs = input.recipients.map((r) => ({
      userId: r.userId,
      recipientRole: r.role,
      title: input.title,
      summary: input.summary,
      category: input.category,
      priority: input.priority ?? "medium",
      status: "unread" as const,
      link: input.link,
      entityId: input.entityId,
      entityType: input.entityType,
    }));
    const created = await Notification.insertMany(docs, { ordered: false });
    const notificationIdByUser = new Map(created.map((doc) => [String(doc.userId), doc._id.toString()]));

    // Push fan-out (FCM) — safe, non-blocking
    await sendPushToUsers({
      recipients: input.recipients,
      payload: {
        type: input.category,
        title: input.title,
        body: input.summary,
        entityType: input.entityType,
        entityId: input.entityId,
        route: input.link,
        priority: input.priority ?? "medium",
        notificationIdByUser,
      },
    }).catch((pushErr) => {
      logger.error("[notification] Bulk push delivery failed:", pushErr);
    });

    // Email fan-out (Gmail SMTP) — safe, non-blocking
    if (input.emailPayload || input.emailFactory) {
      await Promise.all(
        input.recipients.map(async (r) => {
          try {
            const emailPref = await isEmailEnabledForUser(r.userId, input.category);
            if (!emailPref.enabled || !emailPref.email) return;

            const payload = input.emailFactory
              ? input.emailFactory(String(r.userId), emailPref.name || "Administrator")
              : input.emailPayload;

            if (payload) {
              await sendEmail({
                to: payload.to || emailPref.email,
                subject: payload.subject,
                html: payload.html,
              });
            }
          } catch (err) {
            logger.error(`[notification] Bulk email failed for user ${String(r.userId)}:`, err);
          }
        }),
      );
    }
  } catch (err) {
    logger.error("Failed to fan-out notifications:", err);
  }
}

// ─── Complaint lifecycle notifications ────────────────────────────────────────

/**
 * Called when a citizen creates a complaint.
 * MUST always notify the citizen of submission (even if auto-assigned afterwards).
 * If adminIds are provided (e.g. unassigned complaint), admins also receive an alert.
 */
export async function notifyComplaintSubmitted(
  citizenId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  complaintDetails: {
    cityId: string;
    issueType: string;
    priority: string;
    address?: string;
  },
  adminIds?: mongoose.Types.ObjectId[],
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();
  const citizenLink = `/citizen?tab=complaints&id=${complaintId}`;
  const citizenUrl = `${FRONTEND_URL}${citizenLink}`;

  // 1. Citizen submission confirmation (In-App + Email + FCM)
  const citizenUser = await User.findById(citizenId).select("name email").lean();
  const citizenName = citizenUser?.name || "Citizen";

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Complaint Submitted",
    summary: `Your complaint "${complaintTitle}" has been received (Ref #GG-${shortId}) and is under review.`,
    category: "complaints",
    priority: "medium",
    link: citizenLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `complaint_submitted:${complaintId}:${String(citizenId)}`,
    emailPayload: {
      subject: `GreenGuard AI — Complaint Received: Ref #GG-${shortId}`,
      html: complaintSubmittedEmailHtml({
        name: citizenName,
        complaintId,
        title: complaintTitle,
        issueType: complaintDetails.issueType,
        cityId: complaintDetails.cityId,
        locationAddress: complaintDetails.address,
        priority: complaintDetails.priority,
        viewUrl: citizenUrl,
      }),
    },
  });

  // 2. Admin alerts (when unassigned / requires assignment)
  if (adminIds && adminIds.length > 0) {
    const adminLink = `/admin/complaints?id=${complaintId}`;
    const adminUrl = `${FRONTEND_URL}${adminLink}`;

    await fanOutNotification({
      recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
      title: "New Complaint Submitted",
      summary: `Complaint "${complaintTitle}" (Ref #GG-${shortId}) requires assignment.`,
      category: "complaints",
      priority: "medium",
      link: adminLink,
      entityId: complaintId,
      entityType: "complaint",
      idempotencyKey: `complaint_submitted_admin:${complaintId}`,
      emailFactory: (_adminId, adminName) => ({
        subject: `[Admin Alert] New Complaint Submitted: Ref #GG-${shortId}`,
        html: complaintSubmittedEmailHtml({
          name: adminName,
          complaintId,
          title: complaintTitle,
          issueType: complaintDetails.issueType,
          cityId: complaintDetails.cityId,
          locationAddress: complaintDetails.address,
          priority: complaintDetails.priority,
          viewUrl: adminUrl,
        }),
      }),
    });
  }
}

/**
 * Called when a complaint is assigned (automatically by Smart Routing or manually by Admin).
 *  → Citizen: complaint assigned for investigation
 *  → Authority: new complaint assigned to work queue
 */
export async function notifyComplaintAssigned(
  citizenId: mongoose.Types.ObjectId,
  authorityId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  authorityName: string,
  isReassign: boolean,
  assignmentSource: "automatic" | "manual",
  complaintDetails: {
    cityId: string;
    issueType: string;
    priority: string;
    address?: string;
  },
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();
  const citizenLink = `/citizen?tab=complaints&id=${complaintId}`;
  const authorityLink = `/command-center?tab=investigation&id=${complaintId}`;
  const citizenUrl = `${FRONTEND_URL}${citizenLink}`;
  const authorityUrl = `${FRONTEND_URL}${authorityLink}`;

  const [citizenUser, authorityUser] = await Promise.all([
    User.findById(citizenId).select("name email").lean(),
    User.findById(authorityId).select("name email").lean(),
  ]);

  const citizenName = citizenUser?.name || "Citizen";
  const authorityRecipientName = authorityUser?.name || authorityName || "Authority Officer";

  // Citizen update (In-App + Email + FCM)
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: isReassign ? "Complaint Reassigned" : "Complaint Accepted",
    summary: isReassign
      ? `Your complaint "${complaintTitle}" (Ref #GG-${shortId}) has been reassigned to ${authorityName}.`
      : `Your complaint "${complaintTitle}" (Ref #GG-${shortId}) has been accepted and assigned for investigation.`,
    category: "complaints",
    priority: "medium",
    link: citizenLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `complaint_assigned_citizen:${complaintId}:${String(citizenId)}:${isReassign ? "reassign" : "assign"}`,
    emailPayload: {
      subject: `GreenGuard AI — Complaint Assigned: Ref #GG-${shortId}`,
      html: complaintAssignedEmailHtml({
        name: citizenName,
        role: "citizen",
        complaintId,
        title: complaintTitle,
        issueType: complaintDetails.issueType,
        cityId: complaintDetails.cityId,
        locationAddress: complaintDetails.address,
        priority: complaintDetails.priority,
        assignmentSource,
        authorityName,
        viewUrl: citizenUrl,
      }),
    },
  });

  // Authority notification (In-App + Email + FCM)
  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: isReassign ? "Complaint Reassigned to You" : "Complaint Assigned to You",
    summary: `Complaint "${complaintTitle}" (Ref #GG-${shortId}) in ${complaintDetails.cityId.toUpperCase()} has been ${isReassign ? "reassigned" : "assigned"} to you (${assignmentSource === "automatic" ? "Smart Routing" : "Manual"}).`,
    category: "assignments",
    priority: "high",
    link: authorityLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `complaint_assigned_auth:${complaintId}:${String(authorityId)}:${isReassign ? "reassign" : "assign"}`,
    emailPayload: {
      subject: `New complaint assigned to you: Ref #GG-${shortId}`,
      html: complaintAssignedEmailHtml({
        name: authorityRecipientName,
        role: "authority",
        complaintId,
        title: complaintTitle,
        issueType: complaintDetails.issueType,
        cityId: complaintDetails.cityId,
        locationAddress: complaintDetails.address,
        priority: complaintDetails.priority,
        assignmentSource,
        authorityName,
        viewUrl: authorityUrl,
      }),
    },
  });
}

/**
 * Called when authority changes status to in-progress.
 *  → Citizen: investigation started
 */
export async function notifyInvestigationStarted(
  citizenId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  cityId = "belagavi",
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();
  const citizenLink = `/citizen?tab=complaints&id=${complaintId}`;
  const citizenUrl = `${FRONTEND_URL}${citizenLink}`;

  const citizenUser = await User.findById(citizenId).select("name email").lean();
  const citizenName = citizenUser?.name || "Citizen";

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Investigation Started",
    summary: `Investigation into your complaint "${complaintTitle}" (Ref #GG-${shortId}) has begun.`,
    category: "complaints",
    priority: "medium",
    link: citizenLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `investigation_started:${complaintId}:${String(citizenId)}`,
    emailPayload: {
      subject: `GreenGuard AI — Investigation Started: Ref #GG-${shortId}`,
      html: investigationStartedEmailHtml({
        name: citizenName,
        complaintId,
        title: complaintTitle,
        cityId,
        viewUrl: citizenUrl,
      }),
    },
  });
}

/**
 * Called when evidence/images are added (authority-visible only).
 *  → Citizen: evidence added (stripped of internal details)
 */
export async function notifyEvidenceAdded(
  citizenId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Evidence Added",
    summary: `New evidence has been documented for your complaint "${complaintTitle}" (Ref #GG-${shortId}).`,
    category: "complaints",
    priority: "low",
    link: `/citizen?tab=complaints&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `evidence_added:${complaintId}:${Date.now().toString().slice(0, -4)}`,
  });
}

/**
 * Called when authority submits resolution.
 * Distinct paths:
 *  - "citizen_review" (status: awaiting_citizen_review): First resolution -> Citizen review required. Authority receives confirmation. Admin is NOT notified as verifier.
 *  - "admin_verify" (status: resolved): Post-rework revised resolution -> Admin verification required. Citizen & Authority receive updates.
 */
export async function notifyResolutionSubmitted(
  citizenId: mongoose.Types.ObjectId,
  authorityId: mongoose.Types.ObjectId | undefined,
  adminIds: mongoose.Types.ObjectId[],
  complaintId: string,
  complaintTitle: string,
  path: "citizen_review" | "admin_verify",
  resolutionText = "Resolution details submitted.",
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();
  const citizenLink = `/citizen?tab=complaints&id=${complaintId}`;
  const citizenUrl = `${FRONTEND_URL}${citizenLink}`;

  const [citizenUser, authorityUser] = await Promise.all([
    User.findById(citizenId).select("name email").lean(),
    authorityId ? User.findById(authorityId).select("name email").lean() : null,
  ]);

  const citizenName = citizenUser?.name || "Citizen";
  const authorityName = authorityUser?.name || "Environmental Authority";

  if (path === "citizen_review") {
    // 1. Citizen Review Required (In-App + Email + FCM)
    await createNotification({
      userId: citizenId,
      recipientRole: "citizen",
      title: "Resolution Submitted — Review Required",
      summary: `A resolution has been submitted for your complaint "${complaintTitle}" (Ref #GG-${shortId}). Please review and accept or request rework.`,
      category: "complaints",
      priority: "high",
      link: citizenLink,
      entityId: complaintId,
      entityType: "complaint",
      idempotencyKey: `resolution_submitted_citizen:${complaintId}`,
      emailPayload: {
        subject: `Resolution submitted for your complaint: Ref #GG-${shortId}`,
        html: resolutionSubmittedEmailHtml({
          name: citizenName,
          role: "citizen",
          complaintId,
          title: complaintTitle,
          authorityName,
          resolution: resolutionText,
          viewUrl: citizenUrl,
        }),
      },
    });

    // 2. Authority confirmation (In-App)
    if (authorityId) {
      await createNotification({
        userId: authorityId,
        recipientRole: "authority",
        title: "Resolution Submitted",
        summary: `Your resolution for "${complaintTitle}" (Ref #GG-${shortId}) has been sent to the citizen for review.`,
        category: "assignments",
        priority: "medium",
        link: `/command-center?tab=investigation&id=${complaintId}`,
        entityId: complaintId,
        entityType: "complaint",
        idempotencyKey: `resolution_submitted_auth:${complaintId}`,
      });
    }

    // Notice: Admin is NOT notified as a verifier on the standard citizen-review path.
    return;
  }

  // Admin Verification Path (resubmitted resolution post-rework)
  // 1. Citizen update
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Resolution Resubmitted",
    summary: `A revised resolution for "${complaintTitle}" (Ref #GG-${shortId}) has been submitted and is pending administrator verification.`,
    category: "complaints",
    priority: "medium",
    link: citizenLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `resolution_resubmitted_citizen:${complaintId}`,
  });

  // 2. Authority confirmation
  if (authorityId) {
    await createNotification({
      userId: authorityId,
      recipientRole: "authority",
      title: "Resolution Submitted for Verification",
      summary: `Your resolution for "${complaintTitle}" (Ref #GG-${shortId}) has been submitted and is awaiting administrator verification.`,
      category: "assignments",
      priority: "medium",
      link: `/command-center?tab=investigation&id=${complaintId}`,
      entityId: complaintId,
      entityType: "complaint",
      idempotencyKey: `resolution_resubmitted_auth:${complaintId}`,
    });
  }

  // 3. Admin verification notification (In-App + Email + FCM)
  const adminLink = `/admin/complaints?id=${complaintId}&action=verify`;
  const adminUrl = `${FRONTEND_URL}${adminLink}`;

  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: "Resolution Awaiting Verification",
    summary: `A revised resolution for "${complaintTitle}" (Ref #GG-${shortId}) requires your verification before closure.`,
    category: "complaints",
    priority: "high",
    link: adminLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `resolution_verify_admin:${complaintId}`,
    emailFactory: (_adminId, adminName) => ({
      subject: `[Admin Action Required] Verify Resolution: Ref #GG-${shortId}`,
      html: resolutionSubmittedEmailHtml({
        name: adminName,
        role: "administrator",
        complaintId,
        title: complaintTitle,
        authorityName,
        resolution: resolutionText,
        viewUrl: adminUrl,
      }),
    }),
  });
}

/**
 * Called when citizen requests rework during Citizen Review.
 *  → Authority: rework requested (action required)
 *  → Administrator: governance notification
 */
export async function notifyCitizenReworkRequested(
  authorityId: mongoose.Types.ObjectId | undefined,
  adminIds: mongoose.Types.ObjectId[],
  complaintId: string,
  complaintTitle: string,
  reason: string,
  comments?: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  // 1. Authority notification
  if (authorityId) {
    const authLink = `/command-center?tab=investigation&id=${complaintId}`;
    const authUrl = `${FRONTEND_URL}${authLink}`;
    const authUser = await User.findById(authorityId).select("name email").lean();
    const authName = authUser?.name || "Authority Officer";

    await createNotification({
      userId: authorityId,
      recipientRole: "authority",
      title: "Rework Requested by Citizen",
      summary: `Citizen requested revision for "${complaintTitle}" (Ref #GG-${shortId}): ${reason.slice(0, 120)}${reason.length > 120 ? "…" : ""}`,
      category: "assignments",
      priority: "high",
      link: authLink,
      entityId: complaintId,
      entityType: "complaint",
      idempotencyKey: `rework_req_auth:${complaintId}:${Date.now().toString().slice(0, -4)}`,
      emailPayload: {
        subject: `Rework requested for complaint #${shortId}`,
        html: reworkRequestedEmailHtml({
          name: authName,
          role: "authority",
          complaintId,
          title: complaintTitle,
          reason,
          comments,
          requestedByRole: "citizen",
          viewUrl: authUrl,
        }),
      },
    });
  }

  // 2. Administrator governance notification
  if (adminIds && adminIds.length > 0) {
    const adminLink = `/admin/complaints?id=${complaintId}`;
    const adminUrl = `${FRONTEND_URL}${adminLink}`;

    await fanOutNotification({
      recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
      title: "Citizen Rework Request",
      summary: `Citizen requested rework for "${complaintTitle}" (Ref #GG-${shortId}): ${reason.slice(0, 100)}`,
      category: "complaints",
      priority: "high",
      link: adminLink,
      entityId: complaintId,
      entityType: "complaint",
      idempotencyKey: `rework_req_admin:${complaintId}:${Date.now().toString().slice(0, -4)}`,
      emailFactory: (_adminId, adminName) => ({
        subject: `[Governance Alert] Citizen Rework Request: Ref #GG-${shortId}`,
        html: reworkRequestedEmailHtml({
          name: adminName,
          role: "administrator",
          complaintId,
          title: complaintTitle,
          reason,
          comments,
          requestedByRole: "citizen",
          viewUrl: adminUrl,
        }),
      }),
    });
  }
}

/**
 * Called when administrator requests rework from the verification queue.
 *  → Authority: rework requested
 */
export async function notifyAdminReworkRequested(
  authorityId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  reason: string,
  comments?: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();
  const authLink = `/command-center?tab=investigation&id=${complaintId}`;
  const authUrl = `${FRONTEND_URL}${authLink}`;
  const authUser = await User.findById(authorityId).select("name email").lean();
  const authName = authUser?.name || "Authority Officer";

  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "Rework Requested by Administrator",
    summary: `Administrator requested revision for "${complaintTitle}" (Ref #GG-${shortId}): ${reason.slice(0, 120)}${reason.length > 120 ? "…" : ""}`,
    category: "assignments",
    priority: "high",
    link: authLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `admin_rework_req_auth:${complaintId}:${Date.now().toString().slice(0, -4)}`,
    emailPayload: {
      subject: `Rework requested for complaint #${shortId}`,
      html: reworkRequestedEmailHtml({
        name: authName,
        role: "authority",
        complaintId,
        title: complaintTitle,
        reason,
        comments,
        requestedByRole: "admin",
        viewUrl: authUrl,
      }),
    },
  });
}

/**
 * Called when complaint is closed (by Citizen accepting resolution or Admin verifying).
 * Deduplicated so that multiple closure paths cannot trigger duplicate closure notifications.
 *  → Citizen: complaint closed
 *  → Authority: resolution approved
 */
export async function notifyComplaintClosed(
  citizenId: mongoose.Types.ObjectId,
  authorityId: mongoose.Types.ObjectId | undefined,
  complaintId: string,
  complaintTitle: string,
  closedBy: "citizen_accepted" | "admin_verified",
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  // Guard against duplicate closure notifications
  const closureKey = `complaint_closed:${complaintId}`;
  if (isDuplicateEvent(closureKey, 30000)) {
    logger.info(`[notification] Complaint closure notification already sent for ${complaintId}`);
    return;
  }

  const citizenLink = `/citizen?tab=complaints&id=${complaintId}`;
  const citizenUrl = `${FRONTEND_URL}${citizenLink}`;

  const [citizenUser, authorityUser] = await Promise.all([
    User.findById(citizenId).select("name email").lean(),
    authorityId ? User.findById(authorityId).select("name email").lean() : null,
  ]);

  const citizenName = citizenUser?.name || "Citizen";
  const authorityName = authorityUser?.name || "Authority Officer";

  // Citizen confirmation (In-App + Email + FCM)
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Complaint Closed",
    summary: `Your complaint "${complaintTitle}" (Ref #GG-${shortId}) has been ${closedBy === "citizen_accepted" ? "accepted and closed" : "verified and closed"}. Thank you for your report.`,
    category: "complaints",
    priority: "medium",
    link: citizenLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `complaint_closed_citizen:${complaintId}`,
    emailPayload: {
      subject: `GreenGuard AI — Complaint Closed: Ref #GG-${shortId}`,
      html: complaintClosedEmailHtml({
        name: citizenName,
        role: "citizen",
        complaintId,
        title: complaintTitle,
        closedByReason: closedBy === "citizen_accepted" ? "Accepted by Citizen" : "Verified by Administrator",
        viewUrl: citizenUrl,
      }),
    },
  });

  // Authority confirmation (In-App + Email + FCM)
  if (authorityId) {
    const authLink = `/command-center?tab=investigation&id=${complaintId}`;
    const authUrl = `${FRONTEND_URL}${authLink}`;

    await createNotification({
      userId: authorityId,
      recipientRole: "authority",
      title: "Resolution Approved — Complaint Closed",
      summary: `Your resolution for "${complaintTitle}" (Ref #GG-${shortId}) has been ${closedBy === "citizen_accepted" ? "accepted by the citizen" : "verified by the administrator"} and closed.`,
      category: "assignments",
      priority: "medium",
      link: authLink,
      entityId: complaintId,
      entityType: "complaint",
      idempotencyKey: `complaint_closed_auth:${complaintId}`,
      emailPayload: {
        subject: `Resolution Approved — Complaint Closed: Ref #GG-${shortId}`,
        html: complaintClosedEmailHtml({
          name: authorityName,
          role: "authority",
          complaintId,
          title: complaintTitle,
          closedByReason: closedBy === "citizen_accepted" ? "Accepted by Citizen" : "Verified by Administrator",
          viewUrl: authUrl,
        }),
      },
    });
  }
}

/**
 * Called when Smart Routing fails to assign a complaint.
 *  → Administrator: alert for manual assignment
 */
export async function notifyRoutingFailed(
  adminIds: mongoose.Types.ObjectId[],
  complaintId: string,
  complaintTitle: string,
  cityId: string,
  reason: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();
  const adminLink = `/admin/complaints?id=${complaintId}`;
  const adminUrl = `${FRONTEND_URL}${adminLink}`;

  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: "Smart Routing Alert",
    summary: `Routing failure for "${complaintTitle}" (Ref #GG-${shortId}) in ${cityId.toUpperCase()}: ${reason.slice(0, 100)}`,
    category: "complaints",
    priority: "high",
    link: adminLink,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `routing_failed_admin:${complaintId}`,
    emailFactory: (_adminId, adminName) => ({
      subject: `[Routing Alert] Manual Assignment Required: Ref #GG-${shortId}`,
      html: routingFailedEmailHtml({
        name: adminName,
        complaintId,
        title: complaintTitle,
        cityId,
        reason,
        viewUrl: adminUrl,
      }),
    }),
  });
}

/**
 * Called when a citizen or authority sends a complaint-scoped message
 * (Phase 6). Notifies only the other participant — never the sender.
 */
export async function notifyNewMessage(
  recipientId: mongoose.Types.ObjectId,
  recipientRole: NotificationRecipientRole,
  senderName: string,
  complaintId: string,
  complaintTitle: string,
  complaintCityId: string,
): Promise<void> {
  const link =
    recipientRole === "citizen"
      ? `/citizen?tab=complaints&id=${complaintId}&panel=messages`
      : `/command-center?tab=investigation&id=${complaintId}&panel=messages`;

  await createNotification({
    userId: recipientId,
    recipientRole,
    title: `New message from ${senderName}`,
    summary: `${complaintTitle} — ${complaintCityId}`,
    category: "complaints",
    priority: "medium",
    link,
    entityId: complaintId,
    entityType: "complaint",
    idempotencyKey: `new_msg:${complaintId}:${String(recipientId)}:${Date.now().toString().slice(0, -3)}`,
  });
}

// ─── Authority account notifications ─────────────────────────────────────────

export async function notifyAuthorityRegistrationRequest(
  adminIds: mongoose.Types.ObjectId[],
  authorityName: string,
  authorityId: string,
): Promise<void> {
  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: "Authority Registration Request",
    summary: `${authorityName} has submitted a registration request awaiting your approval.`,
    category: "authorities",
    priority: "high",
    link: `/admin/authority-requests`,
    entityId: authorityId,
    entityType: "authority",
  });
}

export async function notifyAuthorityApproved(authorityId: mongoose.Types.ObjectId): Promise<void> {
  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "Account Approved",
    summary: "Your Authority account has been approved. You can now log in and receive complaint assignments.",
    category: "authorities",
    priority: "high",
    link: "/command-center",
    entityType: "authority",
  });
}

export async function notifyAuthorityRejected(authorityId: mongoose.Types.ObjectId): Promise<void> {
  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "Account Application Status",
    summary: "Your Authority account registration was not approved. Please contact an administrator for further information.",
    category: "authorities",
    priority: "high",
    entityType: "authority",
  });
}

export async function notifyAuthorityStatusChanged(
  authorityId: mongoose.Types.ObjectId,
  newStatus: string,
): Promise<void> {
  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "Account Status Updated",
    summary: `Your account status has been updated to: ${newStatus}. Contact your administrator if you have questions.`,
    category: "security",
    priority: "high",
    entityType: "authority",
  });
}

export async function notifyCityAssignmentUpdated(
  authorityId: mongoose.Types.ObjectId,
): Promise<void> {
  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "City Assignments Updated",
    summary: "Your city assignment has been updated. Please review your current assignments in your profile.",
    category: "assignments",
    priority: "medium",
    link: "/profile",
    entityType: "authority",
  });
}

// ─── Security notifications ───────────────────────────────────────────────────

export async function notifyPasswordChanged(
  userId: mongoose.Types.ObjectId,
  role: NotificationRecipientRole,
): Promise<void> {
  await createNotification({
    userId,
    recipientRole: role,
    title: "Password Changed",
    summary: "Your account password has been successfully changed. If this wasn't you, contact support immediately.",
    category: "security",
    priority: "high",
    link: "/security",
    entityType: "user",
  });
}

export async function notifyAccountLocked(
  userId: mongoose.Types.ObjectId,
  role: NotificationRecipientRole,
): Promise<void> {
  await createNotification({
    userId,
    recipientRole: role,
    title: "Account Temporarily Locked",
    summary: "Your account has been temporarily locked due to multiple failed login attempts. It will unlock automatically.",
    category: "security",
    priority: "critical",
    entityType: "user",
  });
}

export async function notifyAccountUnlocked(
  userId: mongoose.Types.ObjectId,
  role: NotificationRecipientRole,
): Promise<void> {
  await createNotification({
    userId,
    recipientRole: role,
    title: "Account Unlocked",
    summary: "Your account has been unlocked by an administrator.",
    category: "security",
    priority: "high",
    link: "/security",
    entityType: "user",
  });
}

// ─── Platform / admin notifications ──────────────────────────────────────────

export async function notifyPlatformAlert(
  adminIds: mongoose.Types.ObjectId[],
  title: string,
  summary: string,
  priority: NotificationPriority = "high",
): Promise<void> {
  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title,
    summary,
    category: "platform",
    priority,
    link: "/admin/platform-health",
    entityType: "platform",
  });
}

// ─── Authority Board Automation notifications ────────────────────────────────

export async function notifyBoardCoverageGap(
  adminIds: mongoose.Types.ObjectId[],
  boardName: string,
  cityId: string,
  reason: string,
): Promise<void> {
  const shortCity = cityId.toUpperCase();
  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: `Coverage Alert: ${boardName} (${shortCity})`,
    summary: `Operational coverage gap in ${shortCity}: ${reason}`,
    category: "authorities",
    priority: "high",
    link: `/admin/authorities?city=${cityId}`,
    entityType: "authority",
    idempotencyKey: `coverage_gap:${boardName}:${cityId}:${new Date().toDateString()}`,
  });
}

// ─── Communication Hub — tickets / bug reports / feature requests / feedback ──

export type SupportItemType = "ticket" | "bug" | "feature" | "feedback";

const SUPPORT_TYPE_LABEL: Record<SupportItemType, string> = {
  ticket: "support ticket",
  bug: "bug report",
  feature: "feature request",
  feedback: "feedback",
};

const SUPPORT_HELP_TAB: Record<SupportItemType, string> = {
  ticket: "tickets",
  bug: "bug",
  feature: "feature",
  feedback: "feedback",
};
const SUPPORT_HUB_TAB: Record<SupportItemType, string> = {
  ticket: "tickets",
  bug: "bugs",
  feature: "features",
  feedback: "feedback",
};

function citizenSupportLink(type: SupportItemType, id: string): string {
  return `/help/support?tab=${SUPPORT_HELP_TAB[type]}&id=${id}`;
}

function adminSupportLink(type: SupportItemType, id: string): string {
  return `/admin/communication?tab=${SUPPORT_HUB_TAB[type]}&id=${id}`;
}

export async function notifySupportItemSubmitted(
  citizenId: mongoose.Types.ObjectId,
  type: SupportItemType,
  itemId: string,
  itemTitle: string,
  adminIds: mongoose.Types.ObjectId[],
): Promise<void> {
  const label = SUPPORT_TYPE_LABEL[type];

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: `${label.charAt(0).toUpperCase()}${label.slice(1)} received`,
    summary: `Your ${label} "${itemTitle}" has been received and is under review.`,
    category: "support",
    priority: "low",
    link: citizenSupportLink(type, itemId),
    entityId: itemId,
    entityType: type,
  });

  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: `New ${label} submitted`,
    summary: `"${itemTitle}" was just submitted and needs review.`,
    category: "support",
    priority: type === "ticket" ? "medium" : "low",
    link: adminSupportLink(type, itemId),
    entityId: itemId,
    entityType: type,
  });
}

export async function notifySupportReply(
  citizenId: mongoose.Types.ObjectId,
  type: SupportItemType,
  itemId: string,
  itemTitle: string,
): Promise<void> {
  const label = SUPPORT_TYPE_LABEL[type];
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Administrator replied",
    summary: `An administrator replied to your ${label} "${itemTitle}".`,
    category: "support",
    priority: "medium",
    link: citizenSupportLink(type, itemId),
    entityId: itemId,
    entityType: type,
  });
}

export async function notifySupportResolved(
  citizenId: mongoose.Types.ObjectId,
  type: SupportItemType,
  itemId: string,
  itemTitle: string,
): Promise<void> {
  const label = SUPPORT_TYPE_LABEL[type];
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: `${label.charAt(0).toUpperCase()}${label.slice(1)} resolved`,
    summary: `Your ${label} "${itemTitle}" has been marked resolved. Reopen it if you need further help.`,
    category: "support",
    priority: "medium",
    link: citizenSupportLink(type, itemId),
    entityId: itemId,
    entityType: type,
  });
}

export async function notifySupportReopened(
  type: SupportItemType,
  itemId: string,
  itemTitle: string,
  reopenedByAdmin: boolean,
  citizenId: mongoose.Types.ObjectId,
  adminIds: mongoose.Types.ObjectId[],
): Promise<void> {
  const label = SUPPORT_TYPE_LABEL[type];

  if (reopenedByAdmin) {
    await createNotification({
      userId: citizenId,
      recipientRole: "citizen",
      title: `${label.charAt(0).toUpperCase()}${label.slice(1)} reopened`,
      summary: `Your ${label} "${itemTitle}" has been reopened by an administrator.`,
      category: "support",
      priority: "medium",
      link: citizenSupportLink(type, itemId),
      entityId: itemId,
      entityType: type,
    });
  } else {
    await fanOutNotification({
      recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
      title: `${label.charAt(0).toUpperCase()}${label.slice(1)} reopened`,
      summary: `"${itemTitle}" was reopened and needs another look.`,
      category: "support",
      priority: "medium",
      link: adminSupportLink(type, itemId),
      entityId: itemId,
      entityType: type,
    });
  }
}

// ─── Emergency broadcast ──────────────────────────────────────────────────────

export async function notifyEmergencyBroadcast(
  recipients: Array<{ userId: mongoose.Types.ObjectId; role: NotificationRecipientRole }>,
  broadcastId: string,
  title: string,
  message: string,
  priority: NotificationPriority,
): Promise<void> {
  await fanOutNotification({
    recipients,
    title: `Emergency Alert: ${title}`,
    summary: message,
    category: "platform",
    priority,
    entityId: broadcastId,
    entityType: "platform",
  });
}

// ─── Automation 7 — Priority Intelligence & Critical Escalation Notifications ───

/**
 * Called when Priority Intelligence detects critical operational risk.
 * Alerts Administrators and assigned Authority (if any) via In-App + Email + FCM.
 */
export async function notifyCriticalEscalation(
  complaintId: string,
  complaintTitle: string,
  cityId: string,
  priorityScore: number,
  reasons: string[],
  authorityId?: mongoose.Types.ObjectId,
  issueType = "general",
): Promise<void> {
  try {
    const shortId = complaintId.toString().slice(-6).toUpperCase();
    const idempotencyKey = `critical_escalation:${complaintId}`;
    if (isDuplicateEvent(idempotencyKey, 60000)) {
      logger.info(`[notification] Critical escalation notification already sent for ${complaintId}`);
      return;
    }

    // 1. Fetch active administrators
    const admins = await User.find({ role: "administrator", isActive: true }).select("_id name email").lean();
    const adminIds = admins.map((a) => a._id as mongoose.Types.ObjectId);

    // 2. Notify Administrators (In-App + Email + FCM)
    if (adminIds.length > 0) {
      const adminLink = `/admin/complaints?id=${complaintId}&tab=escalation`;
      const adminUrl = `${FRONTEND_URL}${adminLink}`;

      await fanOutNotification({
        recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
        title: `CRITICAL ESCALATION: Ref #GG-${shortId}`,
        summary: `Critical risk detected (Score ${priorityScore}/100) for "${complaintTitle}" in ${cityId.toUpperCase()}: ${reasons.slice(0, 2).join("; ")}`,
        category: "platform",
        priority: "critical",
        link: adminLink,
        entityId: complaintId,
        entityType: "complaint",
        idempotencyKey: `crit_esc_admin:${complaintId}`,
        emailFactory: (_adminId, adminName) => ({
          subject: `[URGENT] CRITICAL ESCALATION: Ref #GG-${shortId} (${cityId.toUpperCase()})`,
          html: criticalEscalationEmailHtml({
            name: adminName,
            role: "administrator",
            complaintId,
            title: complaintTitle,
            issueType,
            cityId,
            priorityScore,
            reasons,
            viewUrl: adminUrl,
          }),
        }),
      });
    }

    // 3. Notify Assigned Authority (if assigned)
    if (authorityId) {
      const authUser = await User.findById(authorityId).select("name email").lean();
      if (authUser) {
        const authLink = `/command-center?tab=investigation&id=${complaintId}`;
        const authUrl = `${FRONTEND_URL}${authLink}`;

        await createNotification({
          userId: authorityId,
          recipientRole: "authority",
          title: `CRITICAL INCIDENT ALERT: Ref #GG-${shortId}`,
          summary: `Your assigned incident "${complaintTitle}" has been assessed as CRITICAL (Score: ${priorityScore}/100). Immediate action required.`,
          category: "assignments",
          priority: "critical",
          link: authLink,
          entityId: complaintId,
          entityType: "complaint",
          idempotencyKey: `crit_esc_auth:${complaintId}`,
          emailPayload: {
            subject: `[CRITICAL ACTION REQUIRED] Incident Ref #GG-${shortId}`,
            html: criticalEscalationEmailHtml({
              name: authUser.name || "Authority Officer",
              role: "authority",
              complaintId,
              title: complaintTitle,
              issueType,
              cityId,
              priorityScore,
              reasons,
              viewUrl: authUrl,
            }),
          },
        });
      }
    }
  } catch (err) {
    logger.warn(`[notification] notifyCriticalEscalation non-blocking error: ${(err as Error).message}`);
  }
}

/**
 * Called when an administrator or authority acknowledges an escalation.
 */
export async function notifyEscalationAcknowledged(
  complaintId: string,
  complaintTitle: string,
  acknowledgedByName: string,
  authorityId?: mongoose.Types.ObjectId,
): Promise<void> {
  try {
    const shortId = complaintId.toString().slice(-6).toUpperCase();
    if (authorityId) {
      await createNotification({
        userId: authorityId,
        recipientRole: "authority",
        title: "Escalation Acknowledged",
        summary: `Escalation for "${complaintTitle}" (Ref #GG-${shortId}) has been acknowledged by ${acknowledgedByName}.`,
        category: "assignments",
        priority: "medium",
        link: `/command-center?tab=investigation&id=${complaintId}`,
        entityId: complaintId,
        entityType: "complaint",
        idempotencyKey: `esc_ack:${complaintId}:${Date.now().toString().slice(0, -4)}`,
      });
    }
  } catch (err) {
    logger.warn(`[notification] notifyEscalationAcknowledged error: ${(err as Error).message}`);
  }
}

/**
 * Called when critical condition / escalation is resolved.
 */
export async function notifyEscalationResolved(
  complaintId: string,
  complaintTitle: string,
  resolvedByName: string,
  authorityId?: mongoose.Types.ObjectId,
): Promise<void> {
  try {
    const shortId = complaintId.toString().slice(-6).toUpperCase();
    if (authorityId) {
      await createNotification({
        userId: authorityId,
        recipientRole: "authority",
        title: "Critical Escalation Resolved",
        summary: `Critical escalation for "${complaintTitle}" (Ref #GG-${shortId}) marked resolved by ${resolvedByName}.`,
        category: "assignments",
        priority: "medium",
        link: `/command-center?tab=investigation&id=${complaintId}`,
        entityId: complaintId,
        entityType: "complaint",
        idempotencyKey: `esc_res:${complaintId}:${Date.now().toString().slice(0, -4)}`,
      });
    }
  } catch (err) {
    logger.warn(`[notification] notifyEscalationResolved error: ${(err as Error).message}`);
  }
}