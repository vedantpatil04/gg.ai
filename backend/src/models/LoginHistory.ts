import mongoose, { Document, Schema } from "mongoose";

/** Security Center Phase 1 — data foundation. */
export type LoginStatus = "SUCCESS" | "FAILED";

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
  loginStatus: LoginStatus;
  createdAt: Date;
}

const LoginHistorySchema = new Schema<ILoginHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    ip: { type: String },
    location: { type: String },
    loginStatus: { type: String, enum: ["SUCCESS", "FAILED"], required: true },
  },
  {
    // updatedAt is irrelevant for an append-only log but timestamps: true
    // matches the rest of the codebase's model conventions; createdAt is
    // the field actually used for the newest-first timeline.
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Newest-first per-user lookups (the primary access pattern for a
// "Security Event Timeline" / login history list).
LoginHistorySchema.index({ userId: 1, createdAt: -1 });

export const LoginHistory = mongoose.model<ILoginHistory>("LoginHistory", LoginHistorySchema);
