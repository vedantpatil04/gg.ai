import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { User, normalizeUserPreferences } from "../models/User";
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

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { appearance: prefs.appearance },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update appearance settings ─────────────────────────────────────────────
// Auto-save from the frontend — uses an atomic $set on the appearance subpath
// to avoid whole-document validation conflicts with sparse subdocuments.
export async function updateAppearanceSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { theme } = req.body as { theme: "light" | "dark" | "system" };

    if (!req.user.preferences?.appearance) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { "preferences.appearance": { theme: "system" } } },
      );
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { "preferences.appearance.theme": theme } },
      { new: true, runValidators: true },
    );
    if (!updated) return next(new AppError("User not found", 404));

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({ success: true, data: { appearance: normalized.appearance } });
  } catch (err) {
    next(err);
  }
}

// ─── Get notification preferences ───────────────────────────────────────────
export async function getNotificationSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { notifications: prefs.notifications },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update notification preferences (partial) ──────────────────────────────
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
      const prefs = normalizeUserPreferences(req.user.preferences);
      res.json({
        success: true,
        data: { notifications: prefs.notifications },
      });
      return;
    }

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

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({
      success: true,
      data: { notifications: normalized.notifications },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get language & region preferences ──────────────────────────────────────
export async function getLanguageRegionSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { languageRegion: prefs.languageRegion },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update language & region preferences (partial) ─────────────────────────
export async function updateLanguageRegionSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const patch = req.body as Partial<LanguageRegionPreferences>;
    const setOps: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(patch)) {
      setOps[`preferences.languageRegion.${field}`] = value;
    }

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

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({
      success: true,
      data: { languageRegion: normalized.languageRegion },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get dashboard preferences ──────────────────────────────────────────────
export async function getDashboardSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { dashboard: prefs.dashboard },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update dashboard preferences (partial) ─────────────────────────────────
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

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({
      success: true,
      data: { dashboard: normalized.dashboard },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Restore dashboard defaults ─────────────────────────────────────────────
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
export async function getMapSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { maps: prefs.maps },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update map preferences (partial) ───────────────────────────────────────
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

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({
      success: true,
      data: { maps: normalized.maps },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get accessibility preferences ──────────────────────────────────────────
export async function getAccessibilitySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { accessibility: prefs.accessibility },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update accessibility preferences (partial) ─────────────────────────────
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

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({
      success: true,
      data: { accessibility: normalized.accessibility },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get privacy preferences ─────────────────────────────────────────────────
export async function getPrivacySettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const prefs = normalizeUserPreferences(req.user.preferences);
    res.json({
      success: true,
      data: { privacy: prefs.privacy },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Update privacy preferences (partial) ────────────────────────────────────
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

    const normalized = normalizeUserPreferences(updated.preferences);
    res.json({
      success: true,
      data: { privacy: normalized.privacy },
    });
  } catch (err) {
    next(err);
  }
}
