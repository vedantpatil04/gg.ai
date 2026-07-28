import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getCompletion,
  getStatistics,
  updateProfile,
  uploadPhoto,
  removePhoto,
  getOrganization,
  getActivity,
} from "../controllers/profile.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateProfileValidator } from "../validators/profile.validator";
import { uploadPhoto as uploadPhotoMiddleware } from "../middleware/uploadPhoto";

/**
 * Phase 9 — Dedicated per-endpoint rate limiters.
 *
 * The global API limiter (200 req / 15 min) set in app.ts covers all routes
 * already. These narrower limiters sit on top of that for the two endpoints
 * most exposed to abuse:
 *
 *  profileUpdateLimiter  — PATCH /api/profile
 *    30 updates per 15 minutes per IP. Prevents bulk-update/enumeration
 *    scripts without affecting legitimate usage (a person saving multiple
 *    edits in a session comfortably fits under this ceiling).
 *
 *  photoUploadLimiter    — POST /api/profile/photo
 *    10 uploads per 15 minutes per IP. Photo processing is the most
 *    resource-intensive profile operation; limiting it tightly prevents
 *    buffer-exhaustion attacks while still being generous for real use.
 *
 * Both inherit the standard response shape so the frontend sees a
 * consistent error object rather than a plain HTML/text rate-limit page.
 */

const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many profile update requests. Please wait and try again.",
  },
});

const photoUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many photo upload requests. Please wait and try again.",
  },
});

// Every authenticated role (citizen, authority, administrator) reads/edits
// its own profile here — no additional role restriction beyond being signed
// in, because every handler only ever touches req.user's own document.
//
// PATCH / deliberately coexists with the pre-existing PATCH /api/auth/me
// (used by Settings for name/organization/phone/city) rather than
// replacing it — that endpoint has its own consumer already wired up, and
// this phase's field set (firstName/lastName/displayName/dob/gender/
// address) is materially larger with its own validation rules. Leaving
// /api/auth/me untouched keeps that consumer working exactly as before;
// PATCH /api/profile is the one new clients (the Edit Profile drawer)
// should use going forward.
const router = Router();
router.use(authenticate);

router.get("/completion", getCompletion);
router.get("/statistics", getStatistics);
router.patch("/", profileUpdateLimiter, updateProfileValidator, validate, updateProfile);

// Phase 4 — Profile Picture Management. uploadPhotoMiddleware (multer) runs
// first: parses the multipart body, enforces the 5 MB / type limits, and
// populates req.file before the controller (and its deeper magic-byte and
// dimension checks) ever sees the bytes. photoUploadLimiter guards against
// resource exhaustion from repeated large-file submissions.
router.post("/photo", photoUploadLimiter, uploadPhotoMiddleware, uploadPhoto);
router.delete("/photo", removePhoto);
router.get("/organization", getOrganization);
router.get("/activity", getActivity);

export default router;
