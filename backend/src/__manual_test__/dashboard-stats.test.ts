/**
 * Manual verification harness for Phase 2.2's extended getPlatformStats
 * (admin.controller.ts) — the Executive Dashboard aggregate endpoint.
 *
 * Mocks Mongoose + the scheduler status module; no live MongoDB needed. Run:
 *   npx ts-node src/__manual_test__/dashboard-stats.test.ts
 */
import { User } from "../models/User";
import { Complaint } from "../models/Complaint";
import { Alert } from "../models/Alert";
import { Report } from "../models/Report";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { City } from "../models/City";
import * as scheduler from "../jobs/scheduler";
import { getPlatformStats } from "../controllers/admin.controller";

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
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(p: unknown) {
      this.body = p;
      return this;
    },
  };
  return res;
}

// Chainable find-style mock: .sort().skip().limit().select().lean()
function chainable(resolveTo: unknown) {
  const chain: any = {
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: async () => resolveTo,
  };
  return chain;
}

function mockModels(opts: {
  userCount?: number;
  complaintCount?: number;
  activeAlertCount?: number;
  reportCount?: number;
  readingCount?: number;
  pendingAuthorityCount?: number;
  activeCityCount?: number;
  openComplaintCount?: number;
  criticalAlertCount?: number;
  latestReading?: { timestamp: Date } | null;
  recentAuthorities?: Array<{ name: string; createdAt: Date }>;
  recentCitizens?: Array<{ name: string; createdAt: Date }>;
  recentComplaints?: Array<{ title: string; createdAt: Date }>;
  usersByRole?: unknown[];
}) {
  let userCountCall = 0;
  (User as any).countDocuments = (filter?: any) => {
    userCountCall++;
    // First unfiltered call = total users; second (role+approvalStatus
    // filter) = pending authority requests.
    if (filter?.approvalStatus === "pending")
      return Promise.resolve(opts.pendingAuthorityCount ?? 0);
    return Promise.resolve(opts.userCount ?? 0);
  };
  (User as any).aggregate = async () => opts.usersByRole ?? [];
  (User as any).find = (filter: any) => {
    if (filter?.role === "authority") return chainable(opts.recentAuthorities ?? []);
    return chainable(opts.recentCitizens ?? []);
  };

  (Complaint as any).countDocuments = (filter?: any) => {
    if (filter?.status?.$in) return Promise.resolve(opts.openComplaintCount ?? 0);
    return Promise.resolve(opts.complaintCount ?? 0);
  };
  (Complaint as any).find = () => chainable(opts.recentComplaints ?? []);

  (Alert as any).countDocuments = (filter?: any) => {
    if (filter?.severity === "critical") return Promise.resolve(opts.criticalAlertCount ?? 0);
    return Promise.resolve(opts.activeAlertCount ?? 0);
  };

  (Report as any).countDocuments = async () => opts.reportCount ?? 0;

  (EnvironmentalData as any).countDocuments = async () => opts.readingCount ?? 0;
  (EnvironmentalData as any).findOne = () => chainable(opts.latestReading ?? null);

  (City as any).countDocuments = async () => opts.activeCityCount ?? 0;
}

async function run() {
  // ── 1. Fully empty platform: honest empty/no-data states throughout ─────
  {
    console.log("\n[1] Empty platform — no fabricated data, honest empty/no-data states");
    mockModels({});
    (scheduler as any).getSchedulerStatus = () => ({
      enabled: false,
      lastRunAt: null,
      lastRunResult: null,
    });
    delete process.env.GEMINI_API_KEY;

    const res = fakeRes();
    let caughtErr: any = null;
    await getPlatformStats({} as any, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error");
    const d = res.body?.data;
    assert(d?.pendingAuthorityRequests === 0, "pendingAuthorityRequests is 0, not fabricated");
    assert(
      Array.isArray(d?.recentActivity) && d.recentActivity.length === 0,
      "recentActivity is an empty array, not fake entries",
    );
    assert(
      d?.health.find((h: any) => h.name === "Environmental Data Feed")?.status === "no-data",
      "data feed correctly reports no-data",
    );
    assert(
      d?.health.find((h: any) => h.name === "Scheduler")?.status === "disabled",
      "scheduler correctly reports disabled",
    );
    assert(
      d?.health.find((h: any) => h.name === "AI Services")?.status === "not-configured",
      "AI services correctly reports not-configured",
    );
  }

  // ── 2. Populated platform: correct pass-through + derived statuses ──────
  {
    console.log("\n[2] Populated platform — correct KPI pass-through and health derivation");
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60_000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60_000);

    mockModels({
      userCount: 58,
      complaintCount: 30,
      activeAlertCount: 12,
      reportCount: 40,
      readingCount: 5000,
      pendingAuthorityCount: 4,
      activeCityCount: 14,
      openComplaintCount: 23,
      criticalAlertCount: 9,
      latestReading: { timestamp: tenMinAgo },
      recentAuthorities: [{ name: "Aanya Sharma", createdAt: tenMinAgo }],
      recentCitizens: [{ name: "Priya Nair", createdAt: threeHoursAgo }],
      recentComplaints: [{ title: "Illegal dumping near river", createdAt: now }],
    });
    (scheduler as any).getSchedulerStatus = () => ({
      enabled: true,
      lastRunAt: tenMinAgo.toISOString(),
      lastRunResult: { success: 12, failed: 0, total: 12 },
    });
    process.env.GEMINI_API_KEY = "test-key";

    const res = fakeRes();
    let caughtErr: any = null;
    await getPlatformStats({} as any, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error");
    const d = res.body?.data;
    assert(d?.pendingAuthorityRequests === 4, "pendingAuthorityRequests matches doc's example (4)");
    assert(d?.totalUsers === 58, "totalUsers matches doc's example (58)");
    assert(d?.cities === 14, "cities matches doc's example (14)");
    assert(d?.openComplaints === 23, "openComplaints matches doc's example (23)");
    assert(d?.criticalAlerts === 9, "criticalAlerts matches doc's example (9)");
    assert(d?.platformStatus === "Operational", "platformStatus is Operational");
    assert(
      d?.users === 58 && d?.activeAlerts === 12,
      "pre-existing fields (users, activeAlerts) still present — backward compatible",
    );
    assert(
      d?.health.find((h: any) => h.name === "Environmental Data Feed")?.status === "operational",
      "fresh reading (10m ago) → operational",
    );
    assert(
      d?.health.find((h: any) => h.name === "Scheduler")?.status === "operational",
      "enabled scheduler with a recent run → operational",
    );
    assert(
      d?.health.find((h: any) => h.name === "AI Services")?.status === "operational",
      "GEMINI_API_KEY set → operational",
    );
    assert(d?.recentActivity.length === 3, "3 recent activity items merged from the 3 sources");
    assert(
      d?.recentActivity[0].text.includes("Illegal dumping"),
      "most recent item (the complaint, at 'now') sorts first",
    );
  }

  // ── 3. Stale environmental data feed is reported as delayed, not hidden ──
  {
    console.log(
      "\n[3] Stale data feed (3h old) correctly reported as delayed, not fabricated as operational",
    );
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000);
    mockModels({ latestReading: { timestamp: threeHoursAgo } });
    (scheduler as any).getSchedulerStatus = () => ({
      enabled: false,
      lastRunAt: null,
      lastRunResult: null,
    });

    const res = fakeRes();
    let caughtErr: any = null;
    await getPlatformStats({} as any, res, (e: any) => {
      caughtErr = e;
    });

    assert(caughtErr === null, "no error");
    assert(
      res.body?.data?.health.find((h: any) => h.name === "Environmental Data Feed")?.status ===
        "delayed",
      "3h-old reading correctly reported as delayed",
    );
  }

  console.log(`\n──────────────────────────────\n${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exit(1);
}

run();
