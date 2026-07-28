/**
 * Manual verification harness for the Phase 1.4 security fix to
 * authenticate() (middleware/auth.ts).
 *
 * Bug being verified fixed: previously, authenticate() only checked
 * `user.isActive`, not `user.approvalStatus`. login() and refreshToken()
 * already refused to *issue* a token to a non-approved Authority, but an
 * access token issued *while approved* kept working on every other
 * endpoint for the rest of its lifetime even after the account was later
 * rejected (or reset to pending) — because authenticate() never re-checked
 * approval status on the requests in between.
 *
 * This is NOT part of the delivered feature — a throwaway script, no live
 * MongoDB needed (Mongoose is mocked). Run with:
 *   npx ts-node src/__manual_test__/authenticate-middleware.test.ts
 */
process.env.JWT_SECRET = "test-secret";

import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authenticate, type AuthRequest } from "../middleware/auth";
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

function makeReq(userId: string): AuthRequest {
  const token = jwt.sign({ id: userId, role: "authority" }, process.env.JWT_SECRET!);
  return { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
}

function makeUserDoc(overrides: Record<string, unknown>) {
  return {
    _id: { toString: () => "507f1f77bcf86cd799439055" },
    role: "authority",
    approvalStatus: "approved",
    isActive: true,
    ...overrides,
  };
}

// authenticate() calls next() via a jwt.verify callback, so wrap it in a
// Promise to await completion in each test.
function runAuthenticate(req: AuthRequest): Promise<{ err: unknown; user: unknown }> {
  return new Promise((resolve) => {
    authenticate(req, {} as any, (err?: unknown) => {
      resolve({ err: err ?? null, user: req.user });
    });
  });
}

async function run() {
  // ── 1. The loophole scenario: token was valid, account since rejected ───
  {
    console.log("\n[1] authenticate() blocks a live token for a since-rejected Authority");
    (User as any).findById = () => ({
      select: async () => makeUserDoc({ approvalStatus: "rejected" }),
    });

    const req = makeReq("507f1f77bcf86cd799439055");
    const { err, user } = await runAuthenticate(req);

    assert(err instanceof AppError, "next() called with an AppError");
    assert(
      (err as AppError)?.statusCode === 403,
      `status code is 403 (got ${(err as AppError)?.statusCode})`,
    );
    assert(user === undefined, "req.user was NOT set");
  }

  // ── 2. Same scenario, but reset to pending instead of rejected ──────────
  {
    console.log("\n[2] authenticate() blocks a live token for an Authority reset to pending");
    (User as any).findById = () => ({
      select: async () => makeUserDoc({ approvalStatus: "pending" }),
    });

    const req = makeReq("507f1f77bcf86cd799439055");
    const { err } = await runAuthenticate(req);

    assert(err instanceof AppError, "next() called with an AppError");
    assert(
      (err as AppError)?.statusCode === 403,
      `status code is 403 (got ${(err as AppError)?.statusCode})`,
    );
  }

  // ── 3. Approved Authority still works normally ───────────────────────────
  {
    console.log("\n[3] authenticate() still allows an approved Authority through");
    (User as any).findById = () => ({
      select: async () => makeUserDoc({ approvalStatus: "approved" }),
    });

    const req = makeReq("507f1f77bcf86cd799439055");
    const { err, user } = await runAuthenticate(req);

    assert(err === null, "no error passed to next()");
    assert(!!user, "req.user was set");
  }

  // ── 4. Citizen is never affected by this check, regardless of the field ─
  {
    console.log("\n[4] authenticate() never blocks a Citizen on approvalStatus");
    (User as any).findById = () => ({
      select: async () => makeUserDoc({ role: "citizen", approvalStatus: "rejected" }),
    });

    const req = makeReq("507f1f77bcf86cd799439055");
    const { err, user } = await runAuthenticate(req);

    assert(err === null, "no error passed to next() (citizen unaffected)");
    assert(!!user, "req.user was set");
  }

  // ── 5. Deactivated user is still blocked (pre-existing check untouched) ─
  {
    console.log(
      "\n[5] authenticate() still blocks a deactivated user (pre-existing behavior preserved)",
    );
    (User as any).findById = () => ({ select: async () => null });

    const req = makeReq("507f1f77bcf86cd799439055");
    const { err } = await runAuthenticate(req);

    assert(err instanceof AppError, "next() called with an AppError");
    assert(
      (err as AppError)?.statusCode === 401,
      `status code is 401 (got ${(err as AppError)?.statusCode})`,
    );
  }

  console.log(`\n──────────────────────────────\n${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

run();
