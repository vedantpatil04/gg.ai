import mongoose, { Document, Schema } from "mongoose";

/**
 * Phase 6 — Citizen Communication & Future-Ready Messaging.
 *
 * A single complaint uniquely identifies its own Citizen ↔ Authority
 * conversation, so there is no separate Conversation model — participants
 * (complaint owner, currently assigned authority) are derived from the
 * Complaint document itself at request time, never stored redundantly here.
 * This keeps a single reassignment update (Phase 3B/5, untouched) as the
 * only source of truth for "who can currently message whom" — no message
 * denormalizes a snapshot of assignment that could drift from it.
 *
 * senderName is denormalized (same convention as Complaint.assignedByName /
 * verifiedByName) purely so the UI can render a sender label without an
 * extra populate on every fetch.
 */

export type MessageSenderRole = "citizen" | "authority";

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  complaintId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  // Future-ready per Phase 6 spec §12 — the project's existing upload
  // architecture (backend/src/middleware/uploadPhoto.ts) is image-only and
  // tightly coupled to complaint-evidence semantics; reusing it safely for
  // general message attachments is a genuinely separate piece of work, not
  // a trivial reuse. Deferred: the field exists so a later phase can wire
  // it up without a schema migration, but nothing in Phase 6 writes to it.
  attachments: string[];
  // Simplest correct read-state for a two-participant, complaint-scoped
  // conversation: the set of user ids that have read this message. The
  // sender is added automatically on creation. No per-conversation
  // "lastReadAt" cursor is needed at this scale and it would require the
  // Conversation model this design deliberately avoids (§7).
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    complaintId: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["citizen", "authority"], required: true },
    senderName: { type: String, required: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    attachments: { type: [String], default: [] },
    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true },
);

// Chronological fetch of a complaint's conversation — the only read pattern.
MessageSchema.index({ complaintId: 1, createdAt: 1 });
// Unread-count lookups: "messages in complaint X not yet read by user Y".
MessageSchema.index({ complaintId: 1, readBy: 1 });

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
