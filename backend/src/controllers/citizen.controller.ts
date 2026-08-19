/**
 * citizen.controller.ts — Phase 12
 *
 * Adds GET /api/citizen/nearby-complaints endpoint for duplicate detection.
 * All other endpoints unchanged from Phase 5.
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
      awaitingCitizenReview,
      resolved,
      closed,
      rework,
      rejected,
      thisMonthCount,
      resolutionTimeAgg,
    ] = await Promise.all([
      Complaint.countDocuments({ submittedBy: uid }),
      Complaint.countDocuments({ submittedBy: uid, status: "pending" }),
      Complaint.countDocuments({ submittedBy: uid, status: "in-progress" }),
      Complaint.countDocuments({ submittedBy: uid, status: "awaiting_citizen_review" }),
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

    const active = inProgress + rework;
    const totalResolved = awaitingCitizenReview + resolved + closed;
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
        monthlyTrend: monthlyTrend.map(
          (m: { _id: { year: number; month: number }; count: number }) => ({
            year: m._id.year,
            month: m._id.month,
            count: m.count,
          }),
        ),
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

/**
 * GET /api/citizen/nearby-complaints
 *
 * Phase 12 — Duplicate Complaint Detection.
 *
 * Returns active complaints near a given lat/lng for the citizen to check
 * before submitting a new one. Filters by:
 *   - cityId (required)
 *   - lat, lng, radiusMeters (optional; defaults to 500 m radius)
 *   - issueType (optional — fuzzy match to surface the most relevant)
 *   - status in [pending, in-progress, rework]
 *
 * Distance filtering is done in JS (Haversine) since the existing Complaint
 * model uses a plain {lat, lng} subdocument rather than a GeoJSON index.
 * Keeping this in-process avoids any schema migration.
 */
export async function getNearbyComplaints(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const cityId = typeof req.query.cityId === "string" ? req.query.cityId.toLowerCase() : null;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusMeters = Math.min(
      5000,
      parseFloat((req.query.radiusMeters as string) ?? "500") || 500,
    );
    const issueType = typeof req.query.issueType === "string" ? req.query.issueType : null;

    if (!cityId) {
      return next(new AppError("cityId is required", 400));
    }

    // Build base filter: active complaints in this city
    const baseFilter: Record<string, unknown> = {
      cityId,
      status: { $in: ["pending", "in-progress", "rework"] },
    };

    // Optionally narrow by issue type
    if (issueType && issueType !== "other") {
      baseFilter.issueType = issueType;
    }

    const complaints = await Complaint.find(baseFilter)
      .select("_id title issueType severity status location createdAt")
      .limit(200)
      .lean();

    // If no lat/lng provided, return all active city complaints (no proximity filter)
    if (isNaN(lat) || isNaN(lng)) {
      res.json({ success: true, data: { complaints: complaints.slice(0, 20) } });
      return;
    }

    // Haversine distance filter
    function haversineMeters(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ): number {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    type ComplaintDoc = {
      _id: mongoose.Types.ObjectId;
      title?: string;
      issueType?: string;
      severity?: string;
      status?: string;
      location?: { lat?: number; lng?: number; address?: string };
      createdAt?: Date;
    };

    const nearby = (complaints as ComplaintDoc[])
      .filter((c) => {
        const cLat = c.location?.lat;
        const cLng = c.location?.lng;
        if (cLat == null || cLng == null) return false;
        return haversineMeters(lat, lng, cLat, cLng) <= radiusMeters;
      })
      .map((c) => ({
        ...c,
        distance: Math.round(
          haversineMeters(lat, lng, c.location!.lat!, c.location!.lng!),
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    res.json({ success: true, data: { complaints: nearby } });
  } catch (err) {
    next(err);
  }
}
