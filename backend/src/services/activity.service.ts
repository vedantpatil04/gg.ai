import mongoose from "mongoose";
import {
  Activity,
  ACTIVITY_TYPES,
  type ActivityType,
  type ActivityCategory,
} from "../models/Activity";

/**
 * Phase 6 — Activity Service.
 *
 * Two responsibilities:
 *  1. `logActivity` — write one event. Called from auth.controller.ts and
 *     profile.controller.ts at natural emit points (login, logout, signup,
 *     profile/photo updates, password changes).
 *  2. `getUserActivities` — paginated read for the Activity tab.
 *
 * `logActivity` is deliberately fire-and-forget (never `await`-ed by its
 * callers): an activity-log write failure must never block or roll back the
 * real operation the user was trying to perform. Errors are swallowed here
 * and logged to the Winston logger — same design as the Phase 4 event hooks.
 */

// ─── Type definitions ────────────────────────────────────────────────────────

export interface ActivityInput {
  userId: mongoose.Types.ObjectId | string;
  activityType: ActivityType;
  title: string;
  description: string;
  category: ActivityCategory;
  metadata?: Record<string, unknown>;
}

export interface PaginatedActivities {
  activities: Array<{
    _id: string;
    activityType: ActivityType;
    title: string;
    description: string;
    category: ActivityCategory;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Pre-defined activity templates ──────────────────────────────────────────
// Controllers call `logActivity(helpers.login(userId))` — the canonical
// title/description strings live here, not scattered across controllers.

export const activityTemplates = {
  accountCreated: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.ACCOUNT_CREATED,
    title: "Account created",
    description: "Your GreenGuard AI account was created.",
    category: "authentication",
  }),

  login: (
    userId: string | mongoose.Types.ObjectId,
    metadata?: Record<string, unknown>,
  ): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.LOGIN,
    title: "Signed in",
    description: "You signed in to your account.",
    category: "authentication",
    metadata,
  }),

  logout: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.LOGOUT,
    title: "Signed out",
    description: "You signed out of your account.",
    category: "authentication",
  }),

  profileUpdated: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.PROFILE_UPDATED,
    title: "Profile updated",
    description: "Your personal information was updated.",
    category: "profile",
  }),

  photoUploaded: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.PHOTO_UPLOADED,
    title: "Profile photo updated",
    description: "Your profile photo was uploaded or replaced.",
    category: "profile",
  }),

  photoRemoved: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.PHOTO_REMOVED,
    title: "Profile photo removed",
    description: "Your profile photo was removed.",
    category: "profile",
  }),

  passwordChanged: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.PASSWORD_CHANGED,
    title: "Password changed",
    description: "Your account password was changed.",
    category: "security",
  }),

  passwordReset: (userId: string | mongoose.Types.ObjectId): ActivityInput => ({
    userId,
    activityType: ACTIVITY_TYPES.PASSWORD_RESET,
    title: "Password reset",
    description: "Your account password was reset via email link.",
    category: "security",
  }),
};

// ─── Core service methods ────────────────────────────────────────────────────

/**
 * Writes one activity entry. Intentionally non-async at the call site —
 * callers should *not* await this; see module comment above.
 */
export function logActivity(input: ActivityInput): void {
  Activity.create({
    userId: input.userId,
    activityType: input.activityType,
    title: input.title,
    description: input.description,
    category: input.category,
    metadata: input.metadata,
  }).catch((err: unknown) => {
    // Activity logging must never surface as a user-visible error. Log
    // silently and move on — the compound index avoids duplicate fast-path
    // writes causing any meaningful perf hit even at high volume.
    console.error("[activity] failed to log:", (err as Error)?.message);
  });
}

export async function getUserActivities(
  userId: mongoose.Types.ObjectId | string,
  page = 1,
  limit = 20,
): Promise<PaginatedActivities> {
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v -userId") // userId is redundant in per-user responses
      .lean(),
    Activity.countDocuments({ userId }),
  ]);

  return {
    activities: activities.map((a) => ({
      _id: (a._id as mongoose.Types.ObjectId).toString(),
      activityType: a.activityType,
      title: a.title,
      description: a.description,
      category: a.category,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    hasMore: skip + activities.length < total,
  };
}
