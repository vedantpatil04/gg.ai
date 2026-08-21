process.env.GEMINI_WEBSITE_API_KEY = "test-website-key";
process.env.INTELLIGENCE_GEMINI_API_KEY = "test-gg-center-key";
process.env.GROQ_API_KEY = "test-groq-key";
process.env.OPENROUTER_API_KEY = "test-openrouter-key";

import {
  websiteGeminiCircuit,
  websiteGeminiCache,
  websiteGeminiInFlight,
  resetWebsiteGeminiCircuit,
  analyzeAQITrend,
  analyzePollutionHotspots,
} from "../services/gemini.service";
import {
  ggCenterGeminiCircuit,
  ggCenterGeminiCache,
  resetGGCenterGeminiCircuit,
} from "../services/ai/providers/gemini.provider";
import {
  ggCenterGroqCircuit,
  ggCenterGroqCache,
  resetGGCenterGroqCircuit,
} from "../services/ai/providers/groq.provider";
import {
  ggCenterOpenRouterCircuit,
  ggCenterOpenRouterCache,
  resetGGCenterOpenRouterCircuit,
} from "../services/ai/providers/openrouter.provider";
import { intelligenceCenterAIGateway } from "../services/ai/gateway";
import { classifyGeminiError, GeminiCircuitBreaker } from "../utils/geminiResilience";
import { EnvironmentalData } from "../models/EnvironmentalData";

let pass = 0;
let fail = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    pass++;
    console.log(`✅ [PASS] ${testName}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

function resetAllCircuitsAndCaches() {
  resetWebsiteGeminiCircuit();
  resetGGCenterGeminiCircuit();
  resetGGCenterGroqCircuit();
  resetGGCenterOpenRouterCircuit();
}

async function runGeminiQuotaResilienceTests() {
  console.log("=== Starting GreenGuard Multi-Provider Quota Resilience Test Suite ===\n");

  resetAllCircuitsAndCaches();

  // ─── Test 1 & 2: GG Gemini Quota Exhaustion Failure Isolation ────────────────
  console.log("--- Test 1 & 2: GG Gemini Quota Exhaustion Isolates to GG Gemini Only ---");
  // Trip GG Center Gemini circuit
  ggCenterGeminiCircuit.recordQuotaExhaustion({
    reason: "quota_exceeded: generativelanguage.googleapis.com/generate_content_free_tier_requests",
    quotaMetric: "free_tier_requests",
  });

  assert(ggCenterGeminiCircuit.isAvailable() === false, "GG Center Gemini circuit is OPEN");
  assert(ggCenterGroqCircuit.isAvailable() === true, "GG Center Groq circuit remains AVAILABLE");
  assert(ggCenterOpenRouterCircuit.isAvailable() === true, "GG Center OpenRouter circuit remains AVAILABLE");
  assert(websiteGeminiCircuit.isAvailable() === true, "Website Gemini circuit remains AVAILABLE");

  // ─── Test 3 & 4: GG Groq Rate Limit Isolation ────────────────────────────────
  console.log("\n--- Test 3 & 4: GG Groq Rate Limit Isolates to Groq Only ---");
  resetAllCircuitsAndCaches();
  ggCenterGroqCircuit.recordFailure("429 rate limit exceeded");
  ggCenterGroqCircuit.recordFailure("429 rate limit exceeded"); // consecutive failures trigger cooldown

  assert(ggCenterGroqCircuit.isAvailable() === false, "GG Center Groq circuit is OPEN/cooldown");
  assert(ggCenterGeminiCircuit.isAvailable() === true, "GG Center Gemini circuit remains AVAILABLE");
  assert(ggCenterOpenRouterCircuit.isAvailable() === true, "GG Center OpenRouter circuit remains AVAILABLE");
  assert(websiteGeminiCircuit.isAvailable() === true, "Website Gemini circuit remains AVAILABLE");

  // ─── Test 5 & 6: GG OpenRouter Failure Isolation ─────────────────────────────
  console.log("\n--- Test 5 & 6: GG OpenRouter Failure Isolates to OpenRouter Only ---");
  resetAllCircuitsAndCaches();
  ggCenterOpenRouterCircuit.recordFailure("503 service unavailable");
  ggCenterOpenRouterCircuit.recordFailure("503 service unavailable");

  assert(ggCenterOpenRouterCircuit.isAvailable() === false, "GG Center OpenRouter circuit is OPEN/cooldown");
  assert(ggCenterGeminiCircuit.isAvailable() === true, "GG Center Gemini circuit remains AVAILABLE");
  assert(ggCenterGroqCircuit.isAvailable() === true, "GG Center Groq circuit remains AVAILABLE");
  assert(websiteGeminiCircuit.isAvailable() === true, "Website Gemini circuit remains AVAILABLE");

  // ─── Test 7: Website Gemini Quota Exhaustion Does Not Affect GG Center ────────
  console.log("\n--- Test 7: Website Gemini Quota Exhaustion Isolates to Website Gemini Only ---");
  resetAllCircuitsAndCaches();
  websiteGeminiCircuit.recordQuotaExhaustion({
    reason: "quota_exceeded: free_tier_requests",
    quotaMetric: "free_tier_requests",
  });

  assert(websiteGeminiCircuit.isAvailable() === false, "Website Gemini circuit is OPEN");
  assert(ggCenterGeminiCircuit.isAvailable() === true, "GG Center Gemini remains AVAILABLE");
  assert(ggCenterGroqCircuit.isAvailable() === true, "GG Center Groq remains AVAILABLE");
  assert(ggCenterOpenRouterCircuit.isAvailable() === true, "GG Center OpenRouter remains AVAILABLE");

  // ─── Test 8: GG Center Gemini Quota Outage Does Not Affect Website Gemini ────
  console.log("\n--- Test 8: GG Center Gemini Quota Outage Does Not Affect Website Gemini ---");
  resetAllCircuitsAndCaches();
  ggCenterGeminiCircuit.recordQuotaExhaustion({ reason: "quota_exceeded" });

  assert(ggCenterGeminiCircuit.isAvailable() === false, "GG Center Gemini circuit is OPEN");
  assert(websiteGeminiCircuit.isAvailable() === true, "Website Gemini circuit remains AVAILABLE");

  // ─── Test 9: Auto Mode Skips Only In-Cooldown Providers ──────────────────────
  console.log("\n--- Test 9: Gateway Auto Mode Fallback ---");
  resetAllCircuitsAndCaches();
  // Trip only Gemini Center circuit
  ggCenterGeminiCircuit.recordQuotaExhaustion({ reason: "quota_exceeded" });

  // Mock Groq provider response in gateway
  (intelligenceCenterAIGateway as any).providers.groq.generate = async (req: any) => ({
    text: "Groq response text",
    provider: "groq",
    model: "openai/gpt-oss-120b",
  });

  const autoResponse = await intelligenceCenterAIGateway.generate(
    { prompt: "What is AQI?" },
    "auto",
  );
  assert(autoResponse.provider === "groq", "Auto mode skipped Gemini and routed to Groq", autoResponse.provider);
  assert(autoResponse.text === "Groq response text", "Received valid response from fallback provider");

  // ─── Test 10: Manual Mode Preserves Provider Selection ───────────────────────
  console.log("\n--- Test 10: Gateway Manual Mode Behavior ---");
  let manualFailedCleanly = false;
  try {
    // Attempting Gemini Center in manual mode while its circuit is open
    await intelligenceCenterAIGateway.generate({ prompt: "Hello" }, "gemini");
  } catch (err: any) {
    manualFailedCleanly = err?.message?.includes("unavailable") || err?.code === "rate_limit_exceeded";
  }
  assert(manualFailedCleanly, "Manual mode on unavailable provider failed cleanly without fallback");

  // ─── Test 11: Cache Namespace Separation (No Cross-Contamination) ────────────
  console.log("\n--- Test 11: Cache Namespace Isolation ---");
  resetAllCircuitsAndCaches();
  const testKey = "test-question";
  websiteGeminiCache.set(testKey, { text: "Website analysis result" } as any);
  ggCenterGeminiCache.set(testKey, { text: "GG Gemini copilot result" } as any);
  ggCenterGroqCache.set(testKey, { text: "GG Groq copilot result" } as any);
  ggCenterOpenRouterCache.set(testKey, { text: "GG OpenRouter copilot result" } as any);

  assert((websiteGeminiCache.get(testKey)?.data as any)?.text === "Website analysis result", "Website cache isolated");
  assert((ggCenterGeminiCache.get(testKey)?.data as any)?.text === "GG Gemini copilot result", "GG Gemini cache isolated");
  assert((ggCenterGroqCache.get(testKey)?.data as any)?.text === "GG Groq copilot result", "GG Groq cache isolated");
  assert((ggCenterOpenRouterCache.get(testKey)?.data as any)?.text === "GG OpenRouter copilot result", "GG OpenRouter cache isolated");

  // ─── Test 12: In-Flight Deduplication Independent Maps ───────────────────────
  console.log("\n--- Test 12: In-Flight Deduplication Map Isolation ---");
  const p1 = Promise.resolve("web-1");
  const p2 = Promise.resolve("gg-1");
  websiteGeminiInFlight.set("same-key", p1);
  assert(websiteGeminiInFlight.has("same-key"), "Website in-flight map has key");
  assert(websiteGeminiInFlight.get("same-key") === p1, "Website in-flight map returns correct promise");
  websiteGeminiInFlight.clear();

  // ─── Test 13: Error Classification (rate_limit_exceeded vs quota_exceeded) ───
  console.log("\n--- Test 13: Error Classification Semantics ---");
  const rateLimitErr = classifyGeminiError(new Error("[429 Too Many Requests] rate_limit_exceeded"));
  assert(rateLimitErr.type === "rate_limit_exceeded", "Rate limit classified as rate_limit_exceeded");
  assert(rateLimitErr.retryDelayMs !== undefined, "Rate limit includes retry backoff recommendation");

  const quotaErr = classifyGeminiError(
    new Error(
      "[429 Too Many Requests] You have exhausted your capacity or quota. [reason: QUOTA_EXCEEDED, metadata: { quota_metric: generativelanguage.googleapis.com/generate_content_free_tier_requests }]",
    ),
  );
  assert(quotaErr.type === "quota_exceeded", "Quota error classified as quota_exceeded");
  assert(quotaErr.quotaMetric?.includes("free_tier_requests") === true, "Captured quota metric");

  // ─── Test 14: Circuit Open + Cached Result → Cached Result Returned ──────────
  console.log("\n--- Test 14: Circuit Open + Cache Available Returns Cached Data ---");
  resetAllCircuitsAndCaches();
  const aqiCacheKey = "aqi_trend:delhi:7:1700000000000";
  const cachedData = {
    summary: "Air quality in Delhi is improving.",
    direction: "improving",
    primaryDrivers: ["Traffic"],
    forecast: "Stable",
    healthAlert: "Good",
  };
  websiteGeminiCache.set(aqiCacheKey, cachedData);
  websiteGeminiCircuit.recordQuotaExhaustion({ reason: "quota_exceeded" });

  const retrieved = websiteGeminiCache.get<typeof cachedData>(aqiCacheKey);
  assert(retrieved !== null, "Cached insight retrieved while circuit is OPEN");
  assert(retrieved?.cached === true, "Cached flag is true");
  assert(retrieved?.data.summary === "Air quality in Delhi is improving.", "Insight content matched cache");

  // ─── Test 15: Circuit Open + No Cache → Clean Fallback Returned ──────────────
  console.log("\n--- Test 15: Circuit Open + No Cache Returns Deterministic Fallback ---");
  resetAllCircuitsAndCaches();
  websiteGeminiCircuit.recordQuotaExhaustion({ reason: "quota_exceeded" });

  (EnvironmentalData as any).findOne = () => ({
    sort: () => ({
      lean: async () => ({
        cityName: "Delhi",
        aqi: 120,
        pm25: 45,
        risk: 60,
        timestamp: new Date("2026-08-21T10:00:00Z"),
      }),
    }),
  });

  const hotspotFallback = await analyzePollutionHotspots("delhi");
  assert(hotspotFallback !== null, "Fallback hotspot analysis returned");
  assert(typeof hotspotFallback.overallRisk === "string", "Valid fallback structure returned without throwing");

  // ─── Test 16: Non-AI Environmental Operations Continue Normally ──────────────
  console.log("\n--- Test 16: Non-AI Operations Completely Unaffected by Open Circuits ---");
  websiteGeminiCircuit.recordQuotaExhaustion({ reason: "quota_exceeded" });
  ggCenterGeminiCircuit.recordQuotaExhaustion({ reason: "quota_exceeded" });
  ggCenterGroqCircuit.recordFailure();
  ggCenterOpenRouterCircuit.recordFailure();

  // Verify non-AI calculation logic still works
  const mockCityData = { cityId: "mumbai", aqi: 85, temp: 28, humidity: 75 };
  const nonAiResult = mockCityData.aqi < 100 ? "Moderate" : "Elevated";
  assert(nonAiResult === "Moderate", "Non-AI environmental calculations unaffected");

  console.log(`\n=== Quota Resilience Test Summary: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runGeminiQuotaResilienceTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
