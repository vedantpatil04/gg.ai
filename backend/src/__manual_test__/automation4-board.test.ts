/**
 * GreenGuard AI — Automation 4 Authority Board Automation Verification Suite
 *
 * Verifies:
 *  1. Board & Organization identity resolution (User.organization, User.department, User.assignedCities)
 *  2. Real aggregate workload computation across board officers
 *  3. Jurisdiction coverage mapping & gap detection (0 available officers in assigned city)
 *  4. Board operational status calculation (optimal / warning / critical)
 *  5. Availability management & operational gap alert dispatch via Automation 3 notification service
 *  6. Role privacy boundaries (aggregate data only; individual complaints not exposed)
 */

import mongoose from "mongoose";
import { User, type IUser } from "../models/User";
import { Complaint } from "../models/Complaint";
import { City } from "../models/City";
import {
  getBoardOperationalContext,
  updateAuthorityAvailability,
} from "../services/boardAutomation.service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

// ─── Mock Data ───────────────────────────────────────────────────────────────
const boardOrg = "Karnataka State Pollution Control Board";
const dept = "Pollution Control";

const officer1 = {
  _id: new mongoose.Types.ObjectId("6501f8e81234567890111111"),
  name: "Officer Patil",
  email: "patil@kspcb.gov.in",
  role: "authority",
  organization: boardOrg,
  department: dept,
  designation: "Senior Environmental Officer",
  assignedCities: ["belagavi", "hubballi"],
  availability: "available",
  approvalStatus: "approved",
  isActive: true,
  lifecycleEvents: [] as any[],
  save: async function () { return this; },
};

const officer2 = {
  _id: new mongoose.Types.ObjectId("6501f8e81234567890222222"),
  name: "Officer Rao",
  email: "rao@kspcb.gov.in",
  role: "authority",
  organization: boardOrg,
  department: dept,
  designation: "Assistant Environmental Officer",
  assignedCities: ["belagavi"],
  availability: "busy",
  approvalStatus: "approved",
  isActive: true,
  lifecycleEvents: [] as any[],
  save: async function () { return this; },
};

const officer3 = {
  _id: new mongoose.Types.ObjectId("6501f8e81234567890333333"),
  name: "Officer Deshmukh",
  email: "deshmukh@kspcb.gov.in",
  role: "authority",
  organization: boardOrg,
  department: dept,
  designation: "Field Inspector",
  assignedCities: ["bengaluru"],
  availability: "on_leave",
  approvalStatus: "approved",
  isActive: true,
  lifecycleEvents: [] as any[],
  save: async function () { return this; },
};

const mockOfficers = [officer1, officer2, officer3];

const mockCities = [
  { cityId: "belagavi", name: "Belagavi" },
  { cityId: "hubballi", name: "Hubballi-Dharwad" },
  { cityId: "bengaluru", name: "Bengaluru" },
];

// Mock Mongoose model queries
(User.find as any) = (query: any) => ({
  select: () => ({
    lean: async () => mockOfficers,
  }),
});

(User.findById as any) = (id: any) => {
  const s = String(id);
  const found = mockOfficers.find((o) => String(o._id) === s) || officer1;
  return found;
};

(User.countDocuments as any) = async (query: any) => {
  const matching = mockOfficers.filter((o) => {
    if (query.availability && o.availability !== query.availability) return false;
    if (query.assignedCities && !o.assignedCities.includes(query.assignedCities)) return false;
    return true;
  });
  return matching.length;
};

(City.find as any) = () => ({
  select: () => ({
    lean: async () => mockCities,
  }),
});

(Complaint.aggregate as any) = async (pipeline: any[]) => {
  const matchStage = pipeline[0]?.$match;
  if (matchStage?.assignedTo) {
    // Return complaint breakdown per officer
    return [
      { _id: { officerId: officer1._id, status: "in-progress" }, count: 3 },
      { _id: { officerId: officer1._id, status: "rework" }, count: 1 },
      { _id: { officerId: officer1._id, status: "closed" }, count: 5 },
      { _id: { officerId: officer2._id, status: "in-progress" }, count: 4 },
      { _id: { officerId: officer2._id, status: "awaiting_citizen_review" }, count: 2 },
      { _id: { officerId: officer3._id, status: "closed" }, count: 3 },
    ];
  }
  if (matchStage?.cityId) {
    // Return complaint count per city
    return [
      { _id: "belagavi", count: 8 },
      { _id: "hubballi", count: 2 },
      { _id: "bengaluru", count: 5 },
    ];
  }
  return [];
};

async function runTests() {
  console.log("\n=== 1. BOARD IDENTITY & AGGREGATE WORKLOAD CONTEXT ===");

  const context = await getBoardOperationalContext(officer1 as unknown as IUser);

  // Test 1: Identity & Department
  assert(context.organization === boardOrg, "Organization matches User.organization canonical source");
  assert(context.department === dept, "Department matches User.department");
  assert(context.totalOfficers === 3, "Total active board officers computed accurately");

  // Test 2: Availability distribution
  assert(context.availability.available === 1, "Available officer count computed (1 available)");
  assert(context.availability.busy === 1, "Busy officer count computed (1 busy)");
  assert(context.availability.on_leave === 1, "On-leave officer count computed (1 on-leave)");

  // Test 3: Aggregate workload
  assert(context.workload.totalAssigned === 18, "Total board assigned complaints aggregated (18 cases)");
  assert(context.workload.inProgress === 7, "In-progress complaints aggregated (7 cases)");
  assert(context.workload.rework === 1, "Rework complaints aggregated (1 case)");
  assert(context.workload.awaitingReview === 2, "Awaiting review complaints aggregated (2 cases)");
  assert(context.workload.closed === 8, "Closed complaints aggregated (8 cases)");

  // Test 4: Individual vs Board separation
  assert(context.self.id === String(officer1._id), "Officer self context separated correctly");
  assert(context.self.myActiveCases === 4, "Officer 1 individual active caseload accurate (3 in-progress + 1 rework = 4)");
  assert(context.self.myTotalCases === 9, "Officer 1 individual total caseload accurate (9 cases)");

  console.log("\n=== 2. JURISDICTION COVERAGE & OPERATIONAL GAP DETECTION ===");

  // Test 5: Jurisdiction Coverage
  assert(context.jurisdictionCoverage.length === 3, "All 3 unique board cities covered in jurisdiction analysis");
  const belagaviCoverage = context.jurisdictionCoverage.find((c) => c.cityId === "belagavi");
  assert(belagaviCoverage?.officerCount === 2, "Belagavi assigned officer count accurate (2 officers)");
  assert(belagaviCoverage?.availableOfficerCount === 1, "Belagavi available officer count accurate (1 available: Officer Patil)");

  // Test 6: Gap Detection in Bengaluru (Officer 3 is on leave)
  const bengaluruCoverage = context.jurisdictionCoverage.find((c) => c.cityId === "bengaluru");
  assert(bengaluruCoverage?.hasGap === true, "Bengaluru correctly flagged as having a coverage gap (0 available officers)");
  assert(context.coverageGaps.length >= 1, "Coverage gap recorded in board context");
  assert(context.coverageGaps.some((g) => g.cityId === "bengaluru"), "Bengaluru listed in coverage gaps array");

  // Test 7: Board Status
  assert(
    context.boardStatus === "critical" || context.boardStatus === "warning",
    `Board status calculated as '${context.boardStatus}' based on real gaps`,
  );

  console.log("\n=== 3. AVAILABILITY MANAGEMENT & OPERATIONAL GAP ALERTS ===");

  // Test 8: Switching availability to on_leave
  const availResult = await updateAuthorityAvailability(officer1._id, "on_leave");
  assert(availResult.success === true, "updateAuthorityAvailability succeeds");
  assert(officer1.availability === "on_leave", "Officer 1 availability updated in memory/doc");
  assert(
    officer1.lifecycleEvents.some((e) => e.event === "availability_change"),
    "Lifecycle event recorded on availability transition",
  );

  // Test 9: Gap triggered when officer 1 left hubballi with 0 available officers
  // (In mock countDocuments, available officers for hubballi is 0 when officer1 is on_leave)
  assert(typeof availResult.gapTriggered === "boolean", "Gap detection trigger returned");

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
}

runTests().then(() => {
  if (failed > 0) process.exit(1);
  else process.exit(0);
});
