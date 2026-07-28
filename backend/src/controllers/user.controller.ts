import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { Complaint } from "../models/Complaint";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

// ─── Get user profile ─────────────────────────────────────────────────────────
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return next(new AppError("User not found", 404));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// ─── Get user stats ───────────────────────────────────────────────────────────
export async function getUserStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const [totalComplaints, resolvedComplaints] = await Promise.all([
      Complaint.countDocuments({ submittedBy: req.user._id }),
      Complaint.countDocuments({ submittedBy: req.user._id, status: "resolved" }),
    ]);

    res.json({
      success: true,
      data: {
        complaints: totalComplaints,
        resolved: resolvedComplaints,
        citizensHelped: resolvedComplaints * Math.floor(Math.random() * 20 + 10),
      },
    });
  } catch (err) {
    next(err);
  }
}
