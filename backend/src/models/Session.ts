import mongoose, { Document, Schema } from "mongoose";

/**
 * Security Center Phase 1 — data foundation.
 *
 * The existing auth system issues refresh tokens (see jwt.service.ts) and
 * keeps them, as plain token strings, in User.refreshTokens. That array is
 * left completely untouched by this model so existing login/refresh/logout
 * behavior stays exactly as it was.
 *
 * Session is an additive collection: one document per issued refresh token,
 * carrying the metadata a "Security Center" (active sessions list, device
 * recognition, revoke-by-session) needs. Sessions are correlated to a
 * refresh token via `sessionId`, which is embedded as the `sid` claim when
 * the token is generated (see jwt.service.ts). The raw refresh token itself
 * is never stored here — only a SHA-256 hash, purely so a session can be
 * looked up when a specific token is presented (e.g. on logout) without
 * persisting a second copy of the bearer secret.
 */
export interface ISession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
  createdAt: Date;
  lastActive: Date;
  // Security Center Phase 4: mirrors the issuing refresh token's real `exp`
  // claim (see jwt.service.ts's getTokenExpiry). Optional — sessions created
  // before Phase 4 simply don't have it, and every query below treats a
  // missing expiresAt as "still valid" rather than "expired", so existing
  // sessions keep working exactly as before.
  expiresAt?: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revocationReason?: string;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refreshTokenHash: { type: String, required: true, select: false },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    ip: { type: String },
    location: { type: String },
    lastActive: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revocationReason: { type: String },
  },
  {
    // createdAt/updatedAt via timestamps; updatedAt is unused but kept for
    // consistency with every other model in this codebase.
    timestamps: true,
  },
);

SessionSchema.index({ userId: 1, revoked: 1, lastActive: -1 });
SessionSchema.index({ sessionId: 1 }, { unique: true });
SessionSchema.index({ revoked: 1 });
// Documents without expiresAt (pre-Phase-4 sessions) are simply ignored by
// this index — MongoDB TTL indexes skip docs missing the indexed field, so
// this can't retroactively delete anything unexpected.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>("Session", SessionSchema);
