import mongoose, { Document, Schema } from "mongoose";

/**
 * Security Center Phase 1 — internal audit/event log.
 *
 * IMPORTANT: this collection is for internal audit/security tracking only.
 * It must not be exposed directly to users through any public API — no
 * route in this phase reads from it. LoginHistory (user-facing) and
 * SecurityEvent (internal audit) are intentionally kept as separate
 * collections so that boundary can't be blurred later by accident.
 */
export type SecurityEventAction =
  | "PASSWORD_CHANGED"
  | "EMAIL_CHANGED"
  | "EMAIL_VERIFICATION_SUCCESS"
  | "PHONE_UPDATED"
  | "PHONE_VERIFICATION_REQUESTED"
  | "PHONE_VERIFIED"
  | "PHONE_VERIFICATION_FAILED"
  | "NEW_LOGIN"
  | "NEW_DEVICE_LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "SESSION_REVOKED"
  | "LOGOUT_ALL_SESSIONS"
  | "ACCOUNT_DEACTIVATED"
  | "TWO_FACTOR_SETUP_STARTED"
  | "TWO_FACTOR_ENABLED"
  | "TWO_FACTOR_VERIFICATION_SUCCESS"
  | "TWO_FACTOR_VERIFICATION_FAILED"
  | "TWO_FACTOR_DISABLED"
  | "RECOVERY_CODE_USED"
  | "RECOVERY_CODES_REGENERATED"
  | "LOGIN_REQUIRES_2FA";

export type SecurityEventResult = "SUCCESS" | "FAILURE";

export interface ISecurityEvent extends Document {
  userId: mongoose.Types.ObjectId;
  action: SecurityEventAction;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  result: SecurityEventResult;
  device?: string;
  metadata?: Record<string, unknown>;
}

const SecurityEventSchema = new Schema<ISecurityEvent>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    enum: [
      "PASSWORD_CHANGED",
      "EMAIL_CHANGED",
      "EMAIL_VERIFICATION_SUCCESS",
      "PHONE_UPDATED",
      "PHONE_VERIFICATION_REQUESTED",
      "PHONE_VERIFIED",
      "PHONE_VERIFICATION_FAILED",
      "NEW_LOGIN",
      "NEW_DEVICE_LOGIN",
      "LOGIN_FAILED",
      "LOGOUT",
      "SESSION_REVOKED",
      "LOGOUT_ALL_SESSIONS",
      "ACCOUNT_DEACTIVATED",
      "TWO_FACTOR_SETUP_STARTED",
      "TWO_FACTOR_ENABLED",
      "TWO_FACTOR_VERIFICATION_SUCCESS",
      "TWO_FACTOR_VERIFICATION_FAILED",
      "TWO_FACTOR_DISABLED",
      "RECOVERY_CODE_USED",
      "RECOVERY_CODES_REGENERATED",
      "LOGIN_REQUIRES_2FA",
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  result: { type: String, enum: ["SUCCESS", "FAILURE"], required: true },
  device: { type: String },
  metadata: { type: Schema.Types.Mixed },
});

SecurityEventSchema.index({ userId: 1, timestamp: -1 });

export const SecurityEvent = mongoose.model<ISecurityEvent>("SecurityEvent", SecurityEventSchema);
