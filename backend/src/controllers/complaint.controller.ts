import { Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { Complaint, type ComplaintEventType } from "../models/Complaint";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { isValidImageBuffer } from "../middleware/uploadPhoto";

// ─── Evidence storage ─────────────────────────────────────────────────────────
const EVIDENCE_DIR = path.join(__dirname, "../../../uploads/evidence");
const EVIDENCE_PREFIX = "/uploads/evidence";
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function saveEvidenceBuffer(buf: Buffer, mime: string, cid: string): Promise<string> {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const name = `${cid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  await fs.writeFile(path.join(EVIDENCE_DIR, name), buf);
  return `${EVIDENCE_PREFIX}/${name}`;
}

async function deleteEvidenceFile(url: string): Promise<void> {
  if (!url.startsWith(EVIDENCE_PREFIX)) return;
  const name = url.slice(EVIDENCE_PREFIX.length + 1);
  if (!name || name.includes("/") || name.includes("..")) return;
  try {
    await fs.unlink(path.join(EVIDENCE_DIR, name));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

function appendEvent(
  c: InstanceType<typeof Complaint>,
  type: ComplaintEventType,
  message: string,
  actor?: { _id: mongoose.Types.ObjectId; name: string },
) {
  c.events.push({
    type,
    message,
    userId: actor?._id,
    userName: actor?.name,
    timestamp: new Date(),
  });
}

// ─── Ownership guard ──────────────────────────────────────────────────────────
// Handles both raw ObjectId and Mongoose-populated User document on assignedTo.
function authorityOwns(
  complaint: InstanceType<typeof Complaint>,
  user: AuthRequest["user"],
): boolean {
  if (!user) return false;
  if (user.role === "administrator") return true;
  if (user.role !== "authority") return false;
  if (!complaint.assignedTo) return false;
  const at = complaint.assignedTo as unknown as Record<string, unknown>;
  const assignedId = at._id != null ? String(at._id) : complaint.assignedTo.toString();
  return assignedId === String(user._id);
}

// Extracts a canonical id string from a field that may be raw ObjectId or populated doc.
function extractId(field: unknown): string {
  const f = field as Record<string, unknown>;
  return f._id != null ? String(f._id) : String(field);
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createComplaint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaint = await Complaint.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────
export async function getComplaints(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (req.user?.role === "citizen") {
      filter.submittedBy = req.user._id;
    } else if (req.user?.role === "authority") {
      // Phase 3B/3C: hard-scoped to their assigned complaints regardless of query params.
      filter.assignedTo = req.user._id;
    } else {
      if (req.query.assignedTo) {
        const v = String(req.query.assignedTo);
        filter.assignedTo = v === "me" ? req.user?._id : v;
      }
      if (req.query.unassigned === "true") filter.assignedTo = { $exists: false };
    }

    if (req.query.cityId) filter.cityId = String(req.query.cityId).toLowerCase();
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.issueType) filter.issueType = req.query.issueType;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("submittedBy", "name email")
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name email")
        .populate("verifiedBy", "name email")
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { complaints, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Single ───────────────────────────────────────────────────────────────────
export async function getComplaint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("submittedBy", "name email role")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("verifiedBy", "name email");

    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user?.role === "citizen") {
      if (extractId(complaint.submittedBy) !== String(req.user._id)) {
        return next(new AppError("Access denied", 403));
      }
      // Phase 3C: mask rework status from citizens — show as "in-progress"
      // and strip internal admin feedback fields.
      if (complaint.status === "rework") {
        const obj = complaint.toObject() as unknown as Record<string, unknown>;
        obj.status = "in-progress";
        obj.reworkReason = undefined;
        obj.reworkComments = undefined;
        res.json({ success: true, data: { complaint: obj } });
        return;
      }
    } else if (req.user?.role === "authority") {
      if (!authorityOwns(complaint, req.user)) {
        return next(new AppError("Access denied — this complaint is not assigned to you", 403));
      }
    }

    res.json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

// ─── Update (PATCH) ───────────────────────────────────────────────────────────
export async function updateComplaint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    // ── Citizen guard ─────────────────────────────────────────────────────────
    if (req.user.role === "citizen") {
      if (complaint.submittedBy.toString() !== req.user._id.toString()) {
        return next(new AppError("Access denied", 403));
      }
      if (complaint.status !== "pending") {
        return next(new AppError("Cannot modify a complaint that is no longer pending", 400));
      }
      delete req.body.assignedTo;
      delete req.body.resolution;
    }

    // ── Authority guard ───────────────────────────────────────────────────────
    if (req.user.role === "authority") {
      if (!authorityOwns(complaint, req.user)) {
        return next(new AppError("Access denied — this complaint is not assigned to you", 403));
      }
      if ("assignedTo" in req.body) {
        return next(new AppError("Assignment can only be done by an administrator", 403));
      }
    }

    const { status, resolution, assignedTo } = req.body;

    // ── Status transition ─────────────────────────────────────────────────────
    if (status && status !== complaint.status) {
      const prevStatus = complaint.status;

      // rework and closed are set only via dedicated endpoints
      if (status === "rework" || status === "closed") {
        return next(
          new AppError(
            status === "rework"
              ? "Use POST /complaints/:id/rework to request rework"
              : "Use POST /complaints/:id/verify to close a complaint",
            400,
          ),
        );
      }

      // Authority can only move in-progress → resolved  OR  rework → resolved (resubmit)
      if (req.user.role === "authority") {
        if (status !== "resolved") {
          return next(new AppError("Authorities can only change status to resolved", 403));
        }
        if (prevStatus !== "in-progress" && prevStatus !== "rework") {
          return next(new AppError(`Cannot submit resolution from '${prevStatus}' status`, 400));
        }
      }

      complaint.status = status as typeof complaint.status;

      if (status === "resolved") {
        complaint.resolvedAt = new Date();
        if (prevStatus === "rework") {
          appendEvent(
            complaint,
            "resubmitted",
            "Resolution resubmitted after rework request",
            actor,
          );
        } else {
          appendEvent(
            complaint,
            "resolved",
            "Resolution submitted — awaiting administrator verification",
            actor,
          );
        }
      } else if (status === "in-progress") {
        appendEvent(complaint, "status_change", "Investigation started", actor);
      } else if (status === "rejected") {
        appendEvent(complaint, "rejected", "Complaint rejected", actor);
      } else {
        appendEvent(complaint, "status_change", `Status updated to ${status}`, actor);
      }
    }

    if (resolution !== undefined) complaint.resolution = resolution;

    // ── Assignment (admin only) ───────────────────────────────────────────────
    if (assignedTo !== undefined && String(assignedTo) !== String(complaint.assignedTo ?? "")) {
      const isReassign = !!complaint.assignedTo;
      (complaint.assignedTo as unknown) = new mongoose.Types.ObjectId(String(assignedTo));
      complaint.assignedBy = actor._id;
      complaint.assignedAt = new Date();
      complaint.assignedByName = actor.name;
      appendEvent(
        complaint,
        isReassign ? "reassigned" : "assigned",
        isReassign
          ? `Complaint reassigned by ${actor.name}`
          : `Complaint assigned by ${actor.name}`,
        actor,
      );
    }

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo", select: "name email" },
      { path: "assignedBy", select: "name email" },
      { path: "verifiedBy", select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteComplaint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));
    if (
      req.user.role === "citizen" &&
      complaint.submittedBy.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Access denied", 403));
    }
    for (const img of complaint.images) await deleteEvidenceFile(img).catch(() => {});
    await complaint.deleteOne();
    res.json({ success: true, message: "Complaint deleted" });
  } catch (err) {
    next(err);
  }
}

// ─── My complaints ────────────────────────────────────────────────────────────
export async function getMyComplaints(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaints = await Complaint.find({ submittedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: { complaints } });
  } catch (err) {
    next(err);
  }
}

// ─── Add evidence images ──────────────────────────────────────────────────────
export async function addComplaintImages(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) return next(new AppError("No images provided", 400));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user.role === "authority" && !authorityOwns(complaint, req.user)) {
      return next(new AppError("Access denied — this complaint is not assigned to you", 403));
    }
    // Phase 3C: block uploads on closed or resolved (submitted) complaints
    if (complaint.status === "closed") {
      return next(new AppError("Cannot add evidence to a closed complaint", 400));
    }

    const saved: string[] = [];
    const invalid: string[] = [];
    for (const f of files) {
      if (!isValidImageBuffer(f.buffer, f.mimetype)) {
        invalid.push(f.originalname);
        continue;
      }
      saved.push(await saveEvidenceBuffer(f.buffer, f.mimetype, req.params.id));
    }
    if (saved.length === 0)
      return next(new AppError("No valid images (magic-byte check failed)", 400));

    complaint.images.push(...saved);
    appendEvent(
      complaint,
      "image_added",
      `${saved.length} evidence image${saved.length !== 1 ? "s" : ""} uploaded`,
      { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name },
    );

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo", select: "name email" },
    ]);
    res.json({
      success: true,
      data: { complaint, invalidFiles: invalid.length ? invalid : undefined },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Remove evidence image ────────────────────────────────────────────────────
export async function removeComplaintImage(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { imageUrl } = req.body;
    if (!imageUrl) return next(new AppError("imageUrl is required", 400));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user.role === "authority" && !authorityOwns(complaint, req.user)) {
      return next(new AppError("Access denied", 403));
    }
    if (complaint.status === "closed") {
      return next(new AppError("Cannot modify a closed complaint", 400));
    }

    const idx = complaint.images.indexOf(imageUrl);
    if (idx === -1) return next(new AppError("Image not found on this complaint", 404));
    complaint.images.splice(idx, 1);
    appendEvent(complaint, "image_removed", "Evidence image removed", {
      _id: req.user._id as mongoose.Types.ObjectId,
      name: req.user.name,
    });

    await complaint.save();
    await deleteEvidenceFile(imageUrl).catch(() => {});
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo", select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

// ─── Update internal notes ────────────────────────────────────────────────────
export async function updateComplaintNotes(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (req.user.role === "authority" && !authorityOwns(complaint, req.user)) {
      return next(new AppError("Access denied", 403));
    }
    if (complaint.status === "closed") {
      return next(new AppError("Cannot modify a closed complaint", 400));
    }

    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
    const hadNotes = Boolean(complaint.internalNotes?.trim());
    complaint.internalNotes = notes;
    if (notes) {
      appendEvent(
        complaint,
        "note_updated",
        hadNotes ? "Internal notes updated" : "Internal notes added",
        { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name },
      );
    }
    await complaint.save();
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

// ─── Phase 3C: Verify resolution (admin → closed) ────────────────────────────
// POST /api/complaints/:id/verify  —  administrator only
// Approves the authority's submitted resolution and closes the complaint.
export async function verifyResolution(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (complaint.status !== "resolved") {
      return next(
        new AppError(
          `Cannot verify a complaint with status '${complaint.status}' — only 'resolved' complaints can be verified`,
          400,
        ),
      );
    }

    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    complaint.status = "closed";
    complaint.verifiedBy = actor._id;
    complaint.verifiedAt = new Date();
    complaint.verifiedByName = actor.name;

    appendEvent(
      complaint,
      "verified",
      `Resolution approved by ${actor.name} — investigation verified`,
      actor,
    );
    appendEvent(complaint, "closed", "Complaint closed", actor);

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo", select: "name email" },
      { path: "verifiedBy", select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

// ─── Phase 3C: Request rework (admin → rework) ───────────────────────────────
// POST /api/complaints/:id/rework  —  administrator only
// Rejects the resolution and returns the complaint to the assigned authority.
export async function requestRework(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError("Complaint not found", 404));

    if (complaint.status !== "resolved") {
      return next(
        new AppError(
          `Cannot request rework on a complaint with status '${complaint.status}' — only 'resolved' complaints can be returned`,
          400,
        ),
      );
    }

    const { reason, comments } = req.body as { reason: string; comments?: string };
    const actor = { _id: req.user._id as mongoose.Types.ObjectId, name: req.user.name };

    complaint.status = "rework";
    complaint.reworkReason = reason.trim();
    complaint.reworkComments = comments?.trim() ?? undefined;
    complaint.reworkCount = (complaint.reworkCount ?? 0) + 1;

    appendEvent(
      complaint,
      "rework_requested",
      `Rework requested by ${actor.name}: ${reason.trim().slice(0, 120)}${reason.length > 120 ? "…" : ""}`,
      actor,
    );

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo", select: "name email" },
      { path: "assignedBy", select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}
