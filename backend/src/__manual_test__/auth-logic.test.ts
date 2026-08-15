/**
 * Manual verification harness for Phase 1.1 auth changes.
 *
 * This is NOT part of the delivered feature — it's a throwaway script used to
 * exercise signup/login/refresh branch logic with the Mongoose layer mocked
 * out, since no live MongoDB is reachable in this sandbox. Run with:
 *   npx ts-node src/__manual_test__/auth-logic.test.ts
 */
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

import { User } from "../models/User";
import { signup, login, refreshToken as refreshTokenHandler } from "../controllers/auth.controller";
import { AppError } from "../middleware/errorHandler";

let pass = 0;
let fail = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${msg}`);
  } else {
    fail++;
    console.log(`  ❌ ${msg}`);
  }
}

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function makeUserDoc(overrides: Record<string, unknown>) {
  const base = {
    _id: { toString: () => "507f1f77bcf86cd799439011" },
    name: "Test User",
    email: "test@example.com",
    role: "citizen",
    password: "$2a$10$hashedpasswordhere1234567890",
    approvalStatus: "approved",
    isActive: true,
    refreshTokens: [] as string[],
    comparePassword: async () => true,
    toJSON() {
      const { password, refreshTokens, ...rest } = this as any;
      return rest;
    },
  };
  return { ...base, ...overrides };
}

async function run() {
  // ── 1. Signup blocks public administrator registration ──────────────────
  {
    console.log("\n[1] signup — public administrator registration is blocked");
    let createCalled = false;
    (User as any).create = async () => {
      createCalled = true;
      return makeUserDoc({});
    };
    (User as any).findOne = async () => null;

    const req: any = {
      body: { name: "Eve", email: "eve@example.com", password: "Passw0rd!", role: "administrator" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await signup(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 403, `status code is 403 (got ${caughtErr?.statusCode})`);
    assert(!createCalled, "User.create was NOT called");
  }

  // ── 2. Signup: authority goes pending, no tokens issued ──────────────────
  {
    console.log("\n[2] signup — authority registration is pending, no auto-login tokens");
    let createArgs: any = null;
    (User as any).create = async (args: any) => {
      createArgs = args;
      return makeUserDoc({ role: "authority", approvalStatus: "pending" });
    };
    (User as any).findOne = async () => null;
    (User as any).find = () => ({ select: () => ({ lean: async () => [] }) });
    (User as any).findByIdAndUpdate = async () => {
      throw new Error("should not be called for pending signup");
    };

    const req: any = {
      body: {
        name: "Auth Guy",
        email: "auth@example.com",
        password: "Passw0rd!",
        role: "authority",
        department: "pollution_control",
      },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await signup(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(
      createArgs?.approvalStatus === "pending",
      "User.create received approvalStatus: pending",
    );
    assert(res.statusCode === 201, "response status is 201");
    assert(res.body?.data?.accessToken === undefined, "no accessToken in response");
    assert(res.body?.data?.refreshToken === undefined, "no refreshToken in response");
  }

  // ── 3. Signup: citizen keeps existing immediate-activation behavior ─────
  {
    console.log("\n[3] signup — citizen still gets immediate tokens (backward compatible)");
    let updateCalled = false;
    (User as any).create = async () => makeUserDoc({ role: "citizen", approvalStatus: "approved" });
    (User as any).findOne = async () => null;
    (User as any).findByIdAndUpdate = async () => {
      updateCalled = true;
    };

    const req: any = {
      body: { name: "Citizen Guy", email: "citizen@example.com", password: "Passw0rd!" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await signup(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(res.statusCode === 201, "response status is 201");
    assert(typeof res.body?.data?.accessToken === "string", "accessToken present");
    assert(typeof res.body?.data?.refreshToken === "string", "refreshToken present");
    assert(updateCalled, "refresh token was persisted (findByIdAndUpdate called)");
  }

  // ── 3.5. Login: missing Turnstile token is blocked ──────────────────────
  {
    console.log("\n[3.5] login — missing Turnstile token is blocked");
    const req: any = {
      body: { email: "citizen@example.com", password: "Passw0rd!", portal: "citizen" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await login(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 400, `status code is 400 (got ${caughtErr?.statusCode})`);
  }

  // ── 4. Login: pending authority is blocked ───────────────────────────────
  {
    console.log("\n[4] login — pending authority cannot log in");
    (User as any).findOne = () => ({
      select: async () => makeUserDoc({ role: "authority", approvalStatus: "pending" }),
    });

    const req: any = {
      body: { email: "auth@example.com", password: "Passw0rd!", portal: "authority", turnstileToken: "test-token" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await login(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 403, `status code is 403 (got ${caughtErr?.statusCode})`);
    assert(res.body === undefined, "no tokens were ever written to the response");
  }

  // ── 5. Login: rejected authority is blocked ──────────────────────────────
  {
    console.log("\n[5] login — rejected authority cannot log in");
    (User as any).findOne = () => ({
      select: async () => makeUserDoc({ role: "authority", approvalStatus: "rejected" }),
    });

    const req: any = {
      body: { email: "auth@example.com", password: "Passw0rd!", portal: "authority", turnstileToken: "test-token" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await login(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 403, `status code is 403 (got ${caughtErr?.statusCode})`);
  }

  // ── 6. Login: approved authority succeeds ────────────────────────────────
  {
    console.log("\n[6] login — approved authority can log in normally");
    (User as any).findOne = () => ({
      select: async () => makeUserDoc({ role: "authority", approvalStatus: "approved" }),
    });
    (User as any).findByIdAndUpdate = async () => {};

    const req: any = {
      body: { email: "auth@example.com", password: "Passw0rd!", portal: "authority", turnstileToken: "test-token" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await login(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(typeof res.body?.data?.accessToken === "string", "accessToken issued");
  }

  // ── 7. Login: administrator is unaffected by the approval gate ──────────
  {
    console.log("\n[7] login — administrator login unaffected (existing behavior preserved)");
    (User as any).findOne = () => ({
      // Note: no approvalStatus set at all, simulating a pre-existing admin
      // document from before this field existed — schema default applies.
      select: async () => makeUserDoc({ role: "administrator", approvalStatus: "approved" }),
    });
    (User as any).findByIdAndUpdate = async () => {};

    const req: any = {
      body: { email: "admin@greenguard.ai", password: "Admin@123456", portal: "admin", turnstileToken: "test-token" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await login(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(typeof res.body?.data?.accessToken === "string", "accessToken issued");
  }

  // ── 8. Citizen login unaffected ──────────────────────────────────────────
  {
    console.log("\n[8] login — citizen login unaffected (existing behavior preserved)");
    (User as any).findOne = () => ({
      select: async () => makeUserDoc({ role: "citizen", approvalStatus: "approved" }),
    });
    (User as any).findByIdAndUpdate = async () => {};

    const req: any = {
      body: { email: "citizen@example.com", password: "Passw0rd!", portal: "citizen", turnstileToken: "test-token" },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await login(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(typeof res.body?.data?.accessToken === "string", "accessToken issued");
  }

  // ── 9. Refresh token: rejected authority can't extend a live session ────
  {
    console.log("\n[9] refresh — a since-rejected authority's old refresh token is now blocked");
    // verifyRefreshToken needs a real, validly-signed token — sign one using
    // the same secret the harness set above.
    const jwt = require("jsonwebtoken");
    const signedToken = jwt.sign(
      { id: "507f1f77bcf86cd799439011" },
      process.env.JWT_REFRESH_SECRET,
    );

    (User as any).findById = () => ({
      select: async () =>
        makeUserDoc({
          role: "authority",
          approvalStatus: "rejected",
          refreshTokens: [signedToken],
        }),
    });

    const req: any = { body: { refreshToken: signedToken } };
    const res = fakeRes();
    let caughtErr: any = null;
    await refreshTokenHandler(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 403, `status code is 403 (got ${caughtErr?.statusCode})`);
  }

  console.log(`\n──────────────────────────────\n${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

run();
