import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

export interface TokenPayload {
  id: string;
  role: string;
  email: string;
  // Present only on refresh tokens issued after Security Center Phase 1;
  // older/existing refresh tokens simply won't have it, and verification
  // does not require it, so nothing about existing sessions breaks.
  sid?: string;
}

export function generateAccessToken(user: IUser, sessionId?: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m";
  const payload: { id: string; role: string; email: string; sid?: string } = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  };
  if (sessionId) payload.sid = sessionId;
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function generateRefreshToken(user: IUser, sessionId?: string): string {
  const secret = process.env.JWT_REFRESH_SECRET!;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const payload: { id: string; sid?: string } = { id: user._id.toString() };
  if (sessionId) payload.sid = sessionId;
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const secret = process.env.JWT_REFRESH_SECRET!;
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}

export function generatePasswordResetToken(userId: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ id: userId, purpose: "password-reset" }, secret, {
    expiresIn: "1h",
  } as jwt.SignOptions);
}

/**
 * Security Center Phase 4: reads the real `exp` claim off a token this
 * service just signed (or already verified), so Session.expiresAt can be
 * kept exactly in sync with the actual refresh-token lifetime instead of
 * duplicating/parsing JWT_REFRESH_EXPIRES_IN separately. Returns null if the
 * token can't be decoded — callers treat that as "unknown expiry", not an
 * error, since expiresAt is an optional enhancement, not load-bearing for
 * authentication itself.
 */
export function getTokenExpiry(token: string): Date | null {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
}

/**
 * Phase 9: Issues a short-lived (5 min) challenge token when a user passes
 * credentials but has 2FA enabled. This token proves "credentials verified"
 * but CANNOT be used as an access token — it carries a `purpose: '2fa-challenge'`
 * claim that the authenticate() middleware explicitly rejects, and it only
 * grants access to POST /api/auth/2fa-challenge. The userId is embedded so
 * the challenge endpoint can look up the user without a session.
 */
export function generate2FAChallenge(userId: string): string {
  return jwt.sign({ id: userId, purpose: "2fa-challenge" }, process.env.JWT_SECRET!, {
    expiresIn: "5m",
  } as jwt.SignOptions);
}

export function verify2FAChallenge(token: string): { id: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; purpose: string };
    if (decoded.purpose !== "2fa-challenge") return null;
    return { id: decoded.id };
  } catch {
    return null;
  }
}
