import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { Complaint } from "../models/Complaint";
import { Alert } from "../models/Alert";
import {
  generateAdminSummary,
  generateSustainabilityRecommendations,
  generateEnvironmentalRiskAnalysis,
  compareCities,
  generateRecommendations,
  generateNetworkExecutiveSummary,
  generateAuthorityActionPlan,
  generateExecutiveReport,
} from "../services/gemini.service";
import { buildCommandReportPdf } from "../services/commandPdfExport.service";

// ─── GET /api/command/executive-dashboard ────────────────────────────────────
// Returns composite scorecards + alert/complaint aggregates for the Overview tab
export async function getExecutiveDashboard(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [latestPerCity, activeAlerts, openComplaints, resolvedComplaints] = await Promise.all([
      EnvironmentalData.aggregate([
        { $sort: { cityId: 1, timestamp: -1 } },
        { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { aqi: -1 } },
      ]),
      Alert.countDocuments({ status: "active" }),
      Complaint.countDocuments({ status: { $in: ["pending", "in-progress"] } }),
      Complaint.countDocuments({ status: "resolved" }),
    ]);

    if (!latestPerCity.length) {
      res.json({
        success: true,
        data: { empty: true, message: "No environmental data available." },
      });
      return;
    }

    const cityCount = latestPerCity.length;
    const avgAqi = latestPerCity.reduce((s, c) => s + c.aqi, 0) / cityCount;
    const avgRisk = latestPerCity.reduce((s, c) => s + (c.risk ?? 0), 0) / cityCount;
    const avgEco = latestPerCity.reduce((s, c) => s + (c.eco ?? 0), 0) / cityCount;
    const avgCarbon = latestPerCity.reduce((s, c) => s + (c.carbon ?? 0), 0) / cityCount;
    const avgWater = latestPerCity.reduce((s, c) => s + (c.water ?? 0), 0) / cityCount;

    // Composite scores (0–100 scale)
    const aqiScore = Math.max(0, Math.round(100 - (avgAqi / 500) * 100));
    const environmentalHealthIndex = Math.round(
      aqiScore * 0.35 + avgEco * 0.3 + (100 - avgRisk) * 0.35,
    );
    const smartCityScore = Math.round(
      avgEco * 0.4 + (100 - avgRisk) * 0.25 + avgWater * 0.2 + aqiScore * 0.15,
    );
    const sustainabilityScore = Math.round(
      avgEco * 0.45 + Math.max(0, 100 - avgCarbon * 2) * 0.3 + avgWater * 0.25,
    );
    const environmentalRiskScore = Math.round(avgRisk);

    const highRiskCities = latestPerCity
      .filter((c) => c.aqi > 150 || c.risk > 65)
      .map((c) => ({ cityId: c.cityId, cityName: c.cityName, aqi: c.aqi, risk: c.risk }));

    const cityRankings = latestPerCity.map((c, i) => ({
      rank: i + 1,
      cityId: c.cityId,
      cityName: c.cityName,
      country: c.country,
      aqi: c.aqi,
      pm25: c.pm25,
      risk: c.risk ?? 0,
      eco: c.eco ?? 0,
      carbon: c.carbon ?? 0,
      water: c.water ?? 0,
    }));

    res.json({
      success: true,
      data: {
        scores: {
          environmentalHealthIndex,
          smartCityScore,
          sustainabilityScore,
          environmentalRiskScore,
        },
        network: {
          cityCount,
          avgAqi: Math.round(avgAqi * 10) / 10,
          avgRisk: Math.round(avgRisk * 10) / 10,
          avgEco: Math.round(avgEco * 10) / 10,
          avgCarbon: Math.round(avgCarbon * 10) / 10,
          avgWater: Math.round(avgWater * 10) / 10,
        },
        alerts: { active: activeAlerts },
        complaints: { open: openComplaints, resolved: resolvedComplaints },
        highRiskCities,
        cityRankings,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/command/complaint-intelligence ──────────────────────────────────
// Category breakdown, resolution rates, high-risk areas, repeated issues
export async function getComplaintIntelligence(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [byCategory, byCity, byStatus, bySeverity, recentTrend] = await Promise.all([
      // Category breakdown
      Complaint.aggregate([
        { $group: { _id: "$issueType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // City volume + resolution rate
      Complaint.aggregate([
        {
          $group: {
            _id: "$cityId",
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            critical: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),
      // Status distribution
      Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      // Severity distribution
      Complaint.aggregate([
        { $group: { _id: "$severity", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Last 30 days trend by day
      Complaint.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Compute resolution rates per city
    const cityStats = byCity.map((c) => ({
      cityId: c._id,
      total: c.total,
      resolved: c.resolved,
      pending: c.pending,
      critical: c.critical,
      resolutionRate: c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0,
    }));

    // High-risk areas: cities with high pending + critical count
    const highRiskAreas = cityStats
      .filter((c) => c.pending > 0 || c.critical > 0)
      .sort((a, b) => b.critical * 3 + b.pending - (a.critical * 3 + a.pending))
      .slice(0, 5);

    // Repeated issue patterns: issue types appearing >5 times
    const repeatedIssues = byCategory
      .filter((c) => c.count >= 3)
      .map((c) => ({ issueType: c._id, count: c.count }));

    // Total stats
    const totalComplaints = byStatus.reduce((s, c) => s + c.count, 0);
    const resolvedCount = byStatus.find((s) => s._id === "resolved")?.count ?? 0;
    const overallResolutionRate =
      totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total: totalComplaints,
          resolved: resolvedCount,
          resolutionRate: overallResolutionRate,
        },
        byCategory: byCategory.map((c) => ({ issueType: c._id, count: c.count })),
        byStatus: byStatus.map((c) => ({ status: c._id, count: c.count })),
        bySeverity: bySeverity.map((c) => ({ severity: c._id, count: c.count })),
        cityStats,
        highRiskAreas,
        repeatedIssues,
        trend: recentTrend.map((d) => ({ date: d._id, total: d.count, resolved: d.resolved })),
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/command/trend-intelligence ─────────────────────────────────────
// Daily/weekly/monthly multi-metric trend across all cities
export async function getTrendIntelligence(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const granularity = (req.query.granularity as string) || "daily";
    const daysMap: Record<string, number> = { daily: 30, weekly: 90, monthly: 365 };
    const days = daysMap[granularity] ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const formatMap: Record<string, string> = {
      daily: "%Y-%m-%d",
      weekly: "%Y-W%V",
      monthly: "%Y-%m",
    };
    const dateFormat = formatMap[granularity] ?? "%Y-%m-%d";

    const [aqiTrend, complaintTrend, alertTrend] = await Promise.all([
      // AQI, PM2.5, Risk, Eco averaged across all cities
      EnvironmentalData.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
            avgAqi: { $avg: "$aqi" },
            avgPm25: { $avg: "$pm25" },
            avgPm10: { $avg: "$pm10" },
            avgRisk: { $avg: "$risk" },
            avgEco: { $avg: "$eco" },
            avgCarbon: { $avg: "$carbon" },
            readings: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Complaints per period
      Complaint.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Alerts per period
      Alert.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        granularity,
        aqiTrend: aqiTrend.map((d) => ({
          period: d._id,
          avgAqi: Math.round(d.avgAqi * 10) / 10,
          avgPm25: Math.round(d.avgPm25 * 10) / 10,
          avgPm10: Math.round(d.avgPm10 * 10) / 10,
          avgRisk: Math.round(d.avgRisk * 10) / 10,
          avgEco: Math.round(d.avgEco * 10) / 10,
          avgCarbon: Math.round(d.avgCarbon * 10) / 10,
        })),
        complaintTrend: complaintTrend.map((d) => ({
          period: d._id,
          total: d.total,
          resolved: d.resolved,
        })),
        alertTrend: alertTrend.map((d) => ({
          period: d._id,
          total: d.total,
          critical: d.critical,
        })),
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/command/authority-actions ──────────────────────────────────────
// Per-city Gemini-generated action plans
export async function getAuthorityActions(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [latestPerCity, complaintsByCity, alertsByCity] = await Promise.all([
      EnvironmentalData.aggregate([
        { $sort: { cityId: 1, timestamp: -1 } },
        { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { aqi: -1 } },
        { $limit: 6 }, // Top 6 most polluted cities for action plans
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: "$cityId",
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          },
        },
      ]),
      Alert.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: "$cityId",
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const complaintMap = Object.fromEntries(complaintsByCity.map((c) => [c._id, c]));
    const alertMap = Object.fromEntries(alertsByCity.map((a) => [a._id, a]));

    // Run action plan generation for top cities (limit concurrency)
    const actionPlans = await Promise.all(
      latestPerCity.map(async (city) => {
        const complaints = complaintMap[city.cityId] ?? { total: 0, pending: 0 };
        const alerts = alertMap[city.cityId] ?? { total: 0, critical: 0 };
        const plan = await generateAuthorityActionPlan(city, complaints, alerts);
        return {
          cityId: city.cityId,
          cityName: city.cityName,
          country: city.country,
          currentAqi: city.aqi,
          currentRisk: city.risk,
          activeAlerts: alerts.total,
          pendingComplaints: complaints.pending,
          plan,
        };
      }),
    );

    res.json({ success: true, data: { actionPlans, generatedAt: new Date() } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/command/generate-executive-report ─────────────────────────────
// Generates a network-wide executive report with chart data + Gemini narrative
export async function generateExecutiveReportEndpoint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { type = "Monthly", cityId } = req.body as { type?: string; cityId?: string };

    const [latestPerCity, activeAlerts, totalComplaints, resolvedComplaints] = await Promise.all([
      EnvironmentalData.aggregate([
        ...(cityId ? [{ $match: { cityId: cityId.toLowerCase() } }] : []),
        { $sort: { cityId: 1, timestamp: -1 } },
        { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { aqi: -1 } },
      ]),
      Alert.countDocuments({ status: "active" }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "resolved" }),
    ]);

    if (!latestPerCity.length) {
      res.status(400).json({
        success: false,
        message: "No environmental data available for report generation.",
      });
      return;
    }

    const avgAqi = latestPerCity.reduce((s, c) => s + c.aqi, 0) / latestPerCity.length;
    const avgRisk = latestPerCity.reduce((s, c) => s + (c.risk ?? 0), 0) / latestPerCity.length;
    const avgEco = latestPerCity.reduce((s, c) => s + (c.eco ?? 0), 0) / latestPerCity.length;

    const networkStats = {
      type,
      cityCount: latestPerCity.length,
      avgAqi: Math.round(avgAqi * 10) / 10,
      avgRisk: Math.round(avgRisk * 10) / 10,
      avgEco: Math.round(avgEco * 10) / 10,
      activeAlerts,
      totalComplaints,
      resolvedComplaints,
      resolutionRate:
        totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0,
      worstCity: latestPerCity[0]
        ? { name: latestPerCity[0].cityName, aqi: latestPerCity[0].aqi }
        : null,
      bestCity: latestPerCity[latestPerCity.length - 1]
        ? {
            name: latestPerCity[latestPerCity.length - 1].cityName,
            aqi: latestPerCity[latestPerCity.length - 1].aqi,
          }
        : null,
    };

    const report = await generateExecutiveReport(networkStats, type);

    // Build chart data for frontend
    const aqiChartData = latestPerCity.slice(0, 10).map((c) => ({
      city: c.cityName,
      aqi: c.aqi,
      pm25: c.pm25,
      risk: c.risk ?? 0,
      eco: c.eco ?? 0,
    }));

    res.json({
      success: true,
      data: {
        report,
        kpis: networkStats,
        chartData: { aqiRanking: aqiChartData },
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/command/gemini-intelligence ───────────────────────────────────
// Network-level Gemini intelligence for Executive Overview tab
export async function getGeminiIntelligence(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { type = "executive-summary", cityId } = req.body as { type?: string; cityId?: string };

    const latestPerCity = await EnvironmentalData.aggregate([
      ...(cityId ? [{ $match: { cityId: cityId.toLowerCase() } }] : []),
      { $sort: { cityId: 1, timestamp: -1 } },
      { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { aqi: -1 } },
    ]);

    if (!latestPerCity.length) {
      res.json({ success: true, data: { type, result: "No city data available." } });
      return;
    }

    const [activeAlerts, totalComplaints] = await Promise.all([
      Alert.countDocuments({ status: "active" }),
      Complaint.countDocuments(),
    ]);

    let result: unknown;

    switch (type) {
      case "executive-summary": {
        const networkStats = {
          totalUsers: 0,
          activeAlerts,
          totalComplaints,
          cities: latestPerCity.map((c) => ({ cityName: c.cityName, aqi: c.aqi, risk: c.risk })),
        };
        result = await generateAdminSummary(networkStats);
        break;
      }
      case "environmental-assessment": {
        result = await generateNetworkExecutiveSummary({
          cities: latestPerCity,
          activeAlerts,
          totalComplaints,
        });
        break;
      }
      case "risk-analysis": {
        const target = cityId
          ? (latestPerCity.find((c) => c.cityId === cityId.toLowerCase()) ?? latestPerCity[0])
          : latestPerCity[0];
        result = await generateEnvironmentalRiskAnalysis(target.cityId);
        break;
      }
      case "city-performance": {
        const cityIds = latestPerCity.slice(0, 8).map((c) => c.cityId);
        result = await compareCities(cityIds);
        break;
      }
      case "sustainability": {
        const target = cityId
          ? (latestPerCity.find((c) => c.cityId === cityId.toLowerCase()) ?? latestPerCity[0])
          : latestPerCity[0];
        result = await generateSustainabilityRecommendations(target.cityId);
        break;
      }
      case "recommendations": {
        const target = cityId
          ? (latestPerCity.find((c) => c.cityId === cityId.toLowerCase()) ?? latestPerCity[0])
          : latestPerCity[0];
        result = await generateRecommendations(target);
        break;
      }
      default:
        result = "Unknown intelligence type requested.";
    }

    res.json({ success: true, data: { type, result, generatedAt: new Date() } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/command/export-report-pdf ─────────────────────────────────────
// Generates the executive report data (same as generate-executive-report) and
// streams it back as a downloadable PDF. Reuses buildCommandReportPdf.
export async function exportCommandReportPdf(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { type = "Monthly", cityId } = req.body as { type?: string; cityId?: string };

    const [latestPerCity, activeAlerts, totalComplaints, resolvedComplaints] = await Promise.all([
      EnvironmentalData.aggregate([
        ...(cityId ? [{ $match: { cityId: cityId.toLowerCase() } }] : []),
        { $sort: { cityId: 1, timestamp: -1 } },
        { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $sort: { aqi: -1 } },
      ]),
      Alert.countDocuments({ status: "active" }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "resolved" }),
    ]);

    if (!latestPerCity.length) {
      res
        .status(400)
        .json({ success: false, message: "No environmental data available for PDF export." });
      return;
    }

    const avgAqi = latestPerCity.reduce((s, c) => s + c.aqi, 0) / latestPerCity.length;
    const avgRisk = latestPerCity.reduce((s, c) => s + (c.risk ?? 0), 0) / latestPerCity.length;
    const avgEco = latestPerCity.reduce((s, c) => s + (c.eco ?? 0), 0) / latestPerCity.length;
    const resolutionRate =
      totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

    const networkStats = {
      type,
      cityCount: latestPerCity.length,
      avgAqi: Math.round(avgAqi * 10) / 10,
      avgRisk: Math.round(avgRisk * 10) / 10,
      avgEco: Math.round(avgEco * 10) / 10,
      activeAlerts,
      totalComplaints,
      resolvedComplaints,
      resolutionRate,
      worstCity: latestPerCity[0]
        ? { name: latestPerCity[0].cityName, aqi: latestPerCity[0].aqi }
        : null,
      bestCity: latestPerCity[latestPerCity.length - 1]
        ? {
            name: latestPerCity[latestPerCity.length - 1].cityName,
            aqi: latestPerCity[latestPerCity.length - 1].aqi,
          }
        : null,
    };

    // Generate Gemini narrative
    const report = await generateExecutiveReport(networkStats, type);

    // Build chart data
    const aqiRanking = latestPerCity.slice(0, 14).map((c) => ({
      city: c.cityName,
      aqi: c.aqi,
      pm25: c.pm25,
      risk: c.risk ?? 0,
      eco: c.eco ?? 0,
    }));

    // Build PDF
    const pdfBuffer = await buildCommandReportPdf({
      report,
      kpis: {
        cityCount: networkStats.cityCount,
        avgAqi: networkStats.avgAqi,
        avgRisk: networkStats.avgRisk,
        avgEco: networkStats.avgEco,
        activeAlerts,
        totalComplaints,
        resolvedComplaints,
        resolutionRate,
        worstCity: networkStats.worstCity,
        bestCity: networkStats.bestCity,
      },
      chartData: { aqiRanking },
      reportType: type,
      generatedAt: new Date(),
    });

    const safeType = type.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="greenguard-${safeType}-report-${dateStr}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
