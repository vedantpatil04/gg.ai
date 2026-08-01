import { Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { Complaint, type ComplaintEventType } from "../models/Complaint";
import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { isValidImageBuffer } from "../middleware/uploadPhoto";
import {
  notifyComplaintSubmitted,
  notifyComplaintAssigned,
  notifyInvestigationStarted,
  notifyEvidenceAdded,
  notifyResolutionSubmitted,
  notifyComplaintClosed,
  notifyReworkRequested,
} from "../services/notification.service";

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

function extractId(field: unknown): string {
  const f = field as Record<string, unknown>;
  return f._id != null ? String(f._id) : String(field);
}

/** Fetch all administrator IDs for fan-out notifications */
async function getAdminIds(): Promise<mongoose.Types.ObjectId[]> {
  const admins = await User.find({ role: "administrator", isActive: true })
    .select("_id")
    .lean();
  return admins.map((a) => a._id as mongoose.Types.ObjectId);
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

    // Phase 7 — Notify citizen (confirmation) and all administrators (new complaint)
    const adminIds = await getAdminIds();
    await notifyComplaintSubmitted(
      req.user._id as mongoose.Types.ObjectId,
      complaint._id.toString(),
      complaint.title,
      adminIds,
    );
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

    // Capture pre-save state for notification triggers
    const prevStatus = complaint.status;
    const prevAssignedTo = complaint.assignedTo;
    const citizenId = complaint.submittedBy as mongoose.Types.ObjectId;

    // ── Status transition ─────────────────────────────────────────────────────
    if (status && status !== complaint.status) {
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
          appendEvent(complaint, "resubmitted", "Resolution resubmitted after rework request", actor);
        } else {
          appendEvent(complaint, "resolved", "Resolution submitted — awaiting administrator verification", actor);
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
    let isNewAssignment = false;
    let isReassign = false;
    if (assignedTo !== undefined && String(assignedTo) !== String(prevAssignedTo ?? "")) {
      isReassign = !!prevAssignedTo;
      isNewAssignment = true;
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

    // ── Phase 7 notifications (fire after response) ───────────────────────────
    try {
      if (isNewAssignment && complaint.assignedTo) {
        const newAuthorityId = new mongoose.Types.ObjectId(String(assignedTo));
        const authorityUser = await User.findById(newAuthorityId).select("name").lean();
        await notifyComplaintAssigned(
          citizenId,
          newAuthorityId,
          complaint._id.toString(),
          complaint.title,
          authorityUser?.name ?? "an authority",
          isReassign,
        );
      }

      if (status === "in-progress" && prevStatus !== "in-progress") {
        await notifyInvestigationStarted(citizenId, complaint._id.toString(), complaint.title);
      }

      if (status === "resolved" && prevStatus !== "resolved") {
        const adminIds = await getAdminIds();
        const authorityId = complaint.assignedTo
          ? new mongoose.Types.ObjectId(extractId(complaint.assignedTo))
          : undefined;
        if (authorityId) {
          await notifyResolutionSubmitted(
            citizenId,
            authorityId,
            adminIds,
            complaint._id.toString(),
            complaint.title,
          );
        }
      }
    } catch {
      // Notifications never break the workflow
    }
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
    if (complaint.status === "closed") {
      return next(new AppError("Cannot add evidence to a closed complaint", 400));
    }

    const citizenId = complaint.submittedBy as mongoose.Types.ObjectId;

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

    // Phase 7 — notify citizen of new evidence
    await notifyEvidenceAdded(citizenId, complaint._id.toString(), complaint.title);
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
    const citizenId = complaint.submittedBy as mongoose.Types.ObjectId;
    const authorityId = complaint.assignedTo
      ? new mongoose.Types.ObjectId(complaint.assignedTo.toString())
      : undefined;

    complaint.status = "closed";
    complaint.verifiedBy = actor._id;
    complaint.verifiedAt = new Date();
    complaint.verifiedByName = actor.name;

    appendEvent(complaint, "verified", `Resolution approved by ${actor.name} — investigation verified`, actor);
    appendEvent(complaint, "closed", "Complaint closed", actor);

    await complaint.save();
    await complaint.populate([
      { path: "submittedBy", select: "name email role" },
      { path: "assignedTo", select: "name email" },
      { path: "verifiedBy", select: "name email" },
    ]);
    res.json({ success: true, data: { complaint } });

    // Phase 7 — notify citizen and authority
    await notifyComplaintClosed(citizenId, authorityId, complaint._id.toString(), complaint.title);
  } catch (err) {
    next(err);
  }
}

// ─── Phase 3C: Request rework (admin → rework) ───────────────────────────────
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
    const authorityId = complaint.assignedTo
      ? new mongoose.Types.ObjectId(complaint.assignedTo.toString())
      : undefined;

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

    // Phase 7 — notify authority of rework
    if (authorityId) {
      await notifyReworkRequested(authorityId, complaint._id.toString(), complaint.title, reason.trim());
    }
  } catch (err) {
    next(err);
  }
}
