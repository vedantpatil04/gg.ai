/**
 * Phase 5 — Enterprise Citizen Hub: Backend Controller
 *
 * Provides a single enriched GET /api/citizen/stats endpoint that returns
 * real per-citizen aggregate data for the dashboard. All existing complaint
 * endpoints (/api/complaints, /api/complaints/mine, /api/complaints/:id) are
 * reused unchanged for data. This controller only adds what is missing.
 */

import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Complaint } from "../models/Complaint";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

/**
 * GET /api/citizen/stats
 * Returns real complaint statistics for the authenticated citizen.
 * Citizens only — enforced at router level.
 */
export async function getCitizenStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const uid = req.user._id as mongoose.Types.ObjectId;

    const [
      total,
      pending,
      inProgress,
      resolved,
      closed,
      rework,
      rejected,
      // Monthly submissions (current month)
      thisMonthCount,
      // Resolution time: average days from createdAt to resolvedAt for closed complaints
      resolutionTimeAgg,
    ] = await Promise.all([
      Complaint.countDocuments({ submittedBy: uid }),
      Complaint.countDocuments({ submittedBy: uid, status: "pending" }),
      Complaint.countDocuments({ submittedBy: uid, status: "in-progress" }),
      Complaint.countDocuments({ submittedBy: uid, status: "resolved" }),
      Complaint.countDocuments({ submittedBy: uid, status: "closed" }),
      Complaint.countDocuments({ submittedBy: uid, status: "rework" }),
      Complaint.countDocuments({ submittedBy: uid, status: "rejected" }),
      Complaint.countDocuments({
        submittedBy: uid,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      Complaint.aggregate([
        {
          $match: {
            submittedBy: uid,
            status: "closed",
            resolvedAt: { $exists: true },
          },
        },
        {
          $project: {
            daysToResolve: {
              $divide: [
                { $subtract: ["$resolvedAt", "$createdAt"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: "$daysToResolve" },
          },
        },
      ]),
    ]);

    // Monthly trend: last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrend = await Complaint.aggregate([
      {
        $match: {
          submittedBy: uid,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Category breakdown
    const categoryBreakdown = await Complaint.aggregate([
      { $match: { submittedBy: uid } },
      { $group: { _id: "$issueType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const active = inProgress + rework; // from citizen's perspective, rework = still being worked on
    const totalResolved = resolved + closed;
    const avgResolutionDays =
      resolutionTimeAgg.length > 0
        ? Math.round((resolutionTimeAgg[0] as { avgDays: number }).avgDays)
        : null;

    res.json({
      success: true,
      data: {
        stats: {
          total,
          pending,
          active,
          resolved: totalResolved,
          closed,
          rejected,
          thisMonth: thisMonthCount,
          avgResolutionDays,
        },
        monthlyTrend: monthlyTrend.map((m: { _id: { year: number; month: number }; count: number }) => ({
          year: m._id.year,
          month: m._id.month,
          count: m.count,
        })),
        categoryBreakdown: categoryBreakdown.map((c: { _id: string; count: number }) => ({
          issueType: c._id,
          count: c.count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
