import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { User } from "../models/User";
import {
  defaultNotificationPreferences,
  type NotificationCategory,
  type NotificationChannels,
} from "../constants/notifications";
import { defaultLanguageRegionPreferences, type LanguageRegionPreferences } from "../constants/languageRegion";
import { defaultDashboardPreferences, type DashboardPreferences } from "../constants/dashboard";
import { defaultMapPreferences, type MapPreferences } from "../constants/maps";
import { defaultAccessibilityPreferences, type AccessibilityPreferences } from "../constants/accessibility";
import { defaultPrivacyPreferences, type PrivacyPreferences } from "../constants/privacy";

// ─── Get appearance settings ────────────────────────────────────────────────
// Self-scoped: always reads the authenticated user's own preference, same
// pattern as GET /auth/me. Falls back to "system" for accounts created
// before this field existed (schema default only applies to new documents).
export async function getAppearanceSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { appearance: { theme: req.user.preferences?.appearance?.theme ?? "system" } },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update appearance settings ─────────────────────────────────────────────
// Auto-save from the frontend — every call here is a full replace of the
// appearance sub-object, not a partial patch, since "theme" is currently
// the section's only field (see Phase 2 scope: accent color / compact mode
// / etc. are explicitly deferred to future phases).
export async function updateAppearanceSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { theme } = req.body as { theme: "light" | "dark" | "system" };

    req.user.preferences = { ...req.user.preferences, appearance: { theme } };
    req.user.markModified("preferences");
    await req.user.save();

    res.json({ success: true, data: { appearance: { theme } } });
  } catch (err) {
    next(err);
  }
}

// ─── Get notification preferences ───────────────────────────────────────────
// This module only stores preferences — it never sends anything. A future
// Notification Service reads these values before dispatching; nothing here
// changes when that service is built (see Phase 3 scope).
export async function getNotificationSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { notifications: req.user.preferences?.notifications ?? defaultNotificationPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update notification preferences (partial) ──────────────────────────────
// Body is a partial map of category -> partial channel object, already
// shape-validated by updateNotificationsValidator. Each touched channel is
// written with an atomic $set on its own dot-path — not a read-then-save of
// the whole `notifications` object — so two rapid toggles in different
// categories (two independent auto-saving PATCH requests in flight at once)
// can't clobber each other the way a full-document merge-and-save would.
export async function updateNotificationSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<Record<NotificationCategory, Partial<NotificationChannels>>>;
    const setOps: Record<string, boolean> = {};
    for (const [category, channels] of Object.entries(patch)) {
      for (const [channel, value] of Object.entries(channels ?? {})) {
        setOps[`preferences.notifications.${category}.${channel}`] = value as boolean;
      }
    }

    if (Object.keys(setOps).length === 0) {
      res.json({
        success: true,
        data: { notifications: req.user.preferences?.notifications ?? defaultNotificationPreferences() },
      });
      return;
    }

    // Any category untouched by this patch may not exist on the document
    // yet (e.g. an account created before this phase) — seed the full
    // default object first via $setOnInsert-style guard so a dot-path $set
    // into a missing parent object still lands correctly.
    const existing = req.user.preferences?.notifications ?? defaultNotificationPreferences();
    if (!req.user.preferences?.notifications) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.notifications": existing } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({
      success: true,
      data: { notifications: updated.preferences?.notifications ?? defaultNotificationPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get language & region preferences ──────────────────────────────────────
export async function getLanguageRegionSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { languageRegion: req.user.preferences?.languageRegion ?? defaultLanguageRegionPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update language & region preferences (partial) ─────────────────────────
// Same atomic-per-field $set approach as updateNotificationSettings — each
// control (language, timezone, date/time/number format, units) auto-saves
// independently the moment it changes, so two of them can genuinely be
// in flight at once and must not be able to clobber each other.
export async function updateLanguageRegionSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<LanguageRegionPreferences>;
    const setOps: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(patch)) {
      setOps[`preferences.languageRegion.${field}`] = value;
    }

    // Seed full defaults first for accounts that predate this phase, same
    // as notifications, so a dot-path $set into a missing parent lands
    // correctly rather than creating a sparse/partial object.
    if (!req.user.preferences?.languageRegion) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.languageRegion": defaultLanguageRegionPreferences() } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({
      success: true,
      data: { languageRegion: updated.preferences?.languageRegion ?? defaultLanguageRegionPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get dashboard preferences ──────────────────────────────────────────────
// This module only stores preferences — see Phase 5 scope. It does not
// alter dashboard rendering, widgets, or business logic; a future phase
// that makes the dashboard preference-aware reads from here.
export async function getDashboardSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { dashboard: req.user.preferences?.dashboard ?? defaultDashboardPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update dashboard preferences (partial) ─────────────────────────────────
// Each of the 5 fields (landing page, visible widgets, widget order,
// default city, pinned cards) is a whole-value replacement, not a deep
// merge — an array field is always sent in full by the frontend (e.g. the
// entire reordered widgetOrder), so a per-top-level-key $set is both
// correct and, same as notifications/language-region, race-safe against
// concurrent auto-saving requests for different fields.
export async function updateDashboardSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<DashboardPreferences>;
    const setOps: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(patch)) {
      setOps[`preferences.dashboard.${field}`] = value;
    }

    if (!req.user.preferences?.dashboard) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.dashboard": defaultDashboardPreferences() } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({
      success: true,
      data: { dashboard: updated.preferences?.dashboard ?? defaultDashboardPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Restore dashboard defaults ─────────────────────────────────────────────
// Explicit action (not a field patch) — resets the whole dashboard
// sub-object to defaults in one atomic $set, confirmed client-side before
// this is ever called (see Restore Dashboard Defaults dialog).
export async function restoreDashboardDefaults(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const defaults = defaultDashboardPreferences();
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { "preferences.dashboard": defaults } },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({ success: true, data: { dashboard: defaults } });
  } catch (err) {
    next(err);
  }
}

// ─── Get map preferences ────────────────────────────────────────────────────
// Preferences-only — no map engine or rendering logic lives here (see
// Phase 6 scope). A future phase that makes map pages preference-aware
// reads from this endpoint.
export async function getMapSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { maps: req.user.preferences?.maps ?? defaultMapPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update map preferences (partial) ───────────────────────────────────────
// Same atomic per-field $set pattern as the other Enterprise Settings
// sections — each control (map type, zoom slider, each layer toggle, units,
// animation speed, remember-last-location) auto-saves independently.
export async function updateMapSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<MapPreferences>;
    const setOps: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(patch)) {
      setOps[`preferences.maps.${field}`] = value;
    }

    if (!req.user.preferences?.maps) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.maps": defaultMapPreferences() } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({
      success: true,
      data: { maps: updated.preferences?.maps ?? defaultMapPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get accessibility preferences ──────────────────────────────────────────
export async function getAccessibilitySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { accessibility: req.user.preferences?.accessibility ?? defaultAccessibilityPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update accessibility preferences (partial) ─────────────────────────────
// Same atomic per-field $set pattern as every other Enterprise Settings
// section — each toggle auto-saves independently.
export async function updateAccessibilitySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<AccessibilityPreferences>;
    const setOps: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(patch)) {
      setOps[`preferences.accessibility.${field}`] = value;
    }

    if (!req.user.preferences?.accessibility) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.accessibility": defaultAccessibilityPreferences() } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({
      success: true,
      data: { accessibility: updated.preferences?.accessibility ?? defaultAccessibilityPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get privacy preferences ─────────────────────────────────────────────────
// Preference controls only — no account/security actions live here (no
// delete-account, no data export). See Phase 8 scope.
export async function getPrivacySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    res.json({
      success: true,
      data: { privacy: req.user.preferences?.privacy ?? defaultPrivacyPreferences() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update privacy preferences (partial) ────────────────────────────────────
// Same atomic per-field $set pattern as every other Enterprise Settings
// section — each toggle auto-saves independently.
export async function updatePrivacySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<PrivacyPreferences>;
    const setOps: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(patch)) {
      setOps[`preferences.privacy.${field}`] = value;
    }

    if (!req.user.preferences?.privacy) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.privacy": defaultPrivacyPreferences() } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    res.json({
      success: true,
      data: { privacy: updated.preferences?.privacy ?? defaultPrivacyPreferences() },
    });
  } catch (err) {
    next(err);
  }
}
