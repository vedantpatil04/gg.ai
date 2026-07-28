import { Request, Response, NextFunction } from "express";
import { Alert } from "../models/Alert";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { generateAlertExplanation } from "../services/gemini.service";

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cityId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const filter: Record<string, unknown> = { cityId: cityId.toLowerCase() };
    if (req.query.status) filter.status = req.query.status;

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Alert.countDocuments(filter);
    res.json({
      success: true,
      data: { alerts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    next(err);
  }
}

export async function getActiveAlerts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cityId = req.query.cityId as string | undefined;
    const filter: Record<string, unknown> = { status: "active" };
    if (cityId) filter.cityId = cityId.toLowerCase();
    const alerts = await Alert.find(filter).sort({ severity: -1, createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: { alerts } });
  } catch (err) {
    next(err);
  }
}

export async function createAlert(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const alert = await Alert.create({ ...req.body, isAutomated: false });
    res.status(201).json({ success: true, data: { alert } });
  } catch (err) {
    next(err);
  }
}

export async function acknowledgeAlert(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: "acknowledged", acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true },
    );
    if (!alert) return next(new AppError("Alert not found", 404));
    res.json({ success: true, data: { alert } });
  } catch (err) {
    next(err);
  }
}

export async function resolveAlert(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: "resolved", resolvedAt: new Date() },
      { new: true },
    );
    if (!alert) return next(new AppError("Alert not found", 404));
    res.json({ success: true, data: { alert } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/alerts/:id/explain ─────────────────────────────────────────────
export async function explainAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await Alert.findById(req.params.id).lean();
    if (!alert) return next(new AppError("Alert not found", 404));

    const cityData = await EnvironmentalData.findOne({ cityId: alert.cityId })
      .sort({ timestamp: -1 })
      .lean();

    const explanation = await generateAlertExplanation({
      title: alert.title,
      severity: alert.severity,
      category: alert.category,
      area: alert.area,
      cityName: cityData?.cityName ?? alert.cityId,
      aqi: cityData?.aqi,
      pm25: cityData?.pm25,
    });

    res.json({ success: true, data: { explanation, alert } });
  } catch (err) {
    next(err);
  }
}
