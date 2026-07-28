import mongoose, { Document, Schema } from "mongoose";

/**
 * Security Center Phase 6 — OTP infrastructure.
 *
 * No OTP model existed anywhere in the project before this (checked: the
 * only prior "otp" hits in the codebase were unrelated substring matches in
 * gemini.service.ts/seed data). This is a new, minimal collection rather
 * than overloading Session/LoginHistory/SecurityEvent, none of which are a
 * fit for "a pending, attempt-limited, expiring secret".
 *
 * Deliberately generic via `purpose` rather than an EmailChangeOtp-only
 * shape, so a future phone-OTP or similar flow can reuse this collection
 * instead of spawning a near-duplicate one.
 *
 * The raw OTP is NEVER stored — only otpHash (sha256, same approach as the
 * existing password-reset-token and refresh-token-hash patterns elsewhere
 * in this codebase). otpHash is select:false so it is never accidentally
 * included in a query result that reaches an API response.
 */
export type OtpPurpose = "EMAIL_CHANGE" | "PHONE_VERIFICATION";

export interface IOtp extends Document {
  userId: mongoose.Types.ObjectId;
  // The email/target this OTP proves ownership of. For EMAIL_CHANGE this is
  // the NEW email address (the OTP is sent there, not to the current one —
  // the whole point is proving the user controls the new address).
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  consumed: boolean;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: ["EMAIL_CHANGE", "PHONE_VERIFICATION"], required: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    consumed: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// One active OTP per (user, purpose) — requestEmailChangeOtp upserts on this
// so resending always replaces the previous attempt rather than
// accumulating rows, and verifyEmailChangeOtp always has an unambiguous
// single record to check.
OtpSchema.index({ userId: 1, purpose: 1 }, { unique: true });
// Cleanup only — well past the 10-minute expiry and the resend cooldown, so
// it never interferes with either; it just keeps the collection from
// growing unbounded. Not a substitute for the expiresAt check in
// verifyEmailChangeOtp, which is enforced at read time regardless.
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

export const Otp = mongoose.model<IOtp>("Otp", OtpSchema);
