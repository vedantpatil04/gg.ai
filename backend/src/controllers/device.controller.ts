/**
 * Phase 3 — Device Token Controller
 *
 * Every handler here is scoped to req.user._id, the same ownership
 * pattern notification.controller.ts already uses. A user can only ever
 * register or deactivate a token against their *own* account — there is
 * no path that accepts a userId from the request body.
 */

import { Response, NextFunction } from "express";
import { DeviceToken } from "../models/DeviceToken";
import { registerDeviceToken, deactivateDeviceToken } from "../services/push.service";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import type { DevicePlatform } from "../models/DeviceToken";

// ─── POST /api/notifications/devices ──────────────────────────────────────────
// Registers (or re-associates, if this token previously belonged to a
// different account on the same device) the caller's current FCM token.

export async function registerDevice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { token, platform, appId } = req.body as {
      token: string;
      platform?: DevicePlatform;
      appId?: string;
    };

    await registerDeviceToken({
      userId: req.user._id,
      token,
      platform: platform ?? "android",
      appId,
    });

    res.json({ success: true, message: "Device registered" });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/notifications/devices/:token ─────────────────────────────────
// Called on logout (see the frontend push bridge) so a subsequent
// account switch on the same device doesn't briefly keep delivering to
// the account that just signed out.

export async function deactivateDevice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { token } = req.params;
    await deactivateDeviceToken(req.user._id, token);

    res.json({ success: true, message: "Device deactivated" });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/notifications/devices ────────────────────────────────────────────
// Lets a user see which devices currently receive push notifications for
// their account (e.g. a future Security Center panel). Never exposes the
// raw token itself.

export async function listDevices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const devices = await DeviceToken.find({ userId: req.user._id, active: true })
      .select("platform appId createdAt lastSeenAt")
      .sort({ lastSeenAt: -1 })
      .lean();

    res.json({ success: true, data: { devices } });
  } catch (err) {
    next(err);
  }
}
