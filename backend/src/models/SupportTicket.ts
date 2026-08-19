import mongoose, { Document, Schema } from "mongoose";

// "reopened" added for the Administrator Communication Hub — a ticket the
// admin previously resolved/closed but the citizen (or admin) reopened.
// Existing values are unchanged so old data and code keep working.
export type SupportTicketStatus   = "open" | "in_progress" | "waiting" | "resolved" | "closed" | "reopened";
export type SupportTicketPriority = "low" | "medium" | "high" | "critical";

export interface ITicketComment {
  body:      string;
  authorId:  mongoose.Types.ObjectId;
  authorName: string;
  /** Who posted this — drives conversation styling (citizen vs admin). Optional so
   *  comments created before this field existed still load without error. */
  authorRole?: "citizen" | "authority" | "administrator";
  /** True for auto-generated entries (e.g. "Marked resolved by administrator")
   *  rather than a human-authored reply. */
  isSystem?: boolean;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  subject:     string;
  description: string;
  category:    string;
  department:  string;
  environment: string;
  browser?:    string;
  device?:     string;
  status:      SupportTicketStatus;
  priority:    SupportTicketPriority;
  submittedBy: mongoose.Types.ObjectId;
  assignedTeam?: string;
  comments:    ITicketComment[];
  /** Has an administrator opened this ticket since the last citizen activity?
   *  Powers the Communication Hub's "Unread" filter/stat. Defaults to false
   *  (unread) on creation and whenever the citizen adds a new comment. */
  adminRead:   boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const TicketCommentSchema = new Schema<ITicketComment>(
  {
    body:       { type: String, required: true, maxlength: 2000 },
    authorId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, maxlength: 100 },
    authorRole: { type: String, enum: ["citizen", "authority", "administrator"] },
    isSystem:   { type: Boolean, default: false },
    createdAt:  { type: Date, default: () => new Date() },
  },
  { _id: true },
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    subject:     { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category:    { type: String, required: true, trim: true, maxlength: 100 },
    department:  { type: String, default: "General", trim: true, maxlength: 100 },
    environment: { type: String, default: "Production", trim: true, maxlength: 100 },
    browser:     { type: String, trim: true, maxlength: 50 },
    device:      { type: String, trim: true, maxlength: 50 },
    status:      {
      type: String,
      enum: ["open", "in_progress", "waiting", "resolved", "closed", "reopened"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    submittedBy:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTeam: { type: String, trim: true, maxlength: 100 },
    comments:     { type: [TicketCommentSchema], default: [] },
    adminRead:    { type: Boolean, default: false },
  },
  { timestamps: true },
);

SupportTicketSchema.index({ submittedBy: 1, status: 1 });
SupportTicketSchema.index({ status: 1, priority: -1 });
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ adminRead: 1 });

export const SupportTicket = mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
