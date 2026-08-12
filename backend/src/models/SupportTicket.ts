import mongoose, { Document, Schema } from "mongoose";

export type SupportTicketStatus   = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "medium" | "high" | "critical";

export interface ITicketComment {
  body:      string;
  authorId:  mongoose.Types.ObjectId;
  authorName: string;
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
  createdAt:   Date;
  updatedAt:   Date;
}

const TicketCommentSchema = new Schema<ITicketComment>(
  {
    body:       { type: String, required: true, maxlength: 2000 },
    authorId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, maxlength: 100 },
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
      enum: ["open", "in_progress", "waiting", "resolved", "closed"],
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
  },
  { timestamps: true },
);

SupportTicketSchema.index({ submittedBy: 1, status: 1 });
SupportTicketSchema.index({ status: 1, priority: -1 });
SupportTicketSchema.index({ createdAt: -1 });

export const SupportTicket = mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
