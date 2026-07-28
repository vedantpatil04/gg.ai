import { Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { computeProfileCompletion } from "../services/profileCompletion.service";
import { getProfileStatistics } from "../services/profileStatistics.service";
import { updatePersonalInformation, type ProfileUpdateInput } from "../services/profile.service";
import { uploadProfilePhoto, removeProfilePhoto } from "../services/profilePhoto.service";
import { getOrganizationProfile } from "../services/organizationProfile.service";
import { logActivity, activityTemplates, getUserActivities } from "../services/activity.service";

// ─── GET /api/profile/completion ───────────────────────────────────────────
export async function getCompletion(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const result = computeProfileCompletion(req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/profile ────────────────────────────────────────────────────
// Personal Information / Edit Profile (Phase 3). Deliberately a separate
// endpoint from the pre-existing PATCH /api/auth/me (still used as-is by
// Settings — see profile.routes.ts for why) — this one owns the full
// identity + address field set introduced in this phase.
export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const input: ProfileUpdateInput = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      displayName: req.body.displayName,
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      addressLine: req.body.addressLine,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      pinCode: req.body.pinCode,
    };

    const user = await updatePersonalInformation(req.user._id, input);
    if (!user) return next(new AppError("User not found", 404));

    logActivity(activityTemplates.profileUpdated(req.user._id));

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/profile/statistics ───────────────────────────────────────────
export async function getStatistics(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const result = await getProfileStatistics(req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/profile/photo ───────────────────────────────────────────────
// Profile Picture Management (Phase 4). `uploadPhoto` (multer) has already
// run as route middleware by the time this executes — req.file is the
// already-cropped-and-compressed image the client sent, in memory.
export async function uploadPhoto(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    if (!req.file) return next(new AppError("No image file was received", 400));

    const user = await uploadProfilePhoto(req.user._id, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });
    logActivity(activityTemplates.photoUploaded(req.user._id));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/profile/photo ─────────────────────────────────────────────
export async function removePhoto(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const user = await removeProfilePhoto(req.user._id);
    logActivity(activityTemplates.photoRemoved(req.user._id));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/profile/organization ─────────────────────────────────────────
// Phase 5 — Organization tab. Returns only org/employment/assignment rows
// so the controller for personal-info data stays cleanly separate. Only
// fetched when the user opens the Organization tab (useQuery, lazy).
export async function getOrganization(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const data = await getOrganizationProfile(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/profile/activity ──────────────────────────────────────────────
// Phase 6 — Activity tab. Paginated, newest-first, current user only.
// ?page=1&limit=20 (both optional; defaults enforced in the service).
export async function getActivity(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));

    const data = await getUserActivities(req.user._id, page, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
