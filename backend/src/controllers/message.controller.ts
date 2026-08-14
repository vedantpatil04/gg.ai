import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Message } from "../models/Message";
import { Complaint } from "../models/Complaint";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { authorityOwns } from "./complaint.controller";
import { notifyNewMessage } from "../services/notification.service";

/**
 * Phase 6 — Citizen Communication & Future-Ready Messaging.
 *
 * Authorization is derived entirely from the Complaint document + the
 * authenticated user (never from client-supplied ids) — see §25/§8 of the
 * Phase 6 spec:
 *   - Citizen: only the complaint's own submittedBy.
 *   - Authority: only the complaint's currently assignedTo (reuses the same
 *     authorityOwns() guard as the rest of the complaint controller, so a
 *     reassignment immediately and correctly revokes the previous
 *     authority's access — §9).
 *   - Administrator: read-only oversight; never a conversation participant.
 */

type ConversationRole = "citizen" | "authority" | "administrator";

function resolveAccess(
  complaint: InstanceType<typeof Complaint>,
  user: AuthRequest["user"],
): { canRead: boolean; canSend: boolean; role: ConversationRole } | null {
  if (!user) return null;

  if (user.role === "citizen") {
    if (complaint.submittedBy.toString() !== user._id.toString()) return null;
    return { canRead: true, canSend: true, role: "citizen" };
  }

  if (user.role === "authority") {
    if (!authorityOwns(complaint, user)) return null;
    return { canRead: true, canSend: true, role: "authority" };
  }

  if (user.role === "administrator") {
    // Administrators already have unrestricted complaint visibility
    // elsewhere (getComplaint, the governance queue) — read access here is
    // consistent with that. Sending is withheld: Phase 6 defines this as a
    // strictly two-party Citizen ↔ Authority channel.
    return { canRead: true, canSend: false, role: "administrator" };
  }

  return null;
}

// ─── List conversation ─────────────────────────────────────────────────────────
export async function getComplaintMessages(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    const access = resolveAccess(complaint, req.user);
    if (!access?.canRead) return next(new AppError("Access denied", 403));

    const messages = await Message.find({ complaintId: complaint._id })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: { messages, canSend: access.canSend } });
  } catch (err) {
    next(err);
  }
}

// ─── Send message ───────────────────────────────────────────────────────────────
export async function sendComplaintMessage(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body) return next(new AppError("Message cannot be empty", 400));
    if (body.length > 2000) {
      return next(new AppError("Message is too long (max 2000 characters)", 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    const access = resolveAccess(complaint, req.user);
    if (!access?.canSend) return next(new AppError("Access denied", 403));

    // §1: the conversation is between the citizen and the CURRENTLY assigned
    // authority — there is no one to converse with until assignment exists.
    if (!complaint.assignedTo) {
      return next(new AppError("This complaint has not yet been assigned to an authority", 400));
    }
    // §17: closed/rejected complaints are read-only — sending a message must
    // never reopen a complaint.
    if (complaint.status === "closed" || complaint.status === "rejected") {
      return next(new AppError("This conversation is closed and read-only", 400));
    }

    const senderId = req.user._id as mongoose.Types.ObjectId;
    const message = await Message.create({
      complaintId: complaint._id,
      senderId,
      senderRole: access.role as "citizen" | "authority",
      senderName: req.user.name,
      body,
      readBy: [senderId],
    });

    // Notify only the other participant — never the sender.
    const recipientId = access.role === "citizen" ? complaint.assignedTo : complaint.submittedBy;
    const recipientRole: "citizen" | "authority" = access.role === "citizen" ? "authority" : "citizen";
    await notifyNewMessage(
      recipientId as mongoose.Types.ObjectId,
      recipientRole,
      req.user.name,
      complaint._id.toString(),
      complaint.title,
      complaint.cityId,
    );

    res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    next(err);
  }
}

// ─── Mark conversation read ──────────────────────────────────────────────────
export async function markComplaintMessagesRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    const access = resolveAccess(complaint, req.user);
    if (!access?.canRead) return next(new AppError("Access denied", 403));

    const userId = req.user._id as mongoose.Types.ObjectId;
    await Message.updateMany(
      { complaintId: complaint._id, senderId: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Unread count — single complaint ─────────────────────────────────────────
export async function getComplaintUnreadCount(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    const access = resolveAccess(complaint, req.user);
    if (!access?.canRead) return next(new AppError("Access denied", 403));

    const userId = req.user._id as mongoose.Types.ObjectId;
    const count = await Message.countDocuments({
      complaintId: complaint._id,
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    });

    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
}

// ─── Unread counts — bulk, across the current user's own complaints ─────────
// Powers the Work Queue's per-row unread badge (§18) without requiring the
// Authority to open every complaint to find out. Scoped to citizen/authority
// — the two possible conversation participants; administrators have no
// personal "my complaints" queue, so they get an empty map rather than an
// error (keeps the endpoint safe to call from any role without branching
// in every caller).
export async function getMyComplaintUnreadCounts(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    if (req.user.role !== "citizen" && req.user.role !== "authority") {
      res.json({ success: true, data: { counts: {} } });
      return;
    }

    const filter =
      req.user.role === "citizen"
        ? { submittedBy: req.user._id }
        : { assignedTo: req.user._id };
    const complaintIds = await Complaint.find(filter).distinct("_id");
    if (complaintIds.length === 0) {
      res.json({ success: true, data: { counts: {} } });
      return;
    }

    const userId = req.user._id as mongoose.Types.ObjectId;
    const rows = await Message.aggregate([
      {
        $match: {
          complaintId: { $in: complaintIds },
          senderId: { $ne: userId },
          readBy: { $ne: userId },
        },
      },
      { $group: { _id: "$complaintId", count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    for (const row of rows) counts[String(row._id)] = row.count as number;

    res.json({ success: true, data: { counts } });
  } catch (err) {
    next(err);
  }
}
