import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { Session } from "../models/Session";
import { LoginHistory } from "../models/LoginHistory";
import { SecurityEvent } from "../models/SecurityEvent";
import { User } from "../models/User";
import {
  recordSecurityEvent,
  revokeSessionById,
  revokeAllSessionsExcept,
  revokeAllSessionsForUser,
  activeSessionFilter,
  requestEmailChangeOtp,
  verifyEmailChangeOtp as verifyEmailChangeOtpCode,
  sendEmailChangedNotification,
  requestPhoneVerificationOtp,
  verifyPhoneOtp,
  normalisePhone,
} from "../services/security.service";
import { getRequestMeta } from "../utils/requestMeta";
import {
  generateTotpSecret,
  verifyTotp,
  buildTotpUri,
  formatSecretForDisplay,
  generateQrCodeDataUrl,
  generateRecoveryCodes,
  hashRecoveryCode,
  consumeRecoveryCode,
} from "../services/totp.service";

/**
 * Security Center Phase 2 — authenticated, self-service-only APIs on top of
 * the Phase 1 data foundation. Every handler here is mounted behind
 * `authenticate` (see security.routes.ts) and every query/mutation is
 * scoped to req.user._id — there is no path in this file that can read or
 * change another user's security data.
 */

// ─── GET /api/security/status ────────────────────────────────────────────────
export async function getSecurityStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const activeSessionCount = await Session.countDocuments(activeSessionFilter(req.user._id));

    res.json({
      success: true,
      data: {
        email: {
          verified: req.user.isVerified,
          verifiedAt: req.user.emailVerifiedAt ?? null,
        },
        phone: {
          verified: req.user.phoneVerified,
        },
        passwordLastChangedAt: req.user.lastPasswordChangedAt ?? null,
        activeSessionCount,
        lastSuccessfulLogin: req.user.lastLogin ?? null,
        // 2FA does not exist in this project yet — this is a real, current
        // status for every account, not a placeholder value.
        twoFactorAuthentication: req.user.twoFactorEnabled ? "ENABLED" : "DISABLED",
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/security/sessions ──────────────────────────────────────────────
export async function getSessions(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const sessions = await Session.find(activeSessionFilter(req.user._id))
      .sort({ lastActive: -1 })
      .select("sessionId device browser os ip location createdAt lastActive")
      .lean();

    const data = sessions.map((s) => ({
      sessionId: s.sessionId,
      isCurrentSession: !!req.sessionId && s.sessionId === req.sessionId,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      location: s.location,
      createdAt: s.createdAt,
      lastActive: s.lastActive,
    }));

    res.json({ success: true, data: { sessions: data } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/sessions/:sessionId/revoke ───────────────────────────
export async function revokeSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { sessionId } = req.params;

    const outcome = await revokeSessionById(sessionId, req.user._id, "user revoked session");

    if (outcome === "not_found") return next(new AppError("Session not found", 404));
    if (outcome === "forbidden")
      return next(new AppError("You cannot revoke another user's session", 403));
    if (outcome === "already_revoked") return next(new AppError("Session already revoked", 409));

    void recordSecurityEvent(req.user._id, "SESSION_REVOKED", "SUCCESS", undefined, { sessionId });

    res.json({ success: true, message: "Session revoked" });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/sessions/logout-all ──────────────────────────────────
export async function logoutAllOtherSessions(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    // The current session can only be protected from revocation if it's
    // identifiable — i.e. the caller's access token carries a `sid` claim
    // (Phase 2 tokens always do; tokens issued before Phase 2 don't). Rather
    // than guess and risk revoking the very session making this request,
    // require the caller to hold a Phase 2 token.
    if (!req.sessionId) {
      return next(
        new AppError(
          "Current session could not be identified from this access token. Please log in again.",
          400,
        ),
      );
    }

    const revokedCount = await revokeAllSessionsExcept(
      req.user._id,
      req.sessionId,
      req.user._id,
      "logout all other sessions",
    );

    void recordSecurityEvent(req.user._id, "LOGOUT_ALL_SESSIONS", "SUCCESS", undefined, {
      revokedCount,
    });

    res.json({
      success: true,
      message: "Logged out of all other sessions",
      data: { revokedCount },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/security/history ───────────────────────────────────────────────
export async function getLoginHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId: req.user._id };
    if (req.query.filter === "successful") filter.loginStatus = "SUCCESS";
    if (req.query.filter === "failed") filter.loginStatus = "FAILED";

    const [history, total] = await Promise.all([
      LoginHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("device browser os ip location loginStatus createdAt")
        .lean(),
      LoginHistory.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { history, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/security/events ────────────────────────────────────────────────
export async function getSecurityEvents(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };

    const [rawEvents, total] = await Promise.all([
      SecurityEvent.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        // Explicitly excludes ipAddress/userAgent/metadata — this is a
        // user-facing timeline, not the internal audit log. See
        // SecurityEvent.ts for why those stay internal-only.
        .select("action result device timestamp")
        .lean(),
      SecurityEvent.countDocuments(filter),
    ]);

    const events = rawEvents.map((e) => ({
      action: e.action,
      result: e.result,
      device: e.device,
      timestamp: e.timestamp,
    }));

    res.json({
      success: true,
      data: { events, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/email/send-otp ───────────────────────────────────────
export async function sendEmailChangeOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { newEmail } = req.body;

    const outcome = await requestEmailChangeOtp(
      req.user._id,
      req.user.email,
      newEmail,
      req.user.name,
    );

    if (outcome.status === "same_email") {
      return next(new AppError("New email must be different from your current email.", 400));
    }
    if (outcome.status === "duplicate_email") {
      return next(new AppError("This email is already associated with another account.", 409));
    }
    if (outcome.status === "cooldown") {
      const retryAfterSeconds = Math.ceil(outcome.retryAfterMs / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds}s before requesting another code.`,
        data: { retryAfterSeconds },
      });
      return;
    }

    res.json({ success: true, message: "Verification code sent to your new email address." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/email/verify-otp ─────────────────────────────────────
export async function verifyEmailChangeOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { newEmail, otp } = req.body;

    const outcome = await verifyEmailChangeOtpCode(req.user._id, newEmail, otp);

    if (outcome.status === "not_found" || outcome.status === "expired") {
      return next(
        new AppError(
          "This verification code has expired or was not found. Please request a new one.",
          400,
        ),
      );
    }
    if (outcome.status === "email_mismatch") {
      return next(new AppError("This code was issued for a different email address.", 400));
    }
    if (outcome.status === "too_many_attempts") {
      return next(new AppError("Too many incorrect attempts. Please request a new code.", 429));
    }
    if (outcome.status === "invalid") {
      res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        data: { attemptsRemaining: outcome.attemptsRemaining },
      });
      return;
    }

    // outcome.status === "verified" — re-check uniqueness in case someone
    // else registered this email in the window between send-otp and now,
    // then perform the actual change. Ownership of the new email is
    // genuinely proven at this point, so isVerified/emailVerifiedAt are set
    // to true/now for real, not defaulted.
    const normalizedEmail = newEmail.trim().toLowerCase();
    const conflictingOwner = await User.findOne({ email: normalizedEmail }).select("_id");
    if (conflictingOwner && conflictingOwner._id.toString() !== req.user._id.toString()) {
      return next(new AppError("This email is already associated with another account.", 409));
    }

    const oldEmail = req.user.email;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        email: normalizedEmail,
        isVerified: true,
        emailVerifiedAt: new Date(),
        securityUpdatedAt: new Date(),
        // Mirrors changePassword()/resetPassword(): a security-sensitive
        // identity field changed, so every existing session — including
        // this one's refresh token — is invalidated and the user must sign
        // in again, now with the new email.
        refreshTokens: [],
      },
      { new: true, runValidators: true },
    );

    if (!updatedUser) return next(new AppError("User not found", 404));

    const meta = getRequestMeta(req);
    void revokeAllSessionsForUser(req.user._id, req.user._id, "email changed");
    void recordSecurityEvent(req.user._id, "EMAIL_VERIFICATION_SUCCESS", "SUCCESS", meta);
    void recordSecurityEvent(req.user._id, "EMAIL_CHANGED", "SUCCESS", meta, {
      previousEmailDomain: oldEmail.split("@")[1],
    });
    void sendEmailChangedNotification(oldEmail, normalizedEmail, updatedUser.name);

    res.json({
      success: true,
      message: "Email changed successfully. Please log in again with your new email.",
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/phone/send-otp ───────────────────────────────────────
export async function sendPhoneVerificationOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const meta = getRequestMeta(req);
    const outcome = await requestPhoneVerificationOtp(req.user._id, req.user.phone ?? "");

    if (outcome.status === "no_phone") {
      return next(new AppError("No phone number on file. Add a phone number first.", 400));
    }
    if (outcome.status === "already_verified") {
      return next(new AppError("Your phone number is already verified.", 409));
    }
    if (outcome.status === "cooldown") {
      const retryAfterSeconds = Math.ceil(outcome.retryAfterMs / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds}s before requesting another code.`,
        data: { retryAfterSeconds },
      });
      return;
    }

    void recordSecurityEvent(req.user._id, "PHONE_VERIFICATION_REQUESTED", "SUCCESS", meta);

    // smsSent is always false in this project (no SMS provider configured).
    // The client receives this flag so the UI can display an honest message
    // instead of claiming a code was sent via SMS.
    res.json({
      success: true,
      message: "Verification code generated.",
      data: { smsSent: outcome.smsSent, reason: outcome.reason },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/phone/verify-otp ─────────────────────────────────────
export async function verifyPhoneVerificationOtp(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { otp } = req.body;

    const meta = getRequestMeta(req);
    const outcome = await verifyPhoneOtp(req.user._id, otp);

    if (outcome.status === "not_found" || outcome.status === "expired") {
      void recordSecurityEvent(req.user._id, "PHONE_VERIFICATION_FAILED", "FAILURE", meta);
      return next(
        new AppError("Verification code has expired or is invalid. Please request a new one.", 400),
      );
    }
    if (outcome.status === "too_many_attempts") {
      void recordSecurityEvent(req.user._id, "PHONE_VERIFICATION_FAILED", "FAILURE", meta);
      return next(new AppError("Too many incorrect attempts. Please request a new code.", 429));
    }
    if (outcome.status === "invalid") {
      void recordSecurityEvent(req.user._id, "PHONE_VERIFICATION_FAILED", "FAILURE", meta);
      res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
        data: { attemptsRemaining: outcome.attemptsRemaining },
      });
      return;
    }

    void recordSecurityEvent(req.user._id, "PHONE_VERIFIED", "SUCCESS", meta);

    res.json({ success: true, message: "Phone number verified successfully." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/deactivate-account ────────────────────────────────────
export async function deactivateAccount(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { password } = req.body;
    if (!password) return next(new AppError("Current password is required.", 400));

    // Re-fetch with password selected — same pattern as changePassword()
    const user = await User.findById(req.user._id).select("+password +refreshTokens");
    if (!user) return next(new AppError("User not found.", 404));

    if (!user.isActive) {
      return next(new AppError("This account is already deactivated.", 409));
    }

    const valid = await user.comparePassword(password);
    if (!valid) return next(new AppError("Incorrect password. Please try again.", 401));

    // Deactivate: clear refresh tokens + mark inactive in one write
    await User.findByIdAndUpdate(req.user._id, {
      isActive: false,
      refreshTokens: [],
      securityUpdatedAt: new Date(),
    });

    // Revoke all Session documents and log the audit event — both are
    // best-effort fire-and-forget (same pattern as all other security
    // side-effects in this controller) so a transient DB hiccup on either
    // does not expose an inconsistent response to the client. The
    // isActive = false write above is what actually gates login.
    const meta = getRequestMeta(req);
    void revokeAllSessionsForUser(req.user._id, req.user._id, "account deactivated");
    void recordSecurityEvent(req.user._id, "ACCOUNT_DEACTIVATED", "SUCCESS", meta);

    res.json({ success: true, message: "Your account has been deactivated." });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/security/2fa/status ─────────────────────────────────────────────
export async function getTwoFactorStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const user = await User.findById(req.user._id).select("+twoFactorBackupCodesGeneratedAt");
    res.json({
      success: true,
      data: {
        enabled: req.user.twoFactorEnabled,
        method: req.user.twoFactorEnabled ? "totp" : null,
        backupCodesGeneratedAt: user?.twoFactorBackupCodesGeneratedAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/2fa/setup ─────────────────────────────────────────────
// Step 1: verify password, generate pending TOTP secret, return URI + display key.
// 2FA is NOT enabled yet — only enabled after verify-setup succeeds.
export async function initiateTwoFactorSetup(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { password } = req.body;

    if (req.user.twoFactorEnabled) return next(new AppError("2FA is already enabled.", 409));

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return next(new AppError("User not found.", 404));

    const valid = await user.comparePassword(password);
    if (!valid) return next(new AppError("Incorrect password.", 401));

    const secret = generateTotpSecret();
    await User.findByIdAndUpdate(req.user._id, { twoFactorPendingSecret: secret });

    const uri = buildTotpUri(secret, user.email);
    const qrCodeDataUrl = await generateQrCodeDataUrl(uri);
    const meta = getRequestMeta(req);
    void recordSecurityEvent(req.user._id, "TWO_FACTOR_SETUP_STARTED", "SUCCESS", meta);

    res.json({
      success: true,
      data: {
        uri,
        qrCodeDataUrl,
        displayKey: formatSecretForDisplay(secret),
        // Raw secret also returned so frontend can show the compact form
        // alongside the formatted display key. It is never persisted on the
        // client — the client only needs it for the QR/manual-entry step.
        secret,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/2fa/verify-setup ──────────────────────────────────────
// Step 2: verify the TOTP code from the authenticator app, then
// enable 2FA and generate recovery codes.
export async function verifyTwoFactorSetup(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { code } = req.body;

    const user = await User.findById(req.user._id).select("+twoFactorPendingSecret");
    if (!user) return next(new AppError("User not found.", 404));
    if (user.twoFactorEnabled) return next(new AppError("2FA is already enabled.", 409));
    if (!user.twoFactorPendingSecret)
      return next(new AppError("No pending 2FA setup found. Please start setup again.", 400));

    if (!verifyTotp(user.twoFactorPendingSecret, code)) {
      return next(
        new AppError(
          "Invalid verification code. Please check your authenticator app and try again.",
          400,
        ),
      );
    }

    const plainCodes = generateRecoveryCodes();
    const hashedCodes = plainCodes.map((c) => ({ hash: hashRecoveryCode(c), used: false }));

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorEnabled: true,
      twoFactorSecret: user.twoFactorPendingSecret,
      twoFactorPendingSecret: undefined,
      twoFactorBackupCodes: hashedCodes,
      twoFactorBackupCodesGeneratedAt: new Date(),
      securityUpdatedAt: new Date(),
    });

    const meta = getRequestMeta(req);
    void recordSecurityEvent(req.user._id, "TWO_FACTOR_ENABLED", "SUCCESS", meta);

    // Recovery codes are returned exactly once — never stored in plaintext,
    // never re-returnable. The user MUST save them now.
    res.json({
      success: true,
      message: "Two-factor authentication has been enabled.",
      data: { recoveryCodes: plainCodes },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/2fa/disable ───────────────────────────────────────────
export async function disableTwoFactor(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { password, code, useRecoveryCode = false } = req.body;

    if (!req.user.twoFactorEnabled) return next(new AppError("2FA is not enabled.", 409));

    const user = await User.findById(req.user._id).select(
      "+password +twoFactorSecret +twoFactorBackupCodes",
    );
    if (!user) return next(new AppError("User not found.", 404));

    const validPw = await user.comparePassword(password);
    if (!validPw) return next(new AppError("Incorrect password.", 401));

    let verified = false;
    if (useRecoveryCode) {
      verified = consumeRecoveryCode(user.twoFactorBackupCodes, code);
      if (verified) await user.save();
    } else {
      verified = verifyTotp(user.twoFactorSecret ?? "", code);
    }

    if (!verified) return next(new AppError("Invalid verification code.", 401));

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorPendingSecret: undefined,
      twoFactorBackupCodes: [],
      securityUpdatedAt: new Date(),
    });

    const meta = getRequestMeta(req);
    void recordSecurityEvent(req.user._id, "TWO_FACTOR_DISABLED", "SUCCESS", meta);

    res.json({ success: true, message: "Two-factor authentication has been disabled." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/security/2fa/recovery-codes/regenerate ─────────────────────────
export async function regenerateRecoveryCodes(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { password } = req.body;

    if (!req.user.twoFactorEnabled) return next(new AppError("2FA is not enabled.", 409));

    const user = await User.findById(req.user._id).select("+password +twoFactorSecret");
    if (!user) return next(new AppError("User not found.", 404));

    const validPw = await user.comparePassword(password);
    if (!validPw) return next(new AppError("Incorrect password.", 401));

    const plainCodes = generateRecoveryCodes();
    const hashedCodes = plainCodes.map((c) => ({ hash: hashRecoveryCode(c), used: false }));

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorBackupCodes: hashedCodes,
      twoFactorBackupCodesGeneratedAt: new Date(),
    });

    const meta = getRequestMeta(req);
    void recordSecurityEvent(req.user._id, "RECOVERY_CODES_REGENERATED", "SUCCESS", meta);

    res.json({
      success: true,
      message: "Recovery codes regenerated. Save these — they won't be shown again.",
      data: { recoveryCodes: plainCodes },
    });
  } catch (err) {
    next(err);
  }
}
