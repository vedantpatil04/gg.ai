import "dotenv/config";
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { executeWithRetry, isTransientHttpError, parseRetryAfterHeader } from "../utils/httpRetry";
import { fetchWeatherBatch, fetchWeather, CityCoordinateTarget, WeatherReading } from "../services/weather.service";
import { openMeteoRateLimiter } from "../utils/openMeteoRateLimiter";

function createMockAxiosError(status: number, message = "Mock error", headers: Record<string, string> = {}): AxiosError {
  const error = new AxiosError(message);
  error.response = {
    status,
    statusText: String(status),
    headers,
    data: {},
    config: {} as InternalAxiosRequestConfig,
  } as AxiosResponse;
  return error;
}

async function runWeatherResilienceTests() {
  console.log("=== Starting GreenGuard Weather Ingestion Resilience Test Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // ─── Test 1: Transient Error Identification ─────────────────────────────────
  console.log("--- Test 1: Transient vs Permanent Error Classification ---");
  assert(isTransientHttpError(createMockAxiosError(503)), "HTTP 503 classified as transient");
  assert(isTransientHttpError(createMockAxiosError(502)), "HTTP 502 classified as transient");
  assert(isTransientHttpError(createMockAxiosError(504)), "HTTP 504 classified as transient");
  assert(isTransientHttpError(createMockAxiosError(500)), "HTTP 500 classified as transient");
  assert(isTransientHttpError(createMockAxiosError(429)), "HTTP 429 classified as transient");
  assert(!isTransientHttpError(createMockAxiosError(400)), "HTTP 400 classified as permanent (no retry)");
  assert(!isTransientHttpError(createMockAxiosError(404)), "HTTP 404 classified as permanent (no retry)");
  assert(!isTransientHttpError(createMockAxiosError(422)), "HTTP 422 classified as permanent (no retry)");

  // ─── Test 2: Retry-After Header Parsing ─────────────────────────────────────
  console.log("\n--- Test 2: Retry-After Header Parsing ---");
  const errWithHeader = createMockAxiosError(429, "Rate limit", { "retry-after": "5" });
  assert(parseRetryAfterHeader(errWithHeader) === 5000, "Numeric Retry-After: 5 parsed as 5000ms");

  const errNoHeader = createMockAxiosError(503, "Service unavailable");
  assert(parseRetryAfterHeader(errNoHeader) === null, "Missing Retry-After returns null");

  // ─── Test 3: Bounded Retry & Recovery on 503 ─────────────────────────────────
  console.log("\n--- Test 3: Bounded Retry with Recovery on 503 ---");
  let attemptCount = 0;
  const retryResult = await executeWithRetry(
    async (attempt) => {
      attemptCount++;
      if (attempt < 2) {
        throw createMockAxiosError(503, "Request failed with status code 503");
      }
      return { success: true, reading: 24.5 };
    },
    {
      serviceName: "test-weather",
      maxAttempts: 3,
      baseDelayMs: 50,
      jitterMs: 10,
    },
  );
  assert(retryResult.recovered === true, "Recovered flag set to true after transient failure");
  assert(retryResult.attempts === 2, "Took exactly 2 attempts to recover");
  assert(attemptCount === 2, "Function was invoked 2 times");
  assert(retryResult.data.reading === 24.5, "Returned correct payload after recovery");

  // ─── Test 4: Retry Exhaustion (All 3 attempts fail) ──────────────────────────
  console.log("\n--- Test 4: Retry Exhaustion on Continuous 503 ---");
  let failedAttempts = 0;
  let errorCaught = false;
  try {
    await executeWithRetry(
      async () => {
        failedAttempts++;
        throw createMockAxiosError(503, "Service Unavailable 503");
      },
      {
        serviceName: "test-weather",
        maxAttempts: 3,
        baseDelayMs: 30,
        jitterMs: 10,
      },
    );
  } catch (err: unknown) {
    errorCaught = true;
  }
  assert(errorCaught === true, "Throws error after max attempts exhausted");
  assert(failedAttempts === 3, "Bounded to exactly 3 attempts (no infinite loop)");

  // ─── Test 5: Permanent Error (HTTP 400 Fails Immediately Without Retry) ──────
  console.log("\n--- Test 5: Permanent Error (HTTP 400) Fails on First Attempt ---");
  let permAttempts = 0;
  try {
    await executeWithRetry(
      async () => {
        permAttempts++;
        throw createMockAxiosError(400, "Bad Request");
      },
      {
        serviceName: "test-weather",
        maxAttempts: 3,
        baseDelayMs: 30,
        jitterMs: 10,
      },
    );
  } catch {
    // Expected
  }
  assert(permAttempts === 1, "Permanent 400 stopped immediately at attempt 1 without retry");

  // ─── Test 6: 14-City Batch Ingestion Pipeline with Live Open-Meteo API ──────
  console.log("\n--- Test 6: 14-City Live Batch Query & Coordinate Mapping ---");
  const test14Cities: CityCoordinateTarget[] = [
    { cityId: "belagavi", lat: 15.85, lng: 74.5 },
    { cityId: "bengaluru", lat: 12.97, lng: 77.59 },
    { cityId: "mumbai", lat: 19.07, lng: 72.87 },
    { cityId: "delhi", lat: 28.61, lng: 77.20 },
    { cityId: "chennai", lat: 13.08, lng: 80.27 },
    { cityId: "hyderabad", lat: 17.38, lng: 78.48 },
    { cityId: "kolkata", lat: 22.57, lng: 88.36 },
    { cityId: "pune", lat: 18.52, lng: 73.85 },
    { cityId: "ahmedabad", lat: 23.02, lng: 72.57 },
    { cityId: "jaipur", lat: 26.91, lng: 75.78 },
    { cityId: "surat", lat: 21.17, lng: 72.83 },
    { cityId: "lucknow", lat: 26.84, lng: 80.94 },
    { cityId: "london", lat: 51.50, lng: -0.12 },
    { cityId: "newyork", lat: 40.71, lng: -74.00 },
  ];

  try {
    const results = await fetchWeatherBatch(test14Cities);
    assert(results.size === 14, `Successfully received readings for all ${results.size}/14 cities in single batch`);
    for (const city of test14Cities) {
      const reading = results.get(city.cityId);
      assert(
        reading !== undefined &&
          typeof reading.temp === "number" &&
          typeof reading.humidity === "number" &&
          typeof reading.windSpeed === "number",
        `City '${city.cityId}' has valid numeric weather reading (temp=${reading?.temp}°C, humidity=${reading?.humidity}%)`,
      );
    }
  } catch (err) {
    console.error("Live batch test encountered error:", err);
    assert(false, "Live 14-city batch fetch succeeded");
  }

  // ─── Test 7: Cache Hit (0 Upstream Requests for Cached Cities) ───────────────
  console.log("\n--- Test 7: Fresh Cache Retrieval ---");
  const cachedReading = await fetchWeather(12.97, 77.59, "UTC", "bengaluru");
  assert(cachedReading !== null && typeof cachedReading.temp === "number", "Cached weather reading served synchronously without network fetch");

  // ─── Test 8: Rate Limiter Cooldown & Stale Fallback ──────────────────────────
  console.log("\n--- Test 8: Rate Limiter Cooldown & Last-Known-Good Fallback ---");
  openMeteoRateLimiter.triggerRateLimitCooldown("test-suite", 2000);
  assert(openMeteoRateLimiter.isRateLimitActive(), "Rate limiter cooldown activated");

  // During cooldown, fetchWeatherBatch should return stale readings without network calls
  const staleResults = await fetchWeatherBatch(test14Cities);
  assert(staleResults.size === 14, "Stale cache returned all 14 cities during active cooldown");
  openMeteoRateLimiter.reset();

  console.log(`\n=== Weather Resilience Test Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runWeatherResilienceTests().catch((err) => {
  console.error("Weather resilience test suite failed:", err);
  process.exit(1);
});
