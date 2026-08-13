import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { MapLocation } from "../models/MapLocation";
import { AIConversation } from "../models/AIConversation";
import { AIInsight } from "../models/AIInsight";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { computeLocationProfile } from "../services/locationEnvironment.service";
import { resolveDirection, TREND_MIN_READINGS } from "./environmental.controller";
import {
  generateCopilotResponse,
  generateHealthAdvice,
  generateRecommendations,
  getInsightsFromData,
  generateCityInsights,
  generateEnvironmentalInsight,
} from "../services/gemini.service";

// ─── Helper: get city data ────────────────────────────────────────────────────
async function getCityData(cityId: string) {
  const data = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() })
    .sort({ timestamp: -1 })
    .lean();
  return data;
}

// ─── POST /api/copilot/chat ──────────────────────────────────────────────────
export async function chat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { question, cityId, sessionId } = req.body;
    if (!question?.trim()) return next(new AppError("Question is required", 400));

    const city = cityId || "belagavi";
    const cityData = await getCityData(city);
    if (!cityData) return next(new AppError("City data not found", 404));

    const userRole = req.user?.role ?? "citizen";
    const answer = await generateCopilotResponse(
      question,
      cityData as Record<string, unknown>,
      userRole,
    );

    // Persist conversation
    const sid = sessionId || uuidv4();
    await AIConversation.findOneAndUpdate(
      { sessionId: sid },
      {
        $setOnInsert: {
          cityId: cityData.cityId,
          cityName: cityData.cityName,
          sessionId: sid,
          userId: req.user?._id,
        },
        $push: {
          messages: {
            $each: [
              { role: "user", content: question, timestamp: new Date() },
              { role: "assistant", content: answer, timestamp: new Date() },
            ],
          },
        },
      },
      { upsert: true },
    );

    res.json({
      success: true,
      data: {
        sessionId: sid,
        question,
        answer,
        cityId: cityData.cityId,
        cityName: cityData.cityName,
        metrics: {
          aqi: cityData.aqi,
          pm25: cityData.pm25,
          water: cityData.water,
          risk: cityData.risk,
          temp: cityData.temp,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Backward-compat alias for POST /api/copilot/ask ─────────────────────────
export const askCopilot = chat;

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5 — Environmental Overview grounded assistant
// ═══════════════════════════════════════════════════════════════════════════
// POST /api/copilot/environment-insight
//
// Deliberately does NOT persist to AIConversation — this is a lightweight,
// one-off contextual question from the public Environmental Overview page
// (per the Phase 5 spec, section 18), not a saved conversation thread like
// the full Copilot page's /chat. Same auth, same Gemini client, same
// city-data fetch pattern as /chat — no second AI provider, no second
// conversation model.
export async function environmentInsight(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question, cityId, locationId } = req.body;
    if (!question?.trim()) return next(new AppError("Question is required", 400));

    const city = (cityId || "belagavi").toLowerCase();
    const cityData = await getCityData(city);
    if (!cityData) return next(new AppError("City data not found", 404));

    // ── Verified (source: "api") 7-day trend — identical rule/thresholds to
    // Phase 3's getCityTrends, reused via the exported helper rather than
    // reimplemented, so seeded/demo readings can never surface here either.
    let trend: { direction: string; avgAqi7d: number; readings7d: number } | null = null;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const agg = await EnvironmentalData.aggregate([
      { $match: { cityId: city, timestamp: { $gte: since }, source: "api" } },
      { $group: { _id: null, avgAqi: { $avg: "$aqi" }, count: { $sum: 1 } } },
    ]);
    const readings7d = agg[0]?.count ?? 0;
    if (readings7d >= TREND_MIN_READINGS) {
      const avgAqi7d = Math.round(agg[0].avgAqi * 10) / 10;
      trend = {
        direction: resolveDirection(cityData.aqi, avgAqi7d, readings7d),
        avgAqi7d,
        readings7d,
      };
    }

    // ── Optional Phase 4 spatial context — only when the citizen actually
    // selected a monitored location. Explicitly flagged as an estimate: the
    // per-location value is a modeled figure (city baseline × category
    // profile), not an independent live sensor reading, and the AI is told
    // that plainly so it never describes it as "measured".
    let location: {
      name: string;
      category: string;
      estimatedAqi: number;
      isEstimate: boolean;
      description?: string;
    } | null = null;
    if (locationId) {
      const loc = await MapLocation.findOne({ cityId: city, locationId }).lean();
      if (loc) {
        const profile = computeLocationProfile(loc, cityData);
        location = {
          name: loc.name,
          category: loc.category,
          estimatedAqi: profile.level,
          isEstimate: true,
          description: loc.description,
        };
      }
    }

    const answer = await generateEnvironmentalInsight(question, {
      cityName: cityData.cityName,
      aqi: cityData.aqi,
      pm25: cityData.pm25,
      pm10: cityData.pm10,
      o3: cityData.o3 ?? null,
      no2: cityData.no2 ?? null,
      co: cityData.co ?? null,
      so2: cityData.so2 ?? null,
      temp: cityData.temp,
      humidity: cityData.humidity,
      windSpeed: cityData.windSpeed ?? null,
      pressure: cityData.pressure ?? null,
      timestamp: (cityData.timestamp as Date)?.toISOString?.() ?? new Date().toISOString(),
      trend,
      location,
    });

    res.json({
      success: true,
      data: {
        question,
        answer,
        cityId: cityData.cityId,
        cityName: cityData.cityName,
        hasVerifiedTrend: !!trend,
        hasLocationContext: !!location,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/copilot/health-advice ─────────────────────────────────────────
export async function healthAdvice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cityId = (req.body.cityId || req.query.cityId || "belagavi") as string;
    const cityData = await getCityData(cityId);
    if (!cityData) return next(new AppError("City data not found", 404));

    // Check cache (1-hour TTL)
    const cached = await AIInsight.findOne({
      cityId: cityData.cityId,
      type: "health_advice",
      expiresAt: { $gt: new Date() },
    }).lean();

    if (cached) {
      res.json({
        success: true,
        data: { advice: cached.content, cached: true, cityName: cityData.cityName },
      });
      return;
    }

    const advice = await generateHealthAdvice(cityData as Record<string, unknown>);

    await AIInsight.create({
      cityId: cityData.cityId,
      cityName: cityData.cityName,
      type: "health_advice",
      content: advice,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    res.json({ success: true, data: { advice, cached: false, cityName: cityData.cityName } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/copilot/recommendations ────────────────────────────────────────
export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cityId = (req.query.cityId as string) || "belagavi";
    const cityData = await getCityData(cityId);
    if (!cityData) return next(new AppError("City data not found", 404));

    const recommendations = await generateRecommendations(cityData as Record<string, unknown>);
    res.json({ success: true, data: { recommendations, cityId: cityData.cityId } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/copilot/insights ────────────────────────────────────────────────
export async function getInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cityId = (req.query.cityId as string) || "belagavi";
    const cityData = await getCityData(cityId);
    if (!cityData) return next(new AppError("City data not found", 404));

    // Try cache (30-min TTL)
    const cached = await AIInsight.findOne({
      cityId: cityData.cityId,
      type: "city_insights",
      expiresAt: { $gt: new Date() },
    }).lean();

    if (cached) {
      const content = cached.content as Record<string, unknown>;
      res.json({ success: true, data: { insights: content.insights, cached: true } });
      return;
    }

    const insights = await getInsightsFromData(cityData as Record<string, unknown>);

    await AIInsight.create({
      cityId: cityData.cityId,
      cityName: cityData.cityName,
      type: "city_insights",
      content: { insights },
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    res.json({ success: true, data: { insights, cityId: cityData.cityId } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/cities/:city/ai-insights ───────────────────────────────────────
export async function getCityAIInsights(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cityId = req.params.city?.toLowerCase() || "belagavi";
    const cityData = await getCityData(cityId);
    if (!cityData) return next(new AppError("City data not found", 404));

    const insights = await generateCityInsights(cityData as Record<string, unknown>);
    res.json({
      success: true,
      data: { insights, cityId: cityData.cityId, cityName: cityData.cityName },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/copilot/conversation/:sessionId ─────────────────────────────────
export async function getConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conv = await AIConversation.findOne({ sessionId: req.params.sessionId }).lean();
    if (!conv) return next(new AppError("Conversation not found", 404));
    res.json({ success: true, data: { conversation: conv } });
  } catch (err) {
    next(err);
  }
}
