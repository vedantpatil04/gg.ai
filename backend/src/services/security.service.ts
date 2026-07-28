import crypto from "crypto";
import mongoose from "mongoose";
import { User, MAX_FAILED_LOGIN_ATTEMPTS, ACCOUNT_LOCK_DURATION_MS } from "../models/User";
import { Session } from "../models/Session";
import { LoginHistory, LoginStatus } from "../models/LoginHistory";
import { SecurityEvent, SecurityEventAction, SecurityEventResult } from "../models/SecurityEvent";
import { Otp } from "../models/Otp";
import { RequestMeta } from "../utils/requestMeta";
import { logger } from "../utils/logger";
import { sendEmail, emailChangeOtpEmailHtml, emailChangedNotificationHtml } from "./email.service";

/**
 * Security Center Phase 1 — data foundation.
 *
 * These helpers are intentionally additive and best-effort: every write
 * here is wrapped so that a failure recording history/audit data can never
 * throw and break the actual login/logout/refresh/password flow that
 * already works today. They are called from auth.controller.ts alongside
 * the existing logic, not instead of it.
 */

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Login History ───────────────────────────────────────────────────────────
export async function recordLoginHistory(
  userId: mongoose.Types.ObjectId | string,
  meta: RequestMeta,
  loginStatus: LoginStatus,
): Promise<void> {
  try {
    await LoginHistory.create({
      userId,
      device: meta.device,
      browser: meta.browser,
      os: meta.os,
      ip: meta.ip,
      loginStatus,
    });
  } catch (err) {
    logger.error("Failed to record login history", err);
  }
}

// ─── Security Event / Audit Log ──────────────────────────────────────────────
export async function recordSecurityEvent(
  userId: mongoose.Types.ObjectId | string,
  action: SecurityEventAction,
  result: SecurityEventResult,
  meta?: Partial<RequestMeta>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await SecurityEvent.create({
      userId,
      action,
      result,
      ipAddress: meta?.ip,
      userAgent: meta?.browser && meta?.os ? `${meta.browser} on ${meta.os}` : undefined,
      device: meta?.device,
      metadata,
    });
  } catch (err) {
    logger.error("Failed to record security event", err);
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function createSession(
  userId: mongoose.Types.ObjectId | string,
  sessionId: string,
  refreshToken: string,
  meta: RequestMeta,
  expiresAt?: Date | null,
): Promise<void> {
  try {
    await Session.create({
      sessionId,
      userId,
      refreshTokenHash: hashToken(refreshToken),
      device: meta.device,
      browser: meta.browser,
      os: meta.os,
      ip: meta.ip,
      lastActive: new Date(),
      expiresAt: expiresAt ?? undefined,
      revoked: false,
    });
  } catch (err) {
    logger.error("Failed to create session record", err);
  }
}

/**
 * Security Center Phase 4: the query-level definition of "still an active
 * session" — not revoked, AND not past its real refresh-token expiry.
 * Sessions with no expiresAt (created before Phase 4) are treated as still
 * valid rather than expired, so nothing existing disappears from the list.
 * Shared by getSecurityStatus's count and getSessions's listing so the two
 * can never silently disagree.
 */
export function activeSessionFilter(userId: mongoose.Types.ObjectId | string) {
  return {
    userId,
    revoked: false,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  };
}

export async function revokeSessionByToken(
  refreshToken: string,
  revokedBy: mongoose.Types.ObjectId | string,
  revocationReason: string,
): Promise<void> {
  try {
    await Session.updateOne(
      { refreshTokenHash: hashToken(refreshToken), revoked: false },
      { revoked: true, revokedAt: new Date(), revokedBy, revocationReason },
    );
  } catch (err) {
    logger.error("Failed to revoke session", err);
  }
}

export async function revokeAllSessionsForUser(
  userId: mongoose.Types.ObjectId | string,
  revokedBy: mongoose.Types.ObjectId | string,
  revocationReason: string,
): Promise<void> {
  try {
    await Session.updateMany(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date(), revokedBy, revocationReason },
    );
  } catch (err) {
    logger.error("Failed to revoke all sessions for user", err);
  }
}

/**
 * Revokes one session by its sessionId (not the refresh token — the caller
 * only ever knows sessionId, from GET /api/security/sessions). Returns:
 *  - "not_found"       — no session with this id exists at all
 *  - "forbidden"        — session exists but belongs to a different user
 *  - "already_revoked"  — session exists, belongs to this user, already revoked
 *  - "revoked"          — session existed, belonged to this user, now revoked
 * The security.controller.ts maps each outcome to the appropriate HTTP status.
 */
export type RevokeSessionOutcome = "not_found" | "forbidden" | "already_revoked" | "revoked";

export async function revokeSessionById(
  sessionId: string,
  requestingUserId: mongoose.Types.ObjectId | string,
  revocationReason: string,
): Promise<RevokeSessionOutcome> {
  const session = await Session.findOne({ sessionId });
  if (!session) return "not_found";
  if (session.userId.toString() !== requestingUserId.toString()) return "forbidden";
  if (session.revoked) return "already_revoked";

  session.revoked = true;
  session.revokedAt = new Date();
  session.revokedBy = new mongoose.Types.ObjectId(requestingUserId);
  session.revocationReason = revocationReason;
  await session.save();
  return "revoked";
}

/**
 * Revokes every active session for a user EXCEPT the one identified by
 * currentSessionId, for "log out of all other devices". Returns the number
 * of sessions actually revoked.
 */
export async function revokeAllSessionsExcept(
  userId: mongoose.Types.ObjectId | string,
  currentSessionId: string,
  revokedBy: mongoose.Types.ObjectId | string,
  revocationReason: string,
): Promise<number> {
  const result = await Session.updateMany(
    { userId, revoked: false, sessionId: { $ne: currentSessionId } },
    { revoked: true, revokedAt: new Date(), revokedBy, revocationReason },
  );
  return result.modifiedCount ?? 0;
}

// ─── Failed-login lockout ────────────────────────────────────────────────────
/**
 * Increments the failed-login counter for a user and locks the account once
 * MAX_FAILED_LOGIN_ATTEMPTS is reached. Returns the updated attempt count and
 * whether the account is now locked, so the caller (login()) can decide what
 * message to return without duplicating the threshold logic.
 */
export async function registerFailedLogin(
  userId: mongoose.Types.ObjectId | string,
): Promise<{ attempts: number; locked: boolean }> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { failedLoginAttempts: 1 } },
    { new: true, select: "+failedLoginAttempts +accountLockedUntil" },
  );

  if (!user) return { attempts: 0, locked: false };

  const attempts = user.failedLoginAttempts ?? 0;
  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
    await User.findByIdAndUpdate(userId, {
      accountLockedUntil: lockedUntil,
      failedLoginAttempts: 0,
    });
    return { attempts, locked: true };
  }

  return { attempts, locked: false };
}

export async function resetFailedLogins(userId: mongoose.Types.ObjectId | string): Promise<void> {
  try {
    await User.findByIdAndUpdate(userId, { failedLoginAttempts: 0, accountLockedUntil: undefined });
  } catch (err) {
    logger.error("Failed to reset failed-login counter", err);
  }
}

// ─── Email-change OTP (Phase 6) ────────────────────────────────────────────────
/**
 * Policy constants — named and centralized like MAX_FAILED_LOGIN_ATTEMPTS
 * above, so the route/controller/service never disagree on the numbers.
 */
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

function generateOtp(): string {
  // crypto.randomInt is a CSPRNG (unlike Math.random) — same standard-library
  // primitive already used for hashing throughout this file, no new
  // dependency needed for "cryptographically secure OTP".
  const max = 10 ** OTP_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

export type RequestEmailOtpOutcome =
  | { status: "sent" }
  | { status: "same_email" }
  | { status: "duplicate_email" }
  | { status: "cooldown"; retryAfterMs: number };

/**
 * Step 1 of the email-change flow: validates the new email, generates and
 * stores a hashed OTP, and emails the raw code to the NEW address (proving
 * the requester actually controls it). The raw OTP is returned to nothing
 * and logged nowhere — it exists only inside this function and the email
 * body.
 */
export async function requestEmailChangeOtp(
  userId: mongoose.Types.ObjectId | string,
  currentEmail: string,
  requestedEmail: string,
  userName: string,
): Promise<RequestEmailOtpOutcome> {
  const newEmail = requestedEmail.trim().toLowerCase();

  if (newEmail === currentEmail.trim().toLowerCase()) {
    return { status: "same_email" };
  }

  const owner = await User.findOne({ email: newEmail }).select("_id");
  if (owner && owner._id.toString() !== userId.toString()) {
    return { status: "duplicate_email" };
  }

  const existing = await Otp.findOne({ userId, purpose: "EMAIL_CHANGE" }).select("lastSentAt");
  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return { status: "cooldown", retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed };
    }
  }

  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const now = new Date();

  await Otp.findOneAndUpdate(
    { userId, purpose: "EMAIL_CHANGE" },
    {
      email: newEmail,
      otpHash,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      attempts: 0,
      lastSentAt: now,
      consumed: false,
    },
    { upsert: true, new: true },
  );

  // Sent to the NEW address, not the current one — see file header comment.
  await sendEmail({
    to: newEmail,
    subject: "GreenGuard AI — Verify your new email",
    html: emailChangeOtpEmailHtml(userName, otp, newEmail),
  });

  return { status: "sent" };
}

export type VerifyEmailOtpOutcome =
  | { status: "verified" }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "email_mismatch" }
  | { status: "too_many_attempts" }
  | { status: "invalid"; attemptsRemaining: number };

/**
 * Step 2: checks the submitted code against the stored hash. Does NOT
 * update the user's email itself — that happens in security.controller.ts
 * after this returns "verified", alongside the re-check for a
 * since-registered duplicate and the SecurityEvent/session/notification
 * side effects, which belong at the controller layer, not buried in a
 * verify function.
 */
export async function verifyEmailChangeOtp(
  userId: mongoose.Types.ObjectId | string,
  requestedEmail: string,
  otp: string,
): Promise<VerifyEmailOtpOutcome> {
  const newEmail = requestedEmail.trim().toLowerCase();
  const record = await Otp.findOne({ userId, purpose: "EMAIL_CHANGE" }).select("+otpHash");

  if (!record || record.consumed) return { status: "not_found" };
  if (record.email !== newEmail) return { status: "email_mismatch" };
  if (record.expiresAt.getTime() < Date.now()) return { status: "expired" };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { status: "too_many_attempts" };

  if (hashToken(otp) !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return {
      status: "invalid",
      attemptsRemaining: Math.max(OTP_MAX_ATTEMPTS - record.attempts, 0),
    };
  }

  record.consumed = true;
  await record.save();
  return { status: "verified" };
}

/**
 * Sends the "your email changed" notice to the OLD address — the
 * closest fit this codebase has to "emit a notification event" (there is
 * no pub/sub/event-bus infrastructure here to plug into; email + the
 * SecurityEvent audit log, both already used everywhere else in this
 * file, are the existing notification mechanism). Best-effort, like every
 * other side-effect helper in this file.
 */
export async function sendEmailChangedNotification(
  oldEmail: string,
  newEmail: string,
  userName: string,
): Promise<void> {
  try {
    await sendEmail({
      to: oldEmail,
      subject: "GreenGuard AI — Your email address was changed",
      html: emailChangedNotificationHtml(userName, oldEmail, newEmail),
    });
  } catch (err) {
    logger.error("Failed to send email-changed notification", err);
  }
}

// ─── Phone verification OTP (Phase 7) ─────────────────────────────────────────
/**
 * Validates and normalises a phone number to E.164-ish format for storage.
 * Only digits, leading + preserved. Returns null for clearly invalid input.
 * Not full E.164 validation — that would require a libphonenumber dependency
 * which this project deliberately avoids (per "no new deps unless essential").
 * A simple client-side pattern check prevents obviously bad inputs before
 * they ever reach here.
 */
export function normalisePhone(raw: string): string | null {
  const stripped = raw.trim().replace(/[\s\-().]/g, "");
  if (!/^\+?\d{7,15}$/.test(stripped)) return null;
  return stripped;
}

export type RequestPhoneOtpOutcome =
  | { status: "sent"; smsSent: false; reason: "no_sms_provider" }
  | { status: "cooldown"; retryAfterMs: number }
  | { status: "no_phone" }
  | { status: "already_verified" };

/**
 * Generates and stores a hashed phone-verification OTP. Because no SMS
 * provider is configured in this project (confirmed: no Twilio/Vonage/SNS
 * package in package.json, no TWILIO_* env vars), we cannot actually send
 * the OTP via SMS. The OTP IS generated and stored — the full backend
 * infrastructure is real — but the outcome makes it explicit that SMS
 * delivery did not happen, so the UI can show an honest "SMS not configured"
 * message rather than claiming a code was delivered. When an SMS provider is
 * added later, only the delivery call below needs to change.
 */
export async function requestPhoneVerificationOtp(
  userId: mongoose.Types.ObjectId | string,
  phone: string,
): Promise<RequestPhoneOtpOutcome> {
  if (!phone) return { status: "no_phone" };

  // Re-check that the phone is still the user's current phone and still
  // unverified, in case this runs after a gap since the UI loaded.
  const user = await User.findById(userId).select("phone phoneVerified");
  if (!user?.phone) return { status: "no_phone" };
  if (user.phoneVerified) return { status: "already_verified" };

  const existing = await Otp.findOne({ userId, purpose: "PHONE_VERIFICATION" }).select(
    "lastSentAt",
  );
  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      return { status: "cooldown", retryAfterMs: OTP_RESEND_COOLDOWN_MS - elapsed };
    }
  }

  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const now = new Date();

  await Otp.findOneAndUpdate(
    { userId, purpose: "PHONE_VERIFICATION" },
    {
      email: user.phone, // 'email' field repurposed as the target identifier
      otpHash,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
      attempts: 0,
      lastSentAt: now,
      consumed: false,
    },
    { upsert: true, new: true },
  );

  // ─── SMS would be sent here ────────────────────────────────────────────
  // e.g. await twilioClient.messages.create({ to: user.phone, body: `Your GreenGuard verification code: ${otp}` });
  // The `otp` variable is intentionally left unused here — it is NOT
  // logged, NOT returned, and NOT included in any response. When an SMS
  // provider is wired up, only the delivery call above needs to be added.
  // ──────────────────────────────────────────────────────────────────────
  void otp; // suppress "unused variable" warning — see comment above

  return { status: "sent", smsSent: false, reason: "no_sms_provider" };
}

export type VerifyPhoneOtpOutcome =
  | { status: "verified" }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "too_many_attempts" }
  | { status: "invalid"; attemptsRemaining: number };

export async function verifyPhoneOtp(
  userId: mongoose.Types.ObjectId | string,
  otp: string,
): Promise<VerifyPhoneOtpOutcome> {
  const record = await Otp.findOne({ userId, purpose: "PHONE_VERIFICATION" }).select("+otpHash");

  if (!record || record.consumed) return { status: "not_found" };
  if (record.expiresAt.getTime() < Date.now()) return { status: "expired" };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { status: "too_many_attempts" };

  if (hashToken(otp) !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return {
      status: "invalid",
      attemptsRemaining: Math.max(OTP_MAX_ATTEMPTS - record.attempts, 0),
    };
  }

  record.consumed = true;
  await record.save();

  // Mark the user's phone as verified immediately — this is a safe write
  // inside the service rather than forcing the controller to do it, because
  // unlike email-change (which has multiple side effects including session
  // invalidation and notification emails), phone verification's only
  // database side effect is phoneVerified = true.
  await User.findByIdAndUpdate(userId, { phoneVerified: true, securityUpdatedAt: new Date() });

  return { status: "verified" };
}
