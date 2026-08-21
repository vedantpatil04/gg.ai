process.env.JWT_SECRET = "test-secret-key-123";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-456";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

import jwt from "jsonwebtoken";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { errorHandler, AppError } from "../middleware/errorHandler";
import { User } from "../models/User";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../services/jwt.service";
import { refreshToken as refreshTokenHandler } from "../controllers/auth.controller";
import { Session } from "../models/Session";

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

function makeUser(overrides: Record<string, unknown> = {}) {
  const userId = "507f1f77bcf86cd799439011";
  return {
    _id: { toString: () => userId },
    name: "Test User",
    email: "test@greenguard.ai",
    role: "citizen",
    approvalStatus: "approved",
    isActive: true,
    refreshTokens: [] as string[],
    ...overrides,
  };
}

function runAuthenticate(req: AuthRequest): Promise<{ err: unknown; user: unknown }> {
  return new Promise((resolve) => {
    authenticate(req, {} as any, (err?: unknown) => {
      resolve({ err: err ?? null, user: req.user });
    });
  });
}

function runErrorHandler(err: Error | AppError, req: any = {}): { statusCode: number; body: any } {
  let statusCode = 0;
  let body: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      body = data;
      return this;
    },
  };
  errorHandler(err, req, res, () => {});
  return { statusCode, body };
}

async function runAuthTokenRefreshTests() {
  console.log("=== Starting GreenGuard Authentication & Token Refresh Test Suite ===\n");

  const mockUser = makeUser();

  // ─── Test 1: Valid access token → request succeeds ──────────────────────────
  console.log("--- Test 1: Valid Access Token Authentication ---");
  (User as any).findById = () => ({
    select: async () => mockUser,
  });

  const validToken = generateAccessToken(mockUser as any);
  const validReq: AuthRequest = {
    headers: { authorization: `Bearer ${validToken}` },
  } as AuthRequest;

  const validResult = await runAuthenticate(validReq);
  assert(validResult.err === null, "Valid access token accepted without error");
  assert(validResult.user !== undefined, "req.user populated for valid access token");

  // ─── Test 2: Expired access token → backend rejects with 401 TokenExpiredError
  console.log("\n--- Test 2: Expired Access Token Strictly Rejected by Backend ---");
  const expiredToken = jwt.sign(
    { id: mockUser._id.toString(), role: "citizen", email: mockUser.email },
    process.env.JWT_SECRET!,
    { expiresIn: "-1s" }, // already expired
  );

  const expiredReq: AuthRequest = {
    headers: { authorization: `Bearer ${expiredToken}` },
  } as AuthRequest;

  const expiredResult = await runAuthenticate(expiredReq);
  assert(expiredResult.err !== null, "Expired token rejected by authenticate middleware");
  assert((expiredResult.err as Error)?.name === "TokenExpiredError", "Error is specifically TokenExpiredError");
  assert(expiredResult.user === undefined, "req.user is undefined for expired token");

  // ─── Test 3: Error handler formats expected TokenExpiredError cleanly ─────────
  console.log("\n--- Test 3: Error Handler Handles Expected Token Expiration Cleanly ---");
  const expiredJwtError = new jwt.TokenExpiredError("jwt expired", new Date());
  const errorResponse = runErrorHandler(expiredJwtError);

  assert(errorResponse.statusCode === 401, "Status code is 401 Unauthorized");
  assert(errorResponse.body?.success === false, "Response body success is false");
  assert(errorResponse.body?.message === "Token expired", "Response body message is 'Token expired'");
  assert(errorResponse.body?.stack === undefined, "Stack trace omitted for expected token expiration");

  // ─── Test 4: Invalid JWT signature → remains genuine 401 failure ─────────────
  console.log("\n--- Test 4: Invalid JWT Signature Rejection ---");
  const forgedToken = jwt.sign(
    { id: mockUser._id.toString(), role: "citizen", email: mockUser.email },
    "wrong-secret-key",
  );
  const forgedReq: AuthRequest = {
    headers: { authorization: `Bearer ${forgedToken}` },
  } as AuthRequest;

  const forgedResult = await runAuthenticate(forgedReq);
  assert(forgedResult.err !== null, "Forged signature token rejected");
  assert((forgedResult.err as Error)?.name === "JsonWebTokenError", "Error is JsonWebTokenError");

  const forgedErrorResponse = runErrorHandler(forgedResult.err as Error);
  assert(forgedErrorResponse.statusCode === 401, "Status code is 401");
  assert(forgedErrorResponse.body?.message === "Invalid token", "Error message is 'Invalid token'");

  // ─── Test 5: Valid refresh token rotation ────────────────────────────────────
  console.log("\n--- Test 5: Valid Refresh Token Rotation ---");
  const initialRefreshToken = generateRefreshToken(mockUser as any, "session-123");
  const userWithToken = makeUser({ refreshTokens: [initialRefreshToken] });

  (User as any).findById = () => ({
    select: async () => userWithToken,
  });
  (User as any).findByIdAndUpdate = async (_id: any, update: any) => {
    if (update.refreshTokens) userWithToken.refreshTokens = update.refreshTokens;
    return userWithToken;
  };
  (Session as any).findOne = () => ({
    select: async () => ({ revoked: false }),
  });

  let refreshStatusCode = 0;
  let refreshResponseBody: any = null;
  const refreshReq: any = {
    body: { refreshToken: initialRefreshToken },
    ip: "127.0.0.1",
    headers: { "user-agent": "test-agent" },
  };
  const refreshRes: any = {
    status(code: number) {
      refreshStatusCode = code;
      return this;
    },
    json(data: any) {
      refreshResponseBody = data;
      return this;
    },
  };

  await refreshTokenHandler(refreshReq, refreshRes, (err: any) => {
    if (err) {
      const errRes = runErrorHandler(err);
      refreshStatusCode = errRes.statusCode;
      refreshResponseBody = errRes.body;
    }
  });

  assert(refreshResponseBody?.success === true, "Refresh token endpoint succeeded");
  assert(typeof refreshResponseBody?.data?.accessToken === "string", "New access token returned");
  assert(typeof refreshResponseBody?.data?.refreshToken === "string", "New rotated refresh token returned");
  assert(refreshResponseBody?.data?.refreshToken !== initialRefreshToken, "Refresh token was rotated");

  // ─── Test 6: Invalid / Revoked refresh token rejected ────────────────────────
  console.log("\n--- Test 6: Invalid / Revoked Refresh Token Rejection ---");
  let invalidRefreshStatus = 0;
  let invalidRefreshBody: any = null;
  const invalidRefreshReq: any = {
    body: { refreshToken: "invalid.refresh.token" },
  };
  const invalidRefreshRes: any = {
    status(code: number) {
      invalidRefreshStatus = code;
      return this;
    },
    json(data: any) {
      invalidRefreshBody = data;
      return this;
    },
  };

  await refreshTokenHandler(invalidRefreshReq, invalidRefreshRes, (err: any) => {
    if (err) {
      const errRes = runErrorHandler(err);
      invalidRefreshStatus = errRes.statusCode;
      invalidRefreshBody = errRes.body;
    }
  });

  assert(invalidRefreshStatus === 401, "Invalid refresh token rejected with 401");
  assert(invalidRefreshBody?.message === "Invalid refresh token", "Appropriate error message returned");

  // ─── Test 7: Frontend Queue Simulation (Single Refresh for Multiple 401s) ────
  console.log("\n--- Test 7: Frontend Refresh Queue & Single Refresh Verification ---");
  let refreshCalls = 0;
  let isRefreshing = false;
  let queue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

  async function mockDoRefresh(): Promise<string> {
    refreshCalls++;
    await new Promise((r) => setTimeout(r, 20));
    return "new-access-token-xyz";
  }

  async function handle401Request(requestId: string): Promise<string> {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => resolve(`Request ${requestId} resolved with ${token}`),
          reject: (err) => reject(err),
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await mockDoRefresh();
      const currentQueue = queue;
      queue = [];
      currentQueue.forEach((item) => item.resolve(newToken));
      return `Request ${requestId} resolved with ${newToken}`;
    } finally {
      isRefreshing = false;
    }
  }

  // Fire 5 requests simultaneously
  const results = await Promise.all([
    handle401Request("A"),
    handle401Request("B"),
    handle401Request("C"),
    handle401Request("D"),
    handle401Request("E"),
  ]);

  assert(refreshCalls === 1, "Exactly 1 refresh network call was made for 5 concurrent 401 requests");
  assert(results.length === 5, "All 5 concurrent requests resolved successfully");
  assert(results.every((r) => r.includes("new-access-token-xyz")), "All requests received the new access token");

  console.log(`\n=== Authentication & Refresh Test Summary: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuthTokenRefreshTests().catch((err) => {
  console.error("Auth test failed:", err);
  process.exit(1);
});
