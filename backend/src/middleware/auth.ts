import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser, UserRole, isEligibleToAuthenticate } from "../models/User";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  user?: IUser;
  // Populated from the access token's optional `sid` claim (Security Center
  // Phase 1/2). Tokens issued before this claim existed simply leave this
  // undefined — callers must treat "current session" as unknown in that
  // case rather than guessing.
  sessionId?: string;
}

/**
 * Centralized role-group definition for authorization middleware. Route
 * files should spread this into `authorize(...AUTHORITY_ROLES)` rather
 * than repeating the role list, so "who counts as authority-tier" is
 * defined in exactly one place. Administrator is included here, i.e.
 * Administrator inherits every Authority-only endpoint automatically.
 */
export const AUTHORITY_ROLES: UserRole[] = ["authority", "administrator"];

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No token provided", 401));
  }

  const token = authHeader.split(" ")[1];
  if (!token) return next(new AppError("No token provided", 401));

  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new AppError("Server configuration error", 500));

  jwt.verify(token, secret, async (err, decoded) => {
    // Forward the original jwt error instead of collapsing it — errorHandler
    // already distinguishes TokenExpiredError ("Token expired") from
    // JsonWebTokenError, which covers malformed/corrupted tokens too
    // ("Invalid token"). This reuses that existing logic rather than
    // duplicating it here.
    if (err) return next(err);

    const payload = decoded as { id: string; role: string; sid?: string };
    const user = await User.findById(payload.id).select("+refreshTokens");
    if (!user || !user.isActive) {
      return next(new AppError("User not found or deactivated", 401));
    }

    // Phase 1.4 hardening: login() and refreshToken() already block token
    // issuance/renewal for a non-approved Authority, but without this check
    // an access token issued *before* a rejection (or a reset to pending)
    // would keep working on every other endpoint for the rest of its
    // lifetime. This re-checks on every authenticated request instead —
    // at no extra query cost, since `user` is already being fetched above.
    if (!isEligibleToAuthenticate(user)) {
      return next(new AppError("Your Authority account is not currently approved.", 403));
    }

    req.user = user;
    req.sessionId = payload.sid;
    next();
  });
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    if (!roles.includes(req.user.role as UserRole)) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  };
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return next();

  jwt.verify(token, secret, async (err, decoded) => {
    if (err) return next();
    const payload = decoded as { id: string };
    const user = await User.findById(payload.id);
    if (user && user.isActive) req.user = user;
    next();
  });
}
