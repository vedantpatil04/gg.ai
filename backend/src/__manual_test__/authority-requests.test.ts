/**
 * Manual verification harness for Phase 1.3 authority approval workflow.
 *
 * This is NOT part of the delivered feature — it's a throwaway script used to
 * exercise list/detail/approve/reject branch logic with the Mongoose layer
 * mocked out, since no live MongoDB is reachable in this sandbox. Run with:
 *   npx ts-node src/__manual_test__/authority-requests.test.ts
 *
 * Authorization (JWT + authorize("administrator")) is NOT re-tested here —
 * it's enforced by the existing, unmodified admin.routes.ts middleware chain
 * (already covered by the app's own route wiring), not by anything new in
 * this phase.
 */
import {
  listAuthorityRequests,
  getAuthorityRequestDetails,
  approveAuthorityRequest,
  rejectAuthorityRequest,
} from "../controllers/admin.controller";
import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import type { AuthRequest } from "../middleware/auth";

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

function makeAuthorityDoc(overrides: Record<string, unknown>) {
  const base = {
    _id: { toString: () => "507f1f77bcf86cd799439099" },
    name: "Authority Person",
    email: "authority@example.com",
    role: "authority",
    approvalStatus: "pending",
    async save() {
      return this;
    },
    toJSON() {
      const { ...rest } = this as any;
      return rest;
    },
  };
  return { ...base, ...overrides };
}

async function run() {
  // ── 1. list — rejects an invalid status filter ──────────────────────────
  {
    console.log("\n[1] listAuthorityRequests — invalid status filter is rejected");
    const req: any = { query: { status: "bogus" } };
    const res = fakeRes();
    let caughtErr: any = null;
    await listAuthorityRequests(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 400, `status code is 400 (got ${caughtErr?.statusCode})`);
  }

  // ── 2. list — valid filter scopes query to role:authority + status ──────
  {
    console.log("\n[2] listAuthorityRequests — filters by role=authority and the given status");
    let capturedFilter: any = null;
    (User as any).find = (filter: any) => {
      capturedFilter = filter;
      return {
        sort: () => ({
          skip: () => ({ limit: () => ({ lean: async () => [makeAuthorityDoc({})] }) }),
        }),
      };
    };
    (User as any).countDocuments = async () => 1;

    const req: any = { query: { status: "pending" } };
    const res = fakeRes();
    let caughtErr: any = null;
    await listAuthorityRequests(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(capturedFilter?.role === "authority", "query filter scoped to role: authority");
    assert(
      capturedFilter?.approvalStatus === "pending",
      "query filter includes approvalStatus: pending",
    );
    assert(res.body?.data?.requests?.length === 1, "one request returned");
    assert(res.body?.data?.pagination?.total === 1, "pagination.total reflects count");
  }

  // ── 3. details — not found ───────────────────────────────────────────────
  {
    console.log("\n[3] getAuthorityRequestDetails — unknown id returns 404");
    (User as any).findOne = () => ({ lean: async () => null });

    const req: any = { params: { id: "507f1f77bcf86cd799439000" } };
    const res = fakeRes();
    let caughtErr: any = null;
    await getAuthorityRequestDetails(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 404, `status code is 404 (got ${caughtErr?.statusCode})`);
  }

  // ── 4. details — found ───────────────────────────────────────────────────
  {
    console.log("\n[4] getAuthorityRequestDetails — known authority id returns the record");
    (User as any).findOne = () => ({ lean: async () => makeAuthorityDoc({}) });

    const req: any = { params: { id: "507f1f77bcf86cd799439099" } };
    const res = fakeRes();
    let caughtErr: any = null;
    await getAuthorityRequestDetails(req, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(res.body?.data?.request?.email === "authority@example.com", "correct request returned");
  }

  // ── 5. approve — not found (covers non-authority ids too, since the ──────
  //      query itself is scoped to role: "authority") ──────────────────────
  {
    console.log("\n[5] approveAuthorityRequest — unknown/non-authority id returns 404");
    (User as any).findOne = async () => null;

    const req: any = {
      params: { id: "507f1f77bcf86cd799439000" },
      user: { _id: { toString: () => "admin1" } },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await approveAuthorityRequest(req as AuthRequest, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 404, `status code is 404 (got ${caughtErr?.statusCode})`);
  }

  // ── 6. approve — already approved is rejected ────────────────────────────
  {
    console.log("\n[6] approveAuthorityRequest — already-approved request cannot be re-approved");
    (User as any).findOne = async () => makeAuthorityDoc({ approvalStatus: "approved" });

    const req: any = {
      params: { id: "507f1f77bcf86cd799439099" },
      user: { _id: { toString: () => "admin1" } },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await approveAuthorityRequest(req as AuthRequest, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 409, `status code is 409 (got ${caughtErr?.statusCode})`);
  }

  // ── 7. approve — already rejected cannot be approved either ─────────────
  {
    console.log("\n[7] approveAuthorityRequest — a rejected request cannot be approved");
    (User as any).findOne = async () => makeAuthorityDoc({ approvalStatus: "rejected" });

    const req: any = {
      params: { id: "507f1f77bcf86cd799439099" },
      user: { _id: { toString: () => "admin1" } },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await approveAuthorityRequest(req as AuthRequest, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 409, `status code is 409 (got ${caughtErr?.statusCode})`);
  }

  // ── 8. approve — pending succeeds ────────────────────────────────────────
  {
    console.log("\n[8] approveAuthorityRequest — a pending request is approved");
    let savedStatus: string | null = null;
    const doc = makeAuthorityDoc({ approvalStatus: "pending" });
    doc.save = async function () {
      savedStatus = this.approvalStatus;
      return this;
    };
    (User as any).findOne = async () => doc;

    const req: any = {
      params: { id: "507f1f77bcf86cd799439099" },
      user: { _id: { toString: () => "admin1" } },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await approveAuthorityRequest(req as AuthRequest, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(savedStatus === "approved", "approvalStatus was set to 'approved' before save()");
    assert(
      res.body?.message === "Authority account approved successfully.",
      "exact success message returned",
    );
  }

  // ── 9. reject — already rejected is rejected ─────────────────────────────
  {
    console.log("\n[9] rejectAuthorityRequest — already-rejected request cannot be re-rejected");
    (User as any).findOne = async () => makeAuthorityDoc({ approvalStatus: "rejected" });

    const req: any = {
      params: { id: "507f1f77bcf86cd799439099" },
      user: { _id: { toString: () => "admin1" } },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await rejectAuthorityRequest(req as AuthRequest, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr instanceof AppError, "next() called with an AppError");
    assert(caughtErr?.statusCode === 409, `status code is 409 (got ${caughtErr?.statusCode})`);
  }

  // ── 10. reject — pending succeeds ────────────────────────────────────────
  {
    console.log("\n[10] rejectAuthorityRequest — a pending request is rejected");
    let savedStatus: string | null = null;
    const doc = makeAuthorityDoc({ approvalStatus: "pending" });
    doc.save = async function () {
      savedStatus = this.approvalStatus;
      return this;
    };
    (User as any).findOne = async () => doc;

    const req: any = {
      params: { id: "507f1f77bcf86cd799439099" },
      user: { _id: { toString: () => "admin1" } },
    };
    const res = fakeRes();
    let caughtErr: any = null;
    await rejectAuthorityRequest(req as AuthRequest, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error passed to next()");
    assert(savedStatus === "rejected", "approvalStatus was set to 'rejected' before save()");
    assert(res.body?.message === "Authority request rejected.", "exact success message returned");
  }

  console.log(`\n──────────────────────────────\n${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

run();
