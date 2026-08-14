import { Response, NextFunction } from "express";
import fs   from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { Complaint, type ComplaintEventType } from "../models/Complaint";
import { AppError }          from "../middleware/errorHandler";
import { AuthRequest }       from "../middleware/auth";
import { isValidImageBuffer } from "../middleware/uploadPhoto";
import { getLatestComplaintPrediction, generateComplaintPrediction } from "../services/complaintIntelligence.service";
import { routeComplaint, getLatestRoutingResult } from "../services/smartRouting.service";

// ─── Evidence storage ─────────────────────────────────────────────────────────
// Must resolve to the SAME directory app.ts serves statically at "/uploads"
// (backend/uploads — path.join(__dirname, "../uploads") from backend/dist).
// From backend/dist/controllers, "../../uploads/evidence" resolves to
// backend/uploads/evidence, which is what "/uploads/evidence/<file>" actually
// maps to. It previously pointed one level too high (project-root/uploads/
// evidence), a directory app.ts never serves — every saved evidence image
// 404'd in the browser even though the file existed on disk.
const EVIDENCE_DIR    = path.join(__dirname, "../../uploads/evidence");
const EVIDENCE_PREFIX = "/uploads/evidence";
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp",
};

async function saveEvidenceBuffer(buf: Buffer, mime: string, cid: string): Promise<string> {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  const ext  = EXT_BY_MIME[mime] ?? "jpg";
  const name = `${cid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  await fs.writeFile(path.join(EVIDENCE_DIR, name), buf);
  return `${EVIDENCE_PREFIX}/${name}`;
}

async function deleteEvidenceFile(url: string): Promise<void> {
  if (!url.startsWith(EVIDENCE_PREFIX)) return;
  const name = url.slice(EVIDENCE_PREFIX.length + 1);
  if (!name || name.includes("/") || name.includes("..")) return;
  try { await fs.unlink(path.join(EVIDENCE_DIR, name)); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
}

function appendEvent(
  c: InstanceType<typeof Complaint>,
  type: ComplaintEventType,
  message: string,
  actor?: { _id: mongoose.Types.ObjectId; name: string },
) {
  c.events.push({ type, message, userId: actor?._id, userName: actor?.name, timestamp: new Date() });
}

// ─── Phase 3B — ownership guard ──────────────────────────────────────────────
// Returns true when the current authority user is allowed to act on this
// complaint. Administrators always pass. Citizens are NOT checked here (use
// the citizen guard in each handler instead).
export function authorityOwns(complaint: InstanceType<typeof Complaint>, user: AuthRequest["user"]): boolean {
  if (!user) return false;
  if (user.role === "administrator") return true;
  if (user.role !== "authority") return false;
  if (!complaint.assignedTo) return false;
  // assignedTo may be a raw ObjectId (most call sites query with
  // Complaint.findById, unpopulated) or a populated User document (getComplaint
  // populates assignedTo before this check runs, for the response payload).
  // .toString() on a populated document returns "[object Object]", not the
  // hex id — same pitfall as the citizen submittedBy check below — so extract
  // ._id from the populated doc when present, falling back to the raw cast.
  const populated = complaint.assignedTo as unknown as { _id?: mongoose.Types.ObjectId };
  const assignedToId = populated._id?.toString() ?? complaint.assignedTo.toString();
  return assignedToId === user._id.toString();
}

// ─── Create ───────────────────────────────────────────────────────────────────
// Automation 2 timing (blueprint section 22): Smart Routing must run only
// after the complaint exists, is persisted, and the Own ML prediction (from
// Automation 1 — never re-run/duplicated here) has been generated and
// persisted. Neither step can ever fail the request or leave the complaint
// in a bad state — both generateComplaintPrediction and routeComplaint are
// swallow-and-log by design, and the response shape below is unchanged
// (`{ success, data: { complaint } }`) for full API backward compatibility.
export async function createComplaint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    // Blueprint sections 27/35 — assignment/routing fields are always
    // server-decided. Strip any client-supplied values before creation so a
    // citizen can never pre-seed an assignment or claim it was automatic.
    const { assignedTo, assignedBy, assignedByName, assignedAt, assignmentSource, ...safeBody } = req.body;
    void assignedTo; void assignedBy; void assignedByName; void assignedAt; void assignmentSource;

    let complaint = await Complaint.create({ ...safeBody, submittedBy: req.user._id });

    const prediction = await generateComplaintPrediction(complaint);
    await routeComplaint(complaint, prediction);

    // routeComplaint may have mutated and saved `complaint` (on automatic
    // assignment) — re-fetch to return the authoritative, fully populated
    // final state regardless of whether routing assigned it or not.
    complaint = (await Complaint.findById(complaint._id)) ?? complaint;

    res.status(201).json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── List ─────────────────────────────────────────────────────────────────────
// Phase 3B security: authority role always receives only their own assigned
// complaints — the filter is forced server-side; the client has no way to
// bypass it. Citizens are still limited to their own submitted complaints.
export async function getComplaints(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (req.user?.role === "citizen") {
      // Citizens only see their own complaints — no override possible.
      filter.submittedBy = req.user._id;
    } else if (req.user?.role === "authority") {
      // Phase 3B: authorities are hard-scoped to their assigned complaints.
      // Any assignedTo query param from the client is intentionally ignored
      // for this role — the backend decides, not the frontend.
      filter.assignedTo = req.user._id;
    } else {
      // Administrator: honour optional query filters.
      if (req.query.assignedTo) {
        const v = String(req.query.assignedTo);
        filter.assignedTo = v === "me" ? req.user?._id : v;
      }
      // Allow "unassigned" filter for admin workload views
      if (req.query.unassigned === "true") {
        filter.assignedTo = { $exists: false };
      }
    }

    if (req.query.cityId)    filter.cityId    = String(req.query.cityId).toLowerCase();
    if (req.query.status)    filter.status    = req.query.status;
    if (req.query.severity)  filter.severity  = req.query.severity;
    if (req.query.issueType) filter.issueType = req.query.issueType;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate("submittedBy", "name email")
        .populate("assignedTo",  "name email")
        .populate("assignedBy",  "name email")
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { complaints, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) { next(err); }
}

// ─── Single ───────────────────────────────────────────────────────────────────
// Phase 3B: authority may only view a complaint that is assigned to them.
export async function getComplaint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("submittedBy", "name email role")
      // Citizen Review — phone is included here (detail view only, not the
      // list view) so the citizen's Call Authority action has real data to
      // work with. Never fabricated: the frontend must disable/hide the
      // action when phone is absent, not invent one.
      .populate("assignedTo",  "name email phone")
      .populate("assignedBy",  "name email");

    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user?.role === "citizen") {
      // submittedBy is populated at this point (User document), so .toString()
      // on the document returns "[object Object]", not the hex ID.
      // Extract ._id from the populated doc; fall back to direct cast for the
      // unpopulated (raw ObjectId) case so the check is safe in both states.
      const populated = complaint.submittedBy as unknown as { _id?: mongoose.Types.ObjectId };
      const submittedById = populated._id?.toString() ?? complaint.submittedBy.toString();
      if (submittedById !== req.user._id.toString()) {
        return next(new AppError("Access denied", 403));
      }
    } else if (req.user?.role === "authority") {
      if (!authorityOwns(complaint, req.user)) {
        return next(new AppError("Access denied — this complaint is not assigned to you", 403));
      }
    }

    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateComplaint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    // ── Citizen: can only touch their own pending complaint ───────────────────
    if (req.user.role === "citizen") {
      if (complaint.submittedBy.toString() !== req.user._id.toString()) {
        return next(new AppError("Access denied", 403));
      }
      if (complaint.status !== "pending") {
        return next(new AppError("Cannot modify a complaint that is no longer pending", 400));
      }
      // Citizens cannot touch the assignment or authority-specific fields.
      delete req.body.assignedTo;
      delete req.body.resolution;
    }

    // ── Authority: can only touch their OWN assigned complaint ───────────────
    if (req.user.role === "authority") {
      if (!authorityOwns(complaint, req.user)) {
        return next(new AppError("Access denied — this complaint is not assigned to you", 403));
      }
      // Phase 3B: authorities cannot set assignedTo (assignment is admin-only).
      if ("assignedTo" in req.body) {
        return next(new AppError("Assignment can only be done by an administrator", 403));
      }
    }

    const { status, resolution, assignedTo } = req.body;

    // ── Status transition ─────────────────────────────────────────────────────
    if (status && status !== complaint.status) {
      // Citizen Review fork: an authority always requests "resolved" here,
      // exactly as before Citizen Review existed — the frontend is
      // unchanged. The backend alone decides where that resolution actually
      // goes: reworkCount === 0 means this is the authority's FIRST
      // resolution on this complaint, so it must go to the citizen first
      // (Citizen Review), not straight to admin verification. Once a
      // complaint has been through rework at least once (reworkCount > 0),
      // a resubmitted resolution keeps going to "resolved" for
      // administrator verification exactly as it always has — that
      // existing path is untouched.
      const effectiveStatus: typeof status =
        status === "resolved" && (complaint.reworkCount ?? 0) === 0
          ? "awaiting_citizen_review"
          : status;

      complaint.status = effectiveStatus;
      if (effectiveStatus === "awaiting_citizen_review") {
        complaint.resolvedAt = new Date();
        appendEvent(complaint, "resolved", "Resolution submitted — your complaint is ready for review", actor);
      } else if (effectiveStatus === "resolved") {
        complaint.resolvedAt = new Date();
        appendEvent(complaint, "resolved", "Resolution submitted — awaiting administrator verification", actor);
      } else if (status === "rejected") {
        appendEvent(complaint, "rejected", "Complaint rejected", actor);
      } else if (status === "in-progress") {
        appendEvent(complaint, "status_change", "Investigation started", actor);
      } else {
        appendEvent(complaint, "status_change", `Status updated to ${status}`, actor);
      }
    }

    if (resolution !== undefined) complaint.resolution = resolution;

    // ── Assignment (admin only — authority path blocked above) ────────────────
    if (assignedTo !== undefined && String(assignedTo) !== String(complaint.assignedTo ?? "")) {
      const isReassign = !!complaint.assignedTo;
      (complaint.assignedTo as unknown) = new mongoose.Types.ObjectId(String(assignedTo));
      complaint.assignedBy     = actor._id;
      complaint.assignedAt     = new Date();
      complaint.assignedByName = actor.name;
      // Automation 2 — Smart Routing: an admin explicitly setting/changing
      // assignedTo is always a manual override, even if the complaint was
      // previously auto-assigned. The original automatic RoutingResult
      // record (if any) is left untouched as audit history.
      complaint.assignmentSource = "manual";
      appendEvent(
        complaint,
        isReassign ? "reassigned" : "assigned",
        isReassign ? `Complaint reassigned by ${actor.name}` : `Complaint assigned by ${actor.name}`,
        actor,
      );
    }

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email" },
      { path: "assignedBy",  select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteComplaint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));
    if (req.user.role === "citizen" && complaint.submittedBy.toString() !== req.user._id.toString()) {
      return next(new AppError("Access denied", 403));
    }
    for (const img of complaint.images) await deleteEvidenceFile(img).catch(() => {});
    await complaint.deleteOne();
    res.json({ success: true, message: "Complaint deleted" });
  } catch (err) { next(err); }
}

// ─── My complaints (citizen) ──────────────────────────────────────────────────
export async function getMyComplaints(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaints = await Complaint.find({ submittedBy: req.user._id })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: { complaints } });
  } catch (err) { next(err); }
}

// ─── Add evidence images ──────────────────────────────────────────────────────
export async function addComplaintImages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) return next(new AppError("No images provided", 400));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    // Citizens may only upload evidence to their own complaint.
    if (req.user.role === "citizen") {
      if (complaint.submittedBy.toString() !== req.user._id.toString()) {
        return next(new AppError("Access denied — you can only upload evidence to your own complaints", 403));
      }
    }

    // Phase 3B: authority must own this complaint to upload evidence
    if (req.user.role === "authority" && !authorityOwns(complaint, req.user)) {
      return next(new AppError("Access denied — this complaint is not assigned to you", 403));
    }

    const saved: string[] = [];
    const invalid: string[] = [];
    for (const f of files) {
      if (!isValidImageBuffer(f.buffer, f.mimetype)) { invalid.push(f.originalname); continue; }
      saved.push(await saveEvidenceBuffer(f.buffer, f.mimetype, req.params.id));
    }
    if (saved.length === 0) return next(new AppError("No valid images (magic-byte check failed)", 400));

    complaint.images.push(...saved);
    appendEvent(complaint, "image_added",
      `${saved.length} evidence image${saved.length !== 1 ? "s" : ""} uploaded`,
      { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name });

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email" },
    ]);
    res.json({ success: true, data: { complaint, invalidFiles: invalid.length ? invalid : undefined } });
  } catch (err) { next(err); }
}

// ─── Remove evidence image ────────────────────────────────────────────────────
export async function removeComplaintImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { imageUrl } = req.body;
    if (!imageUrl) return next(new AppError("imageUrl is required", 400));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user.role === "authority" && !authorityOwns(complaint, req.user)) {
      return next(new AppError("Access denied — this complaint is not assigned to you", 403));
    }

    const idx = complaint.images.indexOf(imageUrl);
    if (idx === -1) return next(new AppError("Image not found on this complaint", 404));
    complaint.images.splice(idx, 1);
    appendEvent(complaint, "image_removed", "Evidence image removed",
      { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name });

    await complaint.save();
    await deleteEvidenceFile(imageUrl).catch(() => {});
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Update internal notes ────────────────────────────────────────────────────
export async function updateComplaintNotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user.role === "authority" && !authorityOwns(complaint, req.user)) {
      return next(new AppError("Access denied — this complaint is not assigned to you", 403));
    }

    const notes    = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
    const hadNotes = Boolean(complaint.internalNotes?.trim());
    complaint.internalNotes = notes;
    if (notes) {
      appendEvent(complaint, "note_updated",
        hadNotes ? "Internal notes updated" : "Internal notes added",
        { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name });
    }
    await complaint.save();
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Phase 3C — Administrator verification ────────────────────────────────────
// Approves the authority's submitted resolution and closes the complaint.
// Admin-only (enforced by the route's authorize("administrator")). Only valid
// from "resolved" — mirrors the same status-transition pattern as
// updateComplaint above, but as a dedicated endpoint since verification also
// needs to stamp verifiedBy/verifiedAt/verifiedByName, which updateComplaint
// has no generic field-write path for.
export async function verifyResolution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (complaint.status !== "resolved") {
      return next(new AppError("Only a resolved complaint awaiting verification can be approved", 400));
    }

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    complaint.status         = "closed";
    complaint.verifiedBy     = actor._id;
    complaint.verifiedAt     = new Date();
    complaint.verifiedByName = actor.name;
    appendEvent(complaint, "verified", `Resolution approved by ${actor.name}`, actor);
    appendEvent(complaint, "closed", "Complaint closed", actor);

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email" },
      { path: "verifiedBy",  select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Phase 3C — Administrator rework request ──────────────────────────────────
// Rejects the authority's submitted resolution and returns the complaint to
// them for rework, recording the reason/comments and bumping reworkCount.
// Admin-only. Only valid from "resolved".
export async function requestRework(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { reason, comments } = req.body as { reason?: string; comments?: string };
    if (!reason || !reason.trim() || reason.trim().length < 10) {
      return next(new AppError("A rework reason of at least 10 characters is required", 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (complaint.status !== "resolved") {
      return next(new AppError("Only a resolved complaint awaiting verification can be returned for rework", 400));
    }

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    complaint.status          = "rework";
    complaint.reworkReason    = reason.trim();
    complaint.reworkComments  = comments?.trim() || undefined;
    complaint.reworkCount     = (complaint.reworkCount ?? 0) + 1;
    appendEvent(complaint, "rework_requested", `Returned for rework by ${actor.name}: ${reason.trim()}`, actor);

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Citizen Review — accept resolution ───────────────────────────────────────
// Citizen-only counterpart to verifyResolution. Accepts the authority's FIRST
// resolution and closes the complaint directly — no administrator step for
// the normal automatic path. Only valid from "awaiting_citizen_review", and
// only for the citizen who submitted the complaint.
export async function acceptResolution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (complaint.submittedBy.toString() !== req.user._id.toString()) {
      return next(new AppError("Access denied", 403));
    }
    if (complaint.status !== "awaiting_citizen_review") {
      return next(new AppError("Only a complaint awaiting your review can be accepted", 400));
    }

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    complaint.status = "closed";
    appendEvent(complaint, "citizen_accepted", `Resolution accepted by ${actor.name}`, actor);
    appendEvent(complaint, "closed", "Complaint closed", actor);

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email phone" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Citizen Review — request rework ──────────────────────────────────────────
// Citizen-only counterpart to the administrator's requestRework. The citizen
// rejects the authority's FIRST resolution and sends it to the
// administrator's rework queue for manual assignment. Only valid from
// "awaiting_citizen_review", and only for the citizen who submitted the
// complaint. Reuses the same reworkReason/reworkComments/reworkCount fields
// and "rework" status as the existing admin-triggered rework path — no
// duplicate rework system.
export async function citizenRequestRework(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { reason, comments } = req.body as { reason?: string; comments?: string };
    if (!reason || !reason.trim() || reason.trim().length < 10) {
      return next(new AppError("A rework reason of at least 10 characters is required", 400));
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (complaint.submittedBy.toString() !== req.user._id.toString()) {
      return next(new AppError("Access denied", 403));
    }
    if (complaint.status !== "awaiting_citizen_review") {
      return next(new AppError("Only a complaint awaiting your review can be sent back for rework", 400));
    }

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    complaint.status          = "rework";
    complaint.reworkReason    = reason.trim();
    complaint.reworkComments  = comments?.trim() || undefined;
    complaint.reworkCount     = (complaint.reworkCount ?? 0) + 1;
    appendEvent(complaint, "rework_requested", `Rework requested by ${actor.name}: ${reason.trim()}`, actor);

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo",  select: "name email phone" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) { next(err); }
}

// ─── Automation 1 — Own ML Complaint Intelligence ─────────────────────────────
// Returns the latest Own ML prediction for a specific complaint.
// This is the per-complaint intelligence endpoint (GET /:id/intelligence).
// It is entirely separate from:
//   • the AI Copilot (Gemini-backed citizen assistant, /api/copilot/*)
//   • the Environmental Intelligence (Gemini-backed authority analytics, /api/intelligence/*)
//   • the Command Center aggregate complaint-intelligence (/api/command/complaint-intelligence)
// All four systems must remain independent — do not merge or rename any of them.
export async function getComplaintIntelligence(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id).lean();
    if (!complaint) return next(new AppError("Complaint not found", 404));

    // Phase 3B ownership guard — same rule as all other authority-facing handlers.
    if (req.user.role === "authority") {
      const assignedTo = complaint.assignedTo?.toString() ?? "";
      if (assignedTo !== req.user._id.toString()) {
        return next(new AppError("Access denied — this complaint is not assigned to you", 403));
      }
    }

    // `prediction: null` is a valid state — the Own ML job may not have run yet
    // for recently submitted complaints. The client must handle this gracefully.
    const prediction = await getLatestComplaintPrediction(req.params.id);

    res.json({
      success: true,
      data: {
        complaintId: req.params.id,
        prediction: prediction ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Automation 2 — Smart Routing (read-only) ─────────────────────────────────
// Returns the most recent Smart Routing decision for a specific complaint —
// the automated-assignment counterpart to getComplaintIntelligence above.
// Read-only, audit-facing: no Automation 4 (Authority Board) UI is built on
// top of this in this phase, but the data is available for it later.
export async function getComplaintRouting(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id).lean();
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user.role === "authority") {
      const assignedTo = complaint.assignedTo?.toString() ?? "";
      if (assignedTo !== req.user._id.toString()) {
        return next(new AppError("Access denied — this complaint is not assigned to you", 403));
      }
    }

    // `routing: null` is a valid state — e.g. the complaint hasn't gone
    // through Smart Routing yet, or no ML prediction existed at the time.
    const routing = await getLatestRoutingResult(req.params.id);

    res.json({
      success: true,
      data: {
        complaintId: req.params.id,
        routing: routing ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

