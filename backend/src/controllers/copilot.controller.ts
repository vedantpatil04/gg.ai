import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { AIConversation } from "../models/AIConversation";
import { AIInsight } from "../models/AIInsight";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import {
  generateCopilotResponse,
  generateHealthAdvice,
  generateRecommendations,
  getInsightsFromData,
  generateCityInsights,
  generateSustainabilityIntelligenceResponse,
  buildCopilotPrompt,
  SYSTEM_ENV_ANALYST,
  type SustainabilityAIContext,
} from "../services/gemini.service";
import { computeEcoScore, ECO_SCORE_WEIGHTS } from "../services/ecoScore.service";
import { fetchCityHistoryDays } from "./environmental.controller";
import { intelligenceCenterAIGateway } from "../services/ai/gateway";
import {
  PROVIDER_REGISTRY,
  isValidProviderName,
  isProviderConfigured,
  getAvailableProviderConfigs,
} from "../services/ai/config";
import { AIProviderError } from "../services/ai/errors";
import { AIProviderName } from "../services/ai/types";

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
    const { question, cityId, sessionId, provider } = req.body;
    if (!question?.trim()) return next(new AppError("Question is required", 400));

    // Optional Phase 2 provider override — only the Intelligence Center's
    // Assistant selector ever sends this. Every other caller of this shared
    // endpoint (Dashboard, Map, Forecast, legacy /intelligence widgets)
    // omits it and gets the exact unchanged Gemini behavior below.
    let resolvedProvider: AIProviderName = "gemini";
    if (provider !== undefined && provider !== null && provider !== "gemini") {
      if (!isValidProviderName(provider)) {
        return next(new AppError("Unsupported AI provider", 400));
      }
      resolvedProvider = provider;
    }

    const city = cityId || "belagavi";
    const cityData = await getCityData(city);
    if (!cityData) return next(new AppError("City data not found", 404));

    const userRole = req.user?.role ?? "citizen";

    let answer: string;
    let model: string;

    if (resolvedProvider === "gemini") {
      // Unchanged path — identical to pre-Phase-2 behavior.
      answer = await generateCopilotResponse(question, cityData as Record<string, unknown>, userRole);
      model = PROVIDER_REGISTRY.gemini.modelDisplayName;
    } else {
      if (!isProviderConfigured(resolvedProvider)) {
        return next(new AppError("This AI provider is currently unavailable.", 503));
      }
      try {
        const result = await intelligenceCenterAIGateway.generate(
          {
            prompt: buildCopilotPrompt(question, cityData as Record<string, unknown>, userRole),
            systemInstruction: SYSTEM_ENV_ANALYST,
          },
          resolvedProvider,
        );
        answer = result.text;
        model = PROVIDER_REGISTRY[resolvedProvider].modelDisplayName;
      } catch (err) {
        if (err instanceof AIProviderError) {
          const status =
            err.code === "rate_limit_error" ? 429 : err.code === "timeout_error" ? 504 : 503;
          return next(new AppError(err.message, status));
        }
        throw err;
      }
    }

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
        provider: resolvedProvider,
        model,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/copilot/providers ───────────────────────────────────────────────
// Metadata for the Assistant's model selector — only providers that are
// actually configured (have an API key set) are returned (Phase 2 §12).
// Gemini is included whenever its existing key is present, since it's
// always available as the default path above.
export async function getAIProviders(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const configured = getAvailableProviderConfigs();
    const geminiAvailable = Boolean(process.env.GEMINI_API_KEY);

    const providers = [
      {
        name: "gemini" as const,
        displayName: PROVIDER_REGISTRY.gemini.displayName,
        model: PROVIDER_REGISTRY.gemini.modelDisplayName,
        capabilities: PROVIDER_REGISTRY.gemini.capabilities,
        available: geminiAvailable,
      },
      ...configured
        .filter((c) => c.name !== "gemini")
        .map((c) => ({
          name: c.name,
          displayName: c.displayName,
          model: c.modelDisplayName,
          capabilities: c.capabilities,
          available: true,
        })),
    ];

    res.json({ success: true, data: { providers, default: "gemini" } });
  } catch (err) {
    next(err);
  }
}

// ─── Backward-compat alias for POST /api/copilot/ask ─────────────────────────
export const askCopilot = chat;

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

// ─── PHASE 5: GreenGuard Intelligence Center — POST /copilot/sustainability-chat ──
// Sustainability-exclusive: only src/components/sustainability/copilot-panel.tsx
// calls this. The generic /copilot/chat endpoint above (Feature 1) is left
// completely untouched since it's shared by Dashboard, Map, Forecast,
// Intelligence, and the standalone Copilot page.
//
// The critical fix here vs. the generic chat(): that handler builds its
// Gemini context from the RAW EnvironmentalData document (cityData.eco —
// the legacy, ingestion-time score). This handler instead runs the exact
// same computeEcoScore() engine the Sustainability page itself uses, so
// the Intelligence Center's EcoScore can never disagree with the Hero/
// breakdown shown on the page — the "EcoScore 71 vs 79" class of bug this
// phase is required to permanently eliminate.
const BREAKDOWN_LABELS: Record<keyof typeof ECO_SCORE_WEIGHTS, string> = {
  airQuality: "Air Quality",
  greenCover: "Green Cover",
  renewableEnergy: "Renewable Energy",
  waterQuality: "Water Quality",
  wasteDiversion: "Waste Diversion",
};

export async function sustainabilityChat(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question, cityId, sessionId } = req.body;
    if (!question?.trim()) return next(new AppError("Question is required", 400));

    const city = cityId || "belagavi";
    const cityData = await getCityData(city);
    if (!cityData) return next(new AppError("City data not found", 404));

    const ecoScore = computeEcoScore({
      aqi: cityData.aqi,
      water: cityData.water,
      greenCover: cityData.greenCover,
      renewableShare: cityData.renewableShare,
    });

    // Light, honest 7-day historical summary — reuses the exact same
    // aggregation and EcoScore methodology as Phase 4's chart (no second
    // implementation), and is simply omitted if there isn't enough real
    // data to summarize.
    let historicalSummary: SustainabilityAIContext["historicalSummary"];
    try {
      const days = await fetchCityHistoryDays(cityData.cityId, 7);
      if (days.length >= 2) {
        const first = days[0];
        const last = days[days.length - 1];
        historicalSummary = {
          rangeDays: 7,
          daysWithData: days.length,
          ecoScore: { previous: first.ecoScore, current: last.ecoScore },
          aqi: { previous: first.aqi.avg, current: last.aqi.avg },
          water: { previous: first.water, current: last.water },
          renewableShare:
            first.renewableShare != null && last.renewableShare != null
              ? { previous: first.renewableShare, current: last.renewableShare }
              : undefined,
        };
      }
    } catch {
      // Historical summary is a nice-to-have for grounding — if it fails
      // for any reason, continue with current-conditions-only context
      // rather than failing the whole request.
      historicalSummary = undefined;
    }

    const context: SustainabilityAIContext = {
      cityName: cityData.cityName,
      updatedAt: cityData.timestamp ? new Date(cityData.timestamp).toISOString() : undefined,
      ecoScore: ecoScore.score,
      ecoScoreGrade: ecoScore.grade,
      ecoScoreDataComplete: ecoScore.dataComplete,
      ecoScoreMissingMetrics: ecoScore.missingMetrics.map((m) => BREAKDOWN_LABELS[m]),
      ecoScoreBreakdown: (Object.keys(ecoScore.breakdown) as Array<keyof typeof ECO_SCORE_WEIGHTS>).map((k) => ({
        metric: BREAKDOWN_LABELS[k],
        normalizedScore: ecoScore.breakdown[k].normalizedScore,
        weight: ecoScore.breakdown[k].weight,
        available: ecoScore.breakdown[k].available,
      })),
      aqi: cityData.aqi,
      temp: cityData.temp,
      humidity: cityData.humidity,
      co2: cityData.co2,
      greenCover: cityData.greenCover,
      renewableShare: cityData.renewableShare,
      water: cityData.water,
      carbon: cityData.carbon,
      historicalSummary,
    };

    // Load recent conversation turns for this session (if any) so
    // follow-ups like "why?" resolve correctly — reuses the existing
    // AIConversation model/collection, no new conversation architecture.
    const sid = sessionId || uuidv4();
    const existing = sessionId ? await AIConversation.findOne({ sessionId }).lean() : null;
    const priorMessages = (existing?.messages ?? []).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    const answer = await generateSustainabilityIntelligenceResponse(question, context, priorMessages);

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
        // Echo back the exact authoritative values the answer was
        // grounded in, so the frontend can display them if useful —
        // always the same values as the rest of the Sustainability page.
        context: {
          ecoScore: ecoScore.score,
          ecoScoreGrade: ecoScore.grade,
          aqi: cityData.aqi,
          water: cityData.water,
          historicalSummaryIncluded: !!historicalSummary,
        },
        timestamp: new Date().toISOString(),
      },
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
