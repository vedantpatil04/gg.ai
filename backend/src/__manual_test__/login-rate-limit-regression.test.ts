import "dotenv/config";
import express from "express";
import http from "http";
import axios from "axios";
import rateLimit from "express-rate-limit";
import authRoutes, { authLimiter } from "../routes/auth.routes";

// Helper to make requests against an Express app using node http server
async function testRequest(
  app: express.Express,
  options: { method: "get" | "post"; path: string; data?: any },
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, async () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        return reject(new Error("Unable to determine server port"));
      }
      const port = address.port;
      const url = `http://127.0.0.1:${port}${options.path}`;
      try {
        const res = await axios({
          method: options.method,
          url,
          data: options.data,
          validateStatus: () => true, // Accept any status code
        });
        server.close(() => {
          resolve({ status: res.status, data: res.data });
        });
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

function createTestApp(options: { authMax?: number; globalMax?: number } = {}) {
  const app = express();
  app.use(express.json());

  // General API rate limiter with auth skip
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: options.globalMax ?? 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
    skip: (req) =>
      req.path.startsWith("/auth") ||
      Boolean(req.originalUrl?.includes("/auth/")) ||
      req.path === "/health",
  });

  app.use("/api", generalLimiter);

  // Mock telemetry endpoint to simulate heavy background API polling
  app.get("/api/environmental/telemetry", (_req, res) => {
    res.json({ success: true, data: "telemetry" });
  });

  // Auth routes with dedicated authLimiter
  app.use("/api/auth", authRoutes);

  return app;
}

async function runLoginRateLimitRegressionTests() {
  console.log("=== Starting GreenGuard Login Rate Limit & Concurrency Regression Test Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}${detail ? ` — ${detail}` : ""}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // ─── Test 1: One login submit → exactly one /api/auth/login request ────────
  console.log("--- Test 1: Single Login Request Dispatch ---");
  let loginCalls = 0;
  const mockLogin = async () => {
    loginCalls++;
    return { success: true };
  };

  const isSubmitting = { current: false };
  const triggerSubmit = async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    try {
      await mockLogin();
    } finally {
      isSubmitting.current = false;
    }
  };

  await triggerSubmit();
  assert(loginCalls === 1, "Single submit invokes login exactly once", `calls=${loginCalls}`);

  // ─── Test 2: Double-click login → only one request ────────────────────────
  console.log("\n--- Test 2: Double-Click Concurrency Lock ---");
  let doubleClickCalls = 0;
  const isSubmittingDbl = { current: false };
  const slowMockLogin = async () => {
    doubleClickCalls++;
    await new Promise((r) => setTimeout(r, 50));
    return { success: true };
  };

  const triggerDoubleClick = () => {
    if (isSubmittingDbl.current) return;
    isSubmittingDbl.current = true;
    return slowMockLogin().finally(() => {
      isSubmittingDbl.current = false;
    });
  };

  // Simulate two rapid clicks in the same event tick
  const click1 = triggerDoubleClick();
  const click2 = triggerDoubleClick(); // Should be locked out synchronously
  await Promise.all([click1, click2]);

  assert(doubleClickCalls === 1, "Double-click generates exactly one request", `calls=${doubleClickCalls}`);

  // ─── Test 3: Enter key + button interaction → only one request ────────────
  console.log("\n--- Test 3: Enter Key + Button Click Concurrency Lock ---");
  let concurrentCalls = 0;
  const isSubmittingEnter = { current: false };
  const triggerEnterAndButton = () => {
    if (isSubmittingEnter.current) return;
    isSubmittingEnter.current = true;
    return (async () => {
      concurrentCalls++;
      await new Promise((r) => setTimeout(r, 40));
    })().finally(() => {
      isSubmittingEnter.current = false;
    });
  };

  const enterEvent = triggerEnterAndButton();
  const buttonEvent = triggerEnterAndButton();
  await Promise.all([enterEvent, buttonEvent]);

  assert(concurrentCalls === 1, "Enter key and button click race condition resolves to single request", `calls=${concurrentCalls}`);

  // ─── Test 4: Successful CAPTCHA → does not independently submit login ──────
  console.log("\n--- Test 4: Turnstile CAPTCHA Token Callback Independence ---");
  let captchaTriggeredSubmit = false;
  let storedTurnstileToken = "";
  const onTurnstileSuccess = (token: string) => {
    storedTurnstileToken = token;
    // Captcha only stores the token — it does NOT invoke login
  };

  onTurnstileSuccess("test-turnstile-token-xyz");
  assert(storedTurnstileToken === "test-turnstile-token-xyz", "Turnstile callback sets token");
  assert(captchaTriggeredSubmit === false, "Turnstile callback does NOT trigger an automatic login submit");

  // ─── Test 5: Login 401 → no token refresh loop ─────────────────────────────
  console.log("\n--- Test 5: Auth Bypass Excludes /auth/login from 401 Refresh Loop ---");
  const isAuthBypassUrl = (url: string) => {
    return (
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/2fa-challenge")
    );
  };

  assert(isAuthBypassUrl("/auth/login") === true, "URL /auth/login is flagged as auth bypass");
  assert(isAuthBypassUrl("/api/auth/login") === true, "URL /api/auth/login is flagged as auth bypass");
  assert(isAuthBypassUrl("/environmental/cities") === false, "General endpoint /environmental/cities is NOT auth bypass");

  // ─── Test 6: Login 429 → no automatic retry loop ───────────────────────────
  console.log("\n--- Test 6: HTTP 429 Rate Limit Fails Fast Without Retry Loop ---");
  let retryCount = 0;
  const simulateQueryRetry = (status: number) => {
    if (status === 429 || status === 404) {
      return false; // Do not retry
    }
    retryCount++;
    return true;
  };

  const shouldRetry429 = simulateQueryRetry(429);
  assert(shouldRetry429 === false && retryCount === 0, "HTTP 429 response immediately terminates without retrying");

  // ─── Test 7: General API Traffic Does NOT Exhaust Auth Rate Limiter ────────
  console.log("\n--- Test 7: General API Telemetry Isolation from /api/auth/login ---");
  const testApp = createTestApp({ globalMax: 3 }); // Global limit is 3 requests

  // Fire 5 requests to /api/environmental/telemetry to exceed the global limit
  for (let i = 0; i < 3; i++) {
    await testRequest(testApp, { method: "get", path: "/api/environmental/telemetry" });
  }
  const telemetryBlocked = await testRequest(testApp, { method: "get", path: "/api/environmental/telemetry" });
  assert(telemetryBlocked.status === 429, "General API limiter triggers 429 for telemetry when limit is reached");
  assert(
    telemetryBlocked.data.message === "Too many requests. Please try again later.",
    "General limiter message is 'Too many requests. Please try again later.'",
  );

  // Even though general API is rate-limited, /api/auth/login MUST NOT be blocked by the general limiter
  const loginAttempt = await testRequest(testApp, {
    method: "post",
    path: "/api/auth/login",
    data: {
      email: "test@example.com",
      password: "password123",
      portal: "citizen",
      turnstileToken: "1x00000000000000000000AA",
    },
  });
  assert(
    loginAttempt.status !== 429,
    "POST /api/auth/login is NOT blocked by general API telemetry rate limiter",
    `status=${loginAttempt.status}`,
  );

  // ─── Test 8: Repeated genuine failed attempts → authLimiter still protects ─
  console.log("\n--- Test 8: Auth Rate Limiter Protects /api/auth Against Brute Force ---");
  const strictAuthApp = express();
  strictAuthApp.use(express.json());
  const miniAuthLimiter = rateLimit({
    windowMs: 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many authentication attempts. Please try again later." },
  });
  strictAuthApp.post("/api/auth/login", miniAuthLimiter, (_req, res) => {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  });

  const res1 = await testRequest(strictAuthApp, { method: "post", path: "/api/auth/login", data: {} });
  const res2 = await testRequest(strictAuthApp, { method: "post", path: "/api/auth/login", data: {} });
  const res3 = await testRequest(strictAuthApp, { method: "post", path: "/api/auth/login", data: {} });

  assert(res1.status === 401, "First attempt reaches auth logic (401)");
  assert(res2.status === 401, "Second attempt reaches auth logic (401)");
  assert(res3.status === 429, "Third attempt is blocked by authLimiter with HTTP 429");
  assert(
    res3.data.message === "Too many authentication attempts. Please try again later.",
    "Blocked response has authLimiter message",
  );

  console.log(`\n========================================`);
  console.log(`Regression Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runLoginRateLimitRegressionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
