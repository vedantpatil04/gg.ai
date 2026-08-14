/**
 * Phase 7 — Notification Service
 *
 * Single service used by every role. Role-aware delivery, not separate
 * implementations. Generates notifications from existing workflow events
 * without duplicating business logic.
 */

import mongoose from "mongoose";
import {
  Notification,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationRecipientRole,
} from "../models/Notification";
import { logger } from "../utils/logger";

// ─── Core creation helper ─────────────────────────────────────────────────────

interface CreateNotificationInput {
  userId: mongoose.Types.ObjectId | string;
  recipientRole: NotificationRecipientRole;
  title: string;
  summary: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  link?: string;
  entityId?: string;
  entityType?: "complaint" | "authority" | "platform" | "user";
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await Notification.create({
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
  } catch (err) {
    // Notifications must never break the calling workflow
    logger.error("Failed to create notification:", err);
  }
}

// ─── Bulk creation (fan-out to multiple users) ────────────────────────────────

interface BulkNotificationInput extends Omit<CreateNotificationInput, "userId" | "recipientRole"> {
  recipients: Array<{ userId: mongoose.Types.ObjectId | string; role: NotificationRecipientRole }>;
}

export async function fanOutNotification(input: BulkNotificationInput): Promise<void> {
  try {
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
    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error("Failed to fan-out notifications:", err);
  }
}

// ─── Complaint lifecycle notifications ────────────────────────────────────────

/**
 * Called when a citizen creates a complaint.
 *  → Citizen: confirmation
 *  → All Administrators: new complaint alert
 */
export async function notifyComplaintSubmitted(
  citizenId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  adminIds: mongoose.Types.ObjectId[],
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  // Citizen confirmation
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Complaint Submitted",
    summary: `Your complaint "${complaintTitle}" has been received (Ref #GG-${shortId}) and is under review.`,
    category: "complaints",
    priority: "medium",
    link: `/citizen?tab=complaints&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
  });

  // Admin alerts
  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: "New Complaint Submitted",
    summary: `Complaint "${complaintTitle}" (Ref #GG-${shortId}) requires assignment.`,
    category: "complaints",
    priority: "medium",
    link: `/admin/complaints?id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
  });
}

/**
 * Called when an admin assigns a complaint.
 *  → Citizen: complaint accepted / assigned
 *  → Authority: new assignment
 */
export async function notifyComplaintAssigned(
  citizenId: mongoose.Types.ObjectId,
  authorityId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  authorityName: string,
  isReassign: boolean,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  // Citizen update
  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: isReassign ? "Complaint Reassigned" : "Complaint Accepted",
    summary: isReassign
      ? `Your complaint "${complaintTitle}" (Ref #GG-${shortId}) has been reassigned to ${authorityName}.`
      : `Your complaint "${complaintTitle}" (Ref #GG-${shortId}) has been accepted and assigned for investigation.`,
    category: "complaints",
    priority: "medium",
    link: `/citizen?tab=complaints&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
  });

  // Authority notification
  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: isReassign ? "Complaint Reassigned to You" : "Complaint Assigned to You",
    summary: `Complaint "${complaintTitle}" (Ref #GG-${shortId}) has been ${isReassign ? "reassigned" : "assigned"} to you. Begin investigation.`,
    category: "assignments",
    priority: "high",
    link: `/command-center?tab=investigation&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
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
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Investigation Started",
    summary: `Investigation into your complaint "${complaintTitle}" (Ref #GG-${shortId}) has begun.`,
    category: "complaints",
    priority: "medium",
    link: `/citizen?tab=complaints&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
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
  });
}

/**
 * Called when authority submits resolution (status → resolved).
 *  → Citizen: resolution submitted (no internal notes exposed)
 *  → Administrator: resolution awaiting verification
 *  → Authority: confirmation
 */
export async function notifyResolutionSubmitted(
  citizenId: mongoose.Types.ObjectId,
  authorityId: mongoose.Types.ObjectId,
  adminIds: mongoose.Types.ObjectId[],
  complaintId: string,
  complaintTitle: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Resolution Submitted",
    summary: `A resolution has been submitted for your complaint "${complaintTitle}" (Ref #GG-${shortId}). It is pending administrator verification.`,
    category: "complaints",
    priority: "medium",
    link: `/citizen?tab=complaints&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
  });

  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "Resolution Submitted",
    summary: `Your resolution for "${complaintTitle}" (Ref #GG-${shortId}) has been submitted and is awaiting administrator approval.`,
    category: "complaints",
    priority: "medium",
    link: `/command-center?tab=investigation&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
  });

  await fanOutNotification({
    recipients: adminIds.map((id) => ({ userId: id, role: "administrator" as const })),
    title: "Resolution Awaiting Verification",
    summary: `A resolution for "${complaintTitle}" (Ref #GG-${shortId}) requires your verification before closure.`,
    category: "complaints",
    priority: "high",
    link: `/admin/complaints?id=${complaintId}&action=verify`,
    entityId: complaintId,
    entityType: "complaint",
  });
}

/**
 * Called when admin verifies resolution (status → closed).
 *  → Citizen: complaint closed
 *  → Authority: resolution approved
 */
export async function notifyComplaintClosed(
  citizenId: mongoose.Types.ObjectId,
  authorityId: mongoose.Types.ObjectId | undefined,
  complaintId: string,
  complaintTitle: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  await createNotification({
    userId: citizenId,
    recipientRole: "citizen",
    title: "Complaint Closed",
    summary: `Your complaint "${complaintTitle}" (Ref #GG-${shortId}) has been verified and closed. Thank you for your report.`,
    category: "complaints",
    priority: "medium",
    link: `/citizen?tab=complaints&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
  });

  if (authorityId) {
    await createNotification({
      userId: authorityId,
      recipientRole: "authority",
      title: "Resolution Approved",
      summary: `Your resolution for "${complaintTitle}" (Ref #GG-${shortId}) has been approved and the complaint is now closed.`,
      category: "assignments",
      priority: "medium",
      link: `/command-center?tab=investigation&id=${complaintId}`,
      entityId: complaintId,
      entityType: "complaint",
    });
  }
}

/**
 * Called when admin requests rework (status → rework).
 *  → Authority: rework requested
 */
export async function notifyReworkRequested(
  authorityId: mongoose.Types.ObjectId,
  complaintId: string,
  complaintTitle: string,
  reason: string,
): Promise<void> {
  const shortId = complaintId.toString().slice(-6).toUpperCase();

  await createNotification({
    userId: authorityId,
    recipientRole: "authority",
    title: "Rework Requested",
    summary: `Your resolution for "${complaintTitle}" (Ref #GG-${shortId}) needs revision: ${reason.slice(0, 120)}${reason.length > 120 ? "…" : ""}`,
    category: "assignments",
    priority: "high",
    link: `/command-center?tab=investigation&id=${complaintId}`,
    entityId: complaintId,
    entityType: "complaint",
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
