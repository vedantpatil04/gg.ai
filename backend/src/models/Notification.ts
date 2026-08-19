import mongoose, { Document, Schema } from "mongoose";

export type NotificationCategory =
  | "complaints"
  | "assignments"
  | "authorities"
  | "platform"
  | "environmental"
  | "security"
  | "ai"
  | "system"
  // Communication Hub — tickets, bug reports, feature requests, feedback
  | "support";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export type NotificationStatus = "unread" | "read" | "archived";

export type NotificationRecipientRole = "citizen" | "authority" | "administrator";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  /** The user this notification belongs to */
  userId: mongoose.Types.ObjectId;
  /** Role of the recipient — used for role-specific filtering */
  recipientRole: NotificationRecipientRole;

  title: string;
  summary: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;

  /** Deep-link target — e.g. "/citizen?tab=complaints&id=<id>" */
  link?: string;
  /** Optional entity id for quick access on the frontend */
  entityId?: string;
  entityType?: "complaint" | "authority" | "platform" | "user" | "ticket" | "bug" | "feature" | "feedback";

  readAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipientRole: {
      type: String,
      enum: ["citizen", "authority", "administrator"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200, trim: true },
    summary: { type: String, required: true, maxlength: 500, trim: true },
    category: {
      type: String,
      enum: ["complaints", "assignments", "authorities", "platform", "environmental", "security", "ai", "system", "support"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["unread", "read", "archived"],
      default: "unread",
    },
    link: { type: String, trim: true },
    entityId: { type: String, trim: true },
    entityType: {
      type: String,
      enum: ["complaint", "authority", "platform", "user", "ticket", "bug", "feature", "feedback"],
    },
    readAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);

// Efficient queries: user's notifications, newest first
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, category: 1, createdAt: -1 });

// TTL: auto-expire archived notifications after 90 days
NotificationSchema.index(
  { archivedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, sparse: true },
);

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
