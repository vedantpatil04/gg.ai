import { Response, NextFunction } from "express";
import mongoose                   from "mongoose";
import { SupportTicket }          from "../models/SupportTicket";
import { BugReport }              from "../models/BugReport";
import { FeatureRequest }         from "../models/FeatureRequest";
import { Feedback }               from "../models/Feedback";
import { AppError }               from "../middleware/errorHandler";
import { AuthRequest }            from "../middleware/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slaEstimate(priority: string): string {
  switch (priority) {
    case "critical": return "Within 1 hour";
    case "high":     return "Within 2 hours";
    case "low":      return "Within 24 hours";
    default:         return "Within 4 hours";
  }
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export async function createTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const ticket = await SupportTicket.create({
      ...req.body,
      submittedBy:  req.user._id,
      assignedTeam: "Support Team",
    });
    res.status(201).json({
      success: true,
      data: { ticket, estimatedResponse: slaEstimate(ticket.priority) },
    });
  } catch (err) { next(err); }
}

export async function getMyTickets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = { submittedBy: req.user._id };
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    // Admins can see all tickets
    if (req.user.role === "administrator") delete filter.submittedBy;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { tickets, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

export async function getTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const ticket = await SupportTicket.findById(req.params.id).lean();
    if (!ticket) return next(new AppError("Ticket not found", 404));

    // Users can only see their own tickets; admins see all
    if (
      req.user.role !== "administrator" &&
      ticket.submittedBy.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorised", 403));
    }

    res.json({ success: true, data: { ticket } });
  } catch (err) { next(err); }
}

export async function updateTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return next(new AppError("Ticket not found", 404));

    if (
      req.user.role !== "administrator" &&
      ticket.submittedBy.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorised", 403));
    }

    const allowed: (keyof typeof req.body)[] = ["subject", "description", "status", "priority"];
    // Admins can also update assignedTeam
    if (req.user.role === "administrator") allowed.push("assignedTeam");

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (ticket as unknown as Record<string, unknown>)[key as string] = req.body[key];
      }
    }

    await ticket.save();
    res.json({ success: true, data: { ticket } });
  } catch (err) { next(err); }
}

export async function deleteTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return next(new AppError("Ticket not found", 404));

    // Only admin or owner can delete
    if (
      req.user.role !== "administrator" &&
      ticket.submittedBy.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorised", 403));
    }

    await ticket.deleteOne();
    res.json({ success: true, message: "Ticket deleted" });
  } catch (err) { next(err); }
}

export async function addComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return next(new AppError("Ticket not found", 404));

    if (
      req.user.role !== "administrator" &&
      ticket.submittedBy.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorised", 403));
    }

    ticket.comments.push({
      body:       req.body.body,
      authorId:   req.user._id as mongoose.Types.ObjectId,
      authorName: req.user.name ?? "User",
      createdAt:  new Date(),
    });

    await ticket.save();
    res.json({ success: true, data: { ticket } });
  } catch (err) { next(err); }
}

export async function getTicketStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const base = req.user.role === "administrator"
      ? {}
      : { submittedBy: req.user._id };

    const [open, in_progress, waiting, resolved, closed, total] = await Promise.all([
      SupportTicket.countDocuments({ ...base, status: "open" }),
      SupportTicket.countDocuments({ ...base, status: "in_progress" }),
      SupportTicket.countDocuments({ ...base, status: "waiting" }),
      SupportTicket.countDocuments({ ...base, status: "resolved" }),
      SupportTicket.countDocuments({ ...base, status: "closed" }),
      SupportTicket.countDocuments(base),
    ]);

    const resolvedAll = resolved + closed;
    const resolutionRate = total > 0 ? `${Math.round((resolvedAll / total) * 100)}%` : "0%";

    res.json({
      success: true,
      data: {
        open, in_progress, waiting, resolved, closed, total,
        resolutionRate,
        avgResponseTime: "2.4h",
        satisfactionScore: 4.7,
        pendingRequests: open + in_progress + waiting,
      },
    });
  } catch (err) { next(err); }
}

// ─── Bug Reports ──────────────────────────────────────────────────────────────

export async function createBugReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const report = await BugReport.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json({ success: true, data: { report } });
  } catch (err) { next(err); }
}

// ─── Feature Requests ─────────────────────────────────────────────────────────

export async function getFeatureRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;

    const [features, total] = await Promise.all([
      FeatureRequest.find(filter)
        .sort({ voteCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeatureRequest.countDocuments(filter),
    ]);

    // Attach voted flag for current user
    const userId = req.user?._id?.toString();
    const featuresWithVoted = features.map(f => ({
      ...f,
      voted: userId ? f.votes.some((v: mongoose.Types.ObjectId) => v.toString() === userId) : false,
    }));

    res.json({ success: true, data: { features: featuresWithVoted, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

export async function createFeatureRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const feature = await FeatureRequest.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json({ success: true, data: { feature } });
  } catch (err) { next(err); }
}

export async function toggleFeatureVote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const feature = await FeatureRequest.findById(req.params.id);
    if (!feature) return next(new AppError("Feature request not found", 404));

    const uid = req.user._id as mongoose.Types.ObjectId;
    const idx = feature.votes.findIndex(v => v.toString() === uid.toString());
    if (idx === -1) {
      feature.votes.push(uid);
      feature.voteCount += 1;
    } else {
      feature.votes.splice(idx, 1);
      feature.voteCount = Math.max(0, feature.voteCount - 1);
    }

    await feature.save();
    res.json({
      success: true,
      data: {
        voted:     idx === -1,
        voteCount: feature.voteCount,
      },
    });
  } catch (err) { next(err); }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function createFeedback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const feedback = await Feedback.create({ ...req.body, submittedBy: req.user._id });
    res.status(201).json({ success: true, data: { feedback } });
  } catch (err) { next(err); }
}

// ─── Bug Report List / Detail (added Phase 7) ─────────────────────────────────

export async function getBugReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = { submittedBy: req.user._id };
    // Admins can see all
    if (req.user.role === "administrator") delete filter.submittedBy;

    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.severity) filter.severity  = req.query.severity;
    if (req.query.category) filter.category  = req.query.category;

    const [reports, total] = await Promise.all([
      BugReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BugReport.countDocuments(filter),
    ]);

    res.json({ success: true, data: { reports, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

export async function getBugReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const report = await BugReport.findById(req.params.id).lean();
    if (!report) return next(new AppError("Bug report not found", 404));

    const isOwner = report.submittedBy.toString() === (req.user._id as mongoose.Types.ObjectId).toString();
    if (!isOwner && req.user.role !== "administrator") return next(new AppError("Not authorised", 403));

    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
}
