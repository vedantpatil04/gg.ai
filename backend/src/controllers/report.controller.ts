import { Request, Response, NextFunction } from "express";
import { Report } from "../models/Report";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { generateReportSummary, generateAIReport } from "../services/gemini.service";
import { buildCommandReportPdf } from "../services/commandPdfExport.service";

export async function getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const filter: Record<string, unknown> = { isPublic: true };
    if (req.query.cityId) filter.cityId = String(req.query.cityId).toLowerCase();
    if (req.query.type) filter.type = req.query.type;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("generatedBy", "name")
        .lean(),
      Report.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: { reports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await Report.findById(req.params.id).populate("generatedBy", "name email");
    if (!report) return next(new AppError("Report not found", 404));
    res.json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
}

export async function createReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { title, type, cityId, metrics, tags, isPublic } = req.body;

    const aiSummary = await generateReportSummary(title, cityId, metrics || {});
    const report = await Report.create({
      title,
      type,
      cityId,
      summary: aiSummary,
      generatedBy: req.user._id,
      metrics,
      tags: tags || [],
      isPublic: isPublic !== false,
      fileSize: "2.1 MB",
      pages: Math.floor(Math.random() * 40) + 10,
    });
    res.status(201).json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/reports/generate-ai-report ────────────────────────────────────
export async function generateAIReportEndpoint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const { type, cityId, save } = req.body as {
      type: "Daily" | "Weekly" | "Monthly" | "City" | "Sustainability";
      cityId: string;
      save?: boolean;
    };

    if (!type || !cityId) return next(new AppError("type and cityId are required", 400));

    const cityData = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() })
      .sort({ timestamp: -1 })
      .lean();
    if (!cityData) return next(new AppError("City data not found", 404));

    // Fetch recent trend for richer context
    const trend = await EnvironmentalData.find({
      cityId: cityData.cityId,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ timestamp: 1 })
      .select("timestamp aqi pm25")
      .lean();

    const aiReport = await generateAIReport({
      type,
      cityData: cityData as Record<string, unknown>,
      trend: trend as unknown as Record<string, unknown>[],
    });

    // Optionally persist to database
    let saved = null;
    if (save !== false) {
      saved = await Report.create({
        title: aiReport.title,
        type:
          type === "Daily" || type === "Weekly" || type === "Monthly"
            ? (type as "Monthly")
            : "Analytics",
        summary: aiReport.executiveSummary,
        cityId: cityData.cityId,
        generatedBy: req.user._id,
        metrics: {
          aqi: cityData.aqi,
          pm25: cityData.pm25,
          water: cityData.water,
          risk: cityData.risk,
          eco: cityData.eco,
          carbon: cityData.carbon,
        },
        tags: ["ai-generated", type.toLowerCase(), cityData.cityId],
        isPublic: true,
        fileSize: "1.4 MB",
        pages: Math.floor(Math.random() * 12) + 8,
      });
    }

    res.status(201).json({ success: true, data: { report: aiReport, saved } });
  } catch (err) {
    next(err);
  }
}

export async function getReportStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cityId = req.query.cityId as string | undefined;
    const filter: Record<string, unknown> = {};
    if (cityId) filter.cityId = cityId.toLowerCase();

    const [total, monthly, compliance] = await Promise.all([
      Report.countDocuments(filter),
      Report.countDocuments({
        ...filter,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      Report.countDocuments({ ...filter, type: "Compliance" }),
    ]);
    res.json({ success: true, data: { total, monthly, compliance, forecastAccuracy: 94.2 } });
  } catch (err) {
    next(err);
  }
}

export async function downloadReportPdf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await Report.findById(req.params.id).lean();

    if (!report) {
      return next(new AppError("Report not found", 404));
    }

    const pdfBuffer = await buildCommandReportPdf({
      report: {
        title: report.title,
        period: report.createdAt.toDateString(),
        executiveSummary: report.summary,
        networkHealthAssessment: report.summary,
        keyFindings: report.tags || [],
        cityPerformanceHighlights: report.tags || [],
        actionItems: ["Review environmental conditions"],
        recommendations: ["Continue monitoring"],
        conclusion: report.summary,
      },
      kpis: {
        cityCount: 1,
        avgAqi: Number(report.metrics?.aqi || 0),
        avgRisk: Number(report.metrics?.risk || 0),
        avgEco: Number(report.metrics?.eco || 0),
        activeAlerts: 0,
        totalComplaints: 0,
        resolvedComplaints: 0,
        resolutionRate: 0,
        worstCity: null,
        bestCity: null,
      },
      chartData: {
        aqiRanking: [],
      },
      reportType: report.type,
      generatedAt: new Date(),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${report.title}.pdf"`);

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
