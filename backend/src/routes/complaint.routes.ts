import { Router } from "express";
import {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
  getMyComplaints,
  addComplaintImages,
  removeComplaintImage,
  updateComplaintNotes,
  verifyResolution,
  requestRework,
} from "../controllers/complaint.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadEvidence } from "../middleware/uploadPhoto";
import {
  createComplaintValidator,
  updateComplaintValidator,
  complaintQueryValidator,
  updateComplaintNotesValidator,
  verifyResolutionValidator,
  requestReworkValidator,
} from "../validators/complaint.validator";

const router = Router();
router.use(authenticate);

// ─── General ──────────────────────────────────────────────────────────────────
router.get("/", complaintQueryValidator, validate, getComplaints);
router.get("/mine", getMyComplaints);
router.get("/:id", getComplaint);
router.post("/", createComplaintValidator, validate, createComplaint);
router.patch("/:id", updateComplaintValidator, validate, updateComplaint);
router.delete("/:id", deleteComplaint);

// ─── Authority + admin ────────────────────────────────────────────────────────
router.post("/:id/images", authorize(...AUTHORITY_ROLES), uploadEvidence, addComplaintImages);
router.delete("/:id/images", authorize(...AUTHORITY_ROLES), removeComplaintImage);
router.patch(
  "/:id/notes",
  authorize(...AUTHORITY_ROLES),
  updateComplaintNotesValidator,
  validate,
  updateComplaintNotes,
);

// ─── Phase 3C — Admin-only lifecycle endpoints ────────────────────────────────
router.post(
  "/:id/verify",
  authorize("administrator"),
  verifyResolutionValidator,
  validate,
  verifyResolution,
);
router.post(
  "/:id/rework",
  authorize("administrator"),
  requestReworkValidator,
  validate,
  requestRework,
);

export default router;
