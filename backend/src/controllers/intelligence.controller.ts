import { Request, Response, NextFunction } from "express";
import {
  analyzeAQITrend,
  analyzePollutionHotspots,
  generateHealthImpactAnalysis,
  generateEnvironmentalRiskAnalysis,
  compareCities,
  generateSustainabilityRecommendations,
} from "../services/gemini.service";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { AppError } from "../middleware/errorHandler";

// ─── AQI Trend Interpretation ─────────────────────────────────────────────────
export async function getAQITrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cityId } = req.params;
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30);
    const insight = await analyzeAQITrend(cityId, days);
    res.json({ success: true, data: { cityId, days, insight } });
  } catch (err) {
    next(err);
  }
}

// ─── Pollution Hotspot Analysis ───────────────────────────────────────────────
export async function getHotspotAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const analysis = await analyzePollutionHotspots(cityId);
    res.json({ success: true, data: { cityId, analysis } });
  } catch (err) {
    next(err);
  }
}

// ─── Health Impact Analysis ───────────────────────────────────────────────────
export async function getHealthImpact(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const analysis = await generateHealthImpactAnalysis(cityId);
    res.json({ success: true, data: { cityId, analysis } });
  } catch (err) {
    next(err);
  }
}

// ─── Environmental Risk Analysis ──────────────────────────────────────────────
export async function getRiskAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const analysis = await generateEnvironmentalRiskAnalysis(cityId);
    res.json({ success: true, data: { cityId, analysis } });
  } catch (err) {
    next(err);
  }
}

// ─── City Comparison ──────────────────────────────────────────────────────────
export async function getCityComparison(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Accept ?cities=bangalore,delhi,mumbai  OR body { cityIds: [...] }
    const rawParam = (req.query.cities as string) || "";
    const bodyIds = Array.isArray(req.body?.cityIds) ? req.body.cityIds : [];
    const cityIds = rawParam
      ? rawParam
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : bodyIds;

    if (cityIds.length < 2) {
      // If no specific cities requested, compare all available cities
      const allCities = await EnvironmentalData.aggregate([
        { $sort: { cityId: 1, timestamp: -1 } },
        { $group: { _id: "$cityId" } },
      ]);
      const ids = allCities.map((c) => c._id);
      if (ids.length < 2)
        return next(new AppError("At least 2 cities required for comparison", 400));
      const analysis = await compareCities(ids);
      res.json({ success: true, data: { cityIds: ids, analysis } });
      return;
    }

    const analysis = await compareCities(cityIds);
    res.json({ success: true, data: { cityIds, analysis } });
  } catch (err) {
    next(err);
  }
}

// ─── Sustainability Recommendations ───────────────────────────────────────────
export async function getSustainabilityRecommendations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const recommendations = await generateSustainabilityRecommendations(cityId);
    res.json({ success: true, data: { cityId, recommendations } });
  } catch (err) {
    next(err);
  }
}

// ─── Executive Environmental Insights (authority dashboard) ──────────────────
export async function getExecutiveInsights(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Step 1: Pull real data from MongoDB — no hardcoded values
    const latestPerCity = await EnvironmentalData.aggregate([
      { $sort: { cityId: 1, timestamp: -1 } },
      { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { aqi: -1 } },
    ]);

    if (!latestPerCity.length) {
      res.json({
        success: true,
        data: { message: "No city data available yet. Seed or ingest data to enable insights." },
      });
      return;
    }

    const cityIds = latestPerCity.map((c) => c.cityId);
    const avgAqi = latestPerCity.reduce((s, c) => s + c.aqi, 0) / latestPerCity.length;
    const avgRisk = latestPerCity.reduce((s, c) => s + (c.risk ?? 0), 0) / latestPerCity.length;
    const avgEco = latestPerCity.reduce((s, c) => s + (c.eco ?? 0), 0) / latestPerCity.length;
    const worstCity = latestPerCity[0];
    const bestCity = latestPerCity[latestPerCity.length - 1];

    // Step 2: Run analyses with cache-awareness and circuit-protection
    const aqiTrend = await analyzeAQITrend(worstCity.cityId, 7);
    const cityComparison = await compareCities(cityIds);
    const sustainability = await generateSustainabilityRecommendations(worstCity.cityId);

    res.json({
      success: true,
      data: {
        networkSnapshot: {
          cityCount: latestPerCity.length,
          avgAqi: Math.round(avgAqi * 10) / 10,
          avgRisk: Math.round(avgRisk * 10) / 10,
          avgEco: Math.round(avgEco * 10) / 10,
          worstCity: { name: worstCity.cityName, aqi: worstCity.aqi, risk: worstCity.risk },
          bestCity: { name: bestCity.cityName, aqi: bestCity.aqi, eco: bestCity.eco },
          pollutionRankings: latestPerCity.map((c, i) => ({
            rank: i + 1,
            cityName: c.cityName,
            aqi: c.aqi,
            pm25: c.pm25,
            risk: c.risk,
            eco: c.eco,
          })),
          generatedAt: new Date(),
        },
        aqiTrendInsight: aqiTrend,
        cityComparisonAnalysis: cityComparison,
        sustainabilityRecommendations: sustainability,
      },
    });
  } catch (err) {
    next(err);
  }
}
