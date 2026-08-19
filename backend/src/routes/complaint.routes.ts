import { Router }         from "express";
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
  getComplaintIntelligence,
  getComplaintRouting,
  verifyResolution,
  requestRework,
  acceptResolution,
  citizenRequestRework,
  getComplaintPriorityIntelligence,
  acknowledgeComplaintEscalation,
  resolveComplaintEscalation,
} from "../controllers/complaint.controller";
import {
  getComplaintMessages,
  sendComplaintMessage,
  markComplaintMessagesRead,
  getComplaintUnreadCount,
  getMyComplaintUnreadCounts,
} from "../controllers/message.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";
import { validate }        from "../middleware/validate";
import { uploadEvidence }  from "../middleware/uploadPhoto";
import {
  createComplaintValidator,
  updateComplaintValidator,
  complaintQueryValidator,
  updateComplaintNotesValidator,
} from "../validators/complaint.validator";

const router = Router();

router.use(authenticate);

// ─── Citizen + authority + admin ─────────────────────────────────────────────
router.get("/",     complaintQueryValidator, validate, getComplaints);
router.get("/mine", getMyComplaints);
router.get("/:id",  getComplaint);
router.post("/",    createComplaintValidator, validate, createComplaint);
router.patch("/:id", updateComplaintValidator, validate, updateComplaint);
router.delete("/:id", deleteComplaint);

// ─── Evidence upload — citizen (own complaints) + authority + admin ──────────
// The authorize() guard is intentionally absent here: the addComplaintImages
// controller enforces per-role ownership rules, so only the citizen who
// submitted the complaint (or an authority assigned to it, or an admin) can
// actually upload evidence. Removing the role guard lets citizens reach the
// controller without a 403, while the controller still blocks any attempt to
// upload to someone else's complaint.
router.post(
  "/:id/images",
  uploadEvidence,
  addComplaintImages
);

// ─── Authority + admin only ───────────────────────────────────────────────────
router.delete(
  "/:id/images",
  authorize(...AUTHORITY_ROLES),
  removeComplaintImage
);
router.patch(
  "/:id/notes",
  authorize(...AUTHORITY_ROLES),
  updateComplaintNotesValidator,
  validate,
  updateComplaintNotes
);

// ─── Phase 3C — Administrator verification (admin only) ──────────────────────
router.post(
  "/:id/verify",
  authorize("administrator"),
  verifyResolution
);
router.post(
  "/:id/rework",
  authorize("administrator"),
  requestRework
);

// ─── Citizen Review (citizen only) ────────────────────────────────────────────
// Counterpart to the admin verification pair above, scoped to the citizen's
// OWN complaint (enforced in the controller). Distinct routes from the admin
// pair — a citizen can never reach /verify or /rework.
router.post(
  "/:id/accept",
  authorize("citizen"),
  acceptResolution
);
router.post(
  "/:id/request-rework",
  authorize("citizen"),
  citizenRequestRework
);

// ─── Automation 1 — Own ML Complaint Intelligence (read-only) ────────────────
router.get(
  "/:id/intelligence",
  authorize(...AUTHORITY_ROLES),
  getComplaintIntelligence
);

// ─── Automation 2 — Smart Routing (read-only) ────────────────────────────────
router.get(
  "/:id/routing",
  authorize(...AUTHORITY_ROLES),
  getComplaintRouting
);

// ─── Automation 7 — Priority Intelligence & Critical Escalation ───────────────
router.get(
  "/:id/priority",
  authorize("citizen", ...AUTHORITY_ROLES),
  getComplaintPriorityIntelligence
);
router.post(
  "/:id/escalation/acknowledge",
  authorize(...AUTHORITY_ROLES),
  acknowledgeComplaintEscalation
);
router.post(
  "/:id/escalation/resolve",
  authorize(...AUTHORITY_ROLES),
  resolveComplaintEscalation
);

// ─── Phase 6 — Citizen ↔ Authority messaging (complaint-scoped) ─────────────
// Bulk unread-counts is registered before the "/:id/..." routes below so it
// reads clearly as its own resource, though Express would not actually
// confuse the two (different path depth: "/messages/unread-counts" is two
// segments, "/:id/messages" is two segments starting with an id — no
// pattern overlap either way).
router.get(
  "/messages/unread-counts",
  authorize("citizen", ...AUTHORITY_ROLES),
  getMyComplaintUnreadCounts
);
router.get(
  "/:id/messages",
  authorize("citizen", ...AUTHORITY_ROLES),
  getComplaintMessages
);
router.post(
  "/:id/messages",
  authorize("citizen", ...AUTHORITY_ROLES),
  sendComplaintMessage
);
router.patch(
  "/:id/messages/read",
  authorize("citizen", ...AUTHORITY_ROLES),
  markComplaintMessagesRead
);
router.get(
  "/:id/messages/unread-count",
  authorize("citizen", ...AUTHORITY_ROLES),
  getComplaintUnreadCount
);

export default router;
