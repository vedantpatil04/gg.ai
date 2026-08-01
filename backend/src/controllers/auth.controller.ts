import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  User,
  isEligibleToAuthenticate,
  authorityApprovalMessage,
  isAccountLocked,
} from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  getTokenExpiry,
  generate2FAChallenge,
  verify2FAChallenge,
} from "../services/jwt.service";
import { verifyTotp, consumeRecoveryCode } from "../services/totp.service";
import { sendEmail, passwordResetEmailHtml } from "../services/email.service";
import { getRequestMeta } from "../utils/requestMeta";
import { Session } from "../models/Session";
import {
  recordLoginHistory,
  recordSecurityEvent,
  createSession,
  revokeSessionByToken,
  revokeAllSessionsForUser,
  registerFailedLogin,
  resetFailedLogins,
  normalisePhone,
} from "../services/security.service";
import jwt from "jsonwebtoken";
import {
  notifyAuthorityRegistrationRequest,
  notifyPasswordChanged,
  notifyAccountLocked,
  notifyAccountUnlocked,
} from "../services/notification.service";

// Maps a login portal (as selected on the frontend) to the User.role values
// stored in the database. Kept separate because the "Administrator" portal
// sends "admin" while the persisted role is "administrator".
const PORTAL_ROLE_MAP: Record<string, "citizen" | "authority" | "administrator"> = {
  citizen: "citizen",
  authority: "authority",
  admin: "administrator",
};

// ─── Signup ─────────────────────────────────────────────────────────────────
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role, organization, phone, city } = req.body;

    // Public Administrator registration is never permitted. signupValidator
    // already restricts the "role" field to citizen/authority, but that rule
    // is repeated here so the backend enforces it regardless of what the
    // frontend sends and regardless of the validator configuration.
    if (role === "administrator") {
      return next(new AppError("Public administrator registration is not permitted.", 403));
    }

    const existing = await User.findOne({ email });
    if (existing) return next(new AppError("Email already registered", 409));

    const resolvedRole = role || "citizen";

    // Authority accounts require administrator approval before they can log
    // in; Citizen accounts keep the existing immediate-activation behavior.
    const approvalStatus = resolvedRole === "authority" ? "pending" : "approved";

    const user = await User.create({
      name,
      email,
      password,
      role: resolvedRole,
      organization,
      phone,
      city,
      approvalStatus,
      // A password is genuinely being established right now, regardless of
      // approval status — this is what makes the Security Overview's
      // "Password last changed" accurate from day one instead of showing
      // "Never changed" until the user's first explicit change.
      lastPasswordChangedAt: new Date(),
      securityUpdatedAt: new Date(),
    });

    // A pending Authority account must not be able to authenticate — issuing
    // tokens here would auto-login the user and bypass the approval gate
    // enforced at /login. Return the created account with no tokens instead.
    if (approvalStatus === "pending") {
      res.status(201).json({
        success: true,
        message:
          "Registration received. Your Authority account is pending administrator approval before you can log in.",
        data: { user },
      });
      // Phase 7 — notify all administrators of the new authority registration
      const admins = await User.find({ role: "administrator", isActive: true }).select("_id").lean();
      await notifyAuthorityRegistrationRequest(
        admins.map((a) => a._id as import("mongoose").Types.ObjectId),
        user.name,
        user._id.toString(),
      ).catch(() => {});
      return;
    }

    const sessionId = uuidv4();
    const accessToken = generateAccessToken(user, sessionId);
    const refreshToken = generateRefreshToken(user, sessionId);

    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken },
      lastLogin: new Date(),
    });

    const meta = getRequestMeta(req);
    void createSession(user._id, sessionId, refreshToken, meta, getTokenExpiry(refreshToken));

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Login ──────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, portal } = req.body;
    const meta = getRequestMeta(req);

    // Portal presence/shape is already enforced by loginValidator, but guard
    // defensively in case this endpoint is ever called without it.
    const expectedRole = PORTAL_ROLE_MAP[portal];
    if (!expectedRole) return next(new AppError("Invalid portal selected", 400));

    const user = await User.findOne({ email }).select(
      "+password +refreshTokens +failedLoginAttempts +accountLockedUntil",
    );
    if (!user) return next(new AppError("Invalid credentials", 401));
    if (!user.isActive) {
      return next(
        new AppError(
          "Your account has been deactivated. Please contact support if you believe this was a mistake.",
          403,
        ),
      );
    }

    // Security Center Phase 1: failed-login lockout. Checked before the
    // password comparison so a locked account can't be brute-forced further
    // while it's supposed to be locked out.
    if (isAccountLocked(user)) {
      void recordLoginHistory(user._id, meta, "FAILED");
      void recordSecurityEvent(user._id, "LOGIN_FAILED", "FAILURE", meta, {
        reason: "account_locked",
      });
      return next(
        new AppError(
          "Account temporarily locked due to too many failed login attempts. Try again later.",
          423,
        ),
      );
    }

    console.log("Email received:", email);
    console.log("Password received:", password);
    console.log("Stored hash:", user.password.substring(0, 20));

    const valid = await user.comparePassword(password);

    console.log("Password valid:", valid);
    if (!valid) {
      const { locked } = await registerFailedLogin(user._id);
      void recordLoginHistory(user._id, meta, "FAILED");
      void recordSecurityEvent(user._id, "LOGIN_FAILED", "FAILURE", meta);
      if (locked) {
        return next(
          new AppError(
            "Account temporarily locked due to too many failed login attempts. Try again later.",
            423,
          ),
        );
      }
      return next(new AppError("Invalid credentials", 401));
    }

    // Never trust the portal choice alone — always verify the persisted role.
    if (user.role !== expectedRole) {
      return next(new AppError("This account is not registered for the selected portal.", 403));
    }

    // Authority accounts require administrator approval before they can log
    // in. Pending/rejected authorities are blocked here regardless of valid
    // credentials. Citizen and Administrator accounts are unaffected.
    if (!isEligibleToAuthenticate(user)) {
      return next(new AppError(authorityApprovalMessage(user), 403));
    }

    // Phase 9: if 2FA is enabled, credential verification is complete but
    // the full session is NOT issued yet. A short-lived challenge token is
    // returned instead; the client uses it to call POST /api/auth/2fa-challenge.
    if (user.twoFactorEnabled) {
      void resetFailedLogins(user._id);
      void recordLoginHistory(user._id, meta, "SUCCESS");
      void recordSecurityEvent(user._id, "LOGIN_REQUIRES_2FA", "SUCCESS", meta);
      res.json({
        success: true,
        requires2FA: true,
        challengeToken: generate2FAChallenge(user._id.toString()),
      });
      return;
    }
    const sessionId = uuidv4();
    const accessToken = generateAccessToken(user, sessionId);
    const refreshToken = generateRefreshToken(user, sessionId);

    // Keep last 5 refresh tokens
    const tokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await User.findByIdAndUpdate(user._id, { refreshTokens: tokens, lastLogin: new Date() });

    void resetFailedLogins(user._id);
    void recordLoginHistory(user._id, meta, "SUCCESS");
    void createSession(user._id, sessionId, refreshToken, meta, getTokenExpiry(refreshToken));
    void recordSecurityEvent(user._id, "NEW_LOGIN", "SUCCESS", meta);

    const safeUser = user.toJSON();

    res.json({
      success: true,
      message: "Logged in successfully",
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ─────────────────────────────────────────────────────────────────
export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (req.user && refreshToken) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: refreshToken } });
      void revokeSessionByToken(refreshToken, req.user._id, "user logout");
      void recordSecurityEvent(req.user._id, "LOGOUT", "SUCCESS", getRequestMeta(req));
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh Token ──────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError("Refresh token required", 400));

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return next(new AppError("Invalid refresh token", 401));

    const user = await User.findById(payload.id).select("+refreshTokens");
    if (!user || !user.isActive) return next(new AppError("User not found", 401));
    if (!user.refreshTokens.includes(refreshToken)) {
      return next(new AppError("Token revoked", 401));
    }
    // Security Center Phase 2: a session revoked from /api/security/sessions
    // must stop this refresh token from working, not just disappear from a
    // list. Older refresh tokens (issued before Phase 1) carry no `sid` and
    // fall back to the array-membership check above only — unchanged
    // behavior for them.
    if (payload.sid) {
      const session = await Session.findOne({ sessionId: payload.sid }).select("revoked");
      if (session?.revoked) return next(new AppError("Token revoked", 401));
    }
    // Mirrors the approval gate in login() — a still-valid refresh token
    // shouldn't let an Authority account keep a session alive after its
    // approval status changes away from "approved".
    if (!isEligibleToAuthenticate(user)) {
      return next(new AppError("Your Authority account is not currently approved.", 403));
    }

    const newSessionId = uuidv4();
    const newAccessToken = generateAccessToken(user, newSessionId);
    const newRefreshToken = generateRefreshToken(user, newSessionId);

    const tokens = user.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(newRefreshToken)
      .slice(-5);
    await User.findByIdAndUpdate(user._id, { refreshTokens: tokens });

    const meta = getRequestMeta(req);
    void revokeSessionByToken(refreshToken, user._id, "token rotated");
    void createSession(
      user._id,
      newSessionId,
      newRefreshToken,
      meta,
      getTokenExpiry(newRefreshToken),
    );

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────────
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond 200 to prevent email enumeration
    if (!user) {
      res.json({ success: true, message: "If that email exists, a reset link has been sent." });
      return;
    }

    const resetToken = generatePasswordResetToken(user._id.toString());
    const resetHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetHash,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "GreenGuard AI — Reset your password",
      html: passwordResetEmailHtml(user.name, resetUrl),
    });

    res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

// ─── Reset Password ──────────────────────────────────────────────────────────
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body;

    let userId: string;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; purpose: string };
      if (payload.purpose !== "password-reset") throw new Error();
      userId = payload.id;
    } catch {
      return next(new AppError("Invalid or expired reset token", 400));
    }

    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      _id: userId,
      passwordResetToken: hash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) return next(new AppError("Invalid or expired reset token", 400));

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = [];
    user.lastPasswordChangedAt = new Date();
    user.securityUpdatedAt = new Date();
    await user.save();

    void revokeAllSessionsForUser(user._id, user._id, "password reset");
    void recordSecurityEvent(user._id, "PASSWORD_CHANGED", "SUCCESS", getRequestMeta(req));

    res.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (err) {
    next(err);
  }
}

// ─── Get Me ──────────────────────────────────────────────────────────────────
export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    res.json({ success: true, data: { user: req.user } });
  } catch (err) {
    next(err);
  }
}

// ─── Update Profile ──────────────────────────────────────────────────────────
export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { name, organization, phone: rawPhone, city } = req.body;

    // Normalise the phone before anything else — same rules as
    // requestPhoneVerificationOtp and the phone-OTP flow, so the stored
    // value is always in a consistent format regardless of how the user
    // typed it in. An explicitly empty string means "remove the number";
    // any non-empty value must be valid.
    let phone: string | undefined = rawPhone;
    if (rawPhone !== undefined && rawPhone !== "") {
      const normalised = normalisePhone(rawPhone);
      if (!normalised) return next(new AppError("Invalid phone number format.", 400));
      phone = normalised;
    }

    const phoneChanged = phone !== undefined && phone !== (req.user.phone ?? "");

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          ...(name && { name }),
          ...(organization !== undefined && { organization }),
          ...(phone !== undefined && { phone }),
          ...(city && { city }),
          ...(phoneChanged && { phoneVerified: false, securityUpdatedAt: new Date() }),
        },
      },
      { new: true, runValidators: true },
    );

    if (phoneChanged && user) {
      void recordSecurityEvent(user._id, "PHONE_UPDATED", "SUCCESS", getRequestMeta(req));
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── Change Password ─────────────────────────────────────────────────────────
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return next(new AppError("User not found", 404));

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return next(new AppError("Current password is incorrect", 400));

    user.password = newPassword;
    user.refreshTokens = [];
    user.lastPasswordChangedAt = new Date();
    user.securityUpdatedAt = new Date();
    await user.save();

    void revokeAllSessionsForUser(user._id, user._id, "password change");
    void recordSecurityEvent(user._id, "PASSWORD_CHANGED", "SUCCESS", getRequestMeta(req));

    res.json({ success: true, message: "Password changed. Please log in again." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/2fa-challenge ─────────────────────────────────────────────
/**
 * Phase 9: Completes a login that was intercepted for 2FA verification.
 * The request carries the short-lived challengeToken from login() plus the
 * user's current TOTP code OR a one-time recovery code. On success, issues
 * the normal session (access + refresh tokens) exactly as a non-2FA login
 * would have.
 */
export async function complete2FAChallenge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { challengeToken, code, useRecoveryCode = false } = req.body;
    if (!challengeToken || !code) {
      return next(new AppError("challengeToken and code are required.", 400));
    }

    const payload = verify2FAChallenge(challengeToken);
    if (!payload)
      return next(new AppError("Challenge expired or invalid. Please sign in again.", 401));

    const user = await User.findById(payload.id).select(
      "+refreshTokens +twoFactorSecret +twoFactorBackupCodes",
    );
    if (!user || !user.isActive) return next(new AppError("User not found.", 401));
    if (!user.twoFactorEnabled)
      return next(new AppError("2FA is not enabled on this account.", 400));

    const meta = getRequestMeta(req);
    let verified = false;

    if (useRecoveryCode) {
      verified = consumeRecoveryCode(user.twoFactorBackupCodes, code);
      if (verified) {
        await user.save(); // persist the `used: true` mutation from consumeRecoveryCode
        void recordSecurityEvent(user._id, "RECOVERY_CODE_USED", "SUCCESS", meta);
      }
    } else {
      verified = verifyTotp(user.twoFactorSecret ?? "", code);
    }

    if (!verified) {
      void recordSecurityEvent(user._id, "TWO_FACTOR_VERIFICATION_FAILED", "FAILURE", meta);
      return next(new AppError("Invalid verification code. Please try again.", 401));
    }

    void recordSecurityEvent(user._id, "TWO_FACTOR_VERIFICATION_SUCCESS", "SUCCESS", meta);

    const sessionId = uuidv4();
    const accessToken = generateAccessToken(user, sessionId);
    const refreshToken = generateRefreshToken(user, sessionId);
    const tokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await User.findByIdAndUpdate(user._id, { refreshTokens: tokens, lastLogin: new Date() });

    void resetFailedLogins(user._id);
    void createSession(user._id, sessionId, refreshToken, meta, getTokenExpiry(refreshToken));
    void recordSecurityEvent(user._id, "NEW_LOGIN", "SUCCESS", meta);

    res.json({
      success: true,
      message: "Authenticated.",
      data: { user: user.toJSON(), accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}
