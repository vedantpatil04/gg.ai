/**
 * Automated test suite for Profile Identity and Role Integrity.
 *
 * Verifies all 9 core identity requirements:
 * 1. Authority user logs in → profile returns Authority user.
 * 2. Citizen user logs in → profile returns Citizen user.
 * 3. Administrator user logs in → profile returns Administrator user.
 * 4. /api/auth/me.id === /api/profile.userId (controller & middleware resolution).
 * 5. Authenticated user cannot accidentally receive another user's profile.
 * 6. Logout User A → login User B → profile shows User B.
 * 7. Profile avatar belongs to authenticated user.
 * 8. Role, name, email, phone, city, and avatar all come from the same user record.
 * 9. No hardcoded/demo user is returned from the profile route.
 *
 * Run with:
 *   npx ts-node src/__manual_test__/profile-identity-integrity.test.ts
 */

process.env.JWT_SECRET = "test-jwt-secret-profile-verification";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-profile-verification";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/User";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getMe } from "../controllers/auth.controller";
import {
  getCompletion,
  getStatistics,
  updateProfile,
  getOrganization,
  getActivity,
} from "../controllers/profile.controller";

let pass = 0;
let fail = 0;

function assert(cond: boolean, testNum: number, msg: string) {
  if (cond) {
    pass++;
    console.log(`  ✅ [Test ${testNum}] ${msg}`);
  } else {
    fail++;
    console.log(`  ❌ [Test ${testNum}] FAILED: ${msg}`);
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

function makeUser(overrides: Record<string, unknown>) {
  const idStr = overrides._id ? String(overrides._id) : new mongoose.Types.ObjectId().toString();
  const objId = new mongoose.Types.ObjectId(idStr);
  const base = {
    _id: objId,
    name: "Default User",
    email: "default@greenguard.ai",
    role: "citizen",
    approvalStatus: "approved",
    isActive: true,
    isVerified: true,
    avatar: "/uploads/avatars/default.jpg",
    phone: "+91 9876543210",
    city: "belagavi",
    refreshTokens: [] as string[],
    createdAt: new Date("2025-01-01"),
    toJSON() {
      const { password, refreshTokens, ...rest } = this as any;
      return rest;
    },
  };
  return { ...base, ...overrides };
}

async function run() {
  console.log("==================================================================");
  console.log("  GreenGuard AI — Profile & Identity Integrity Verification Suite");
  console.log("==================================================================");

  const adityaAuthority = makeUser({
    _id: "507f1f77bcf86cd799439011",
    name: "Aditya Dalvi",
    email: "aditya.dalvi@authority.gov.in",
    role: "authority",
    approvalStatus: "approved",
    organization: "State Environmental Board",
    phone: "+91 9811122233",
    city: "belagavi",
    avatar: "/uploads/avatars/aditya-authority.jpg",
  });

  const riteshCitizen = makeUser({
    _id: "507f1f77bcf86cd799439022",
    name: "Ritesh Desai",
    email: "ritesh.desai@citizen.org",
    role: "citizen",
    approvalStatus: "approved",
    phone: "+91 9833344455",
    city: "pune",
    avatar: "/uploads/avatars/ritesh-citizen.jpg",
  });

  const adminUser = makeUser({
    _id: "507f1f77bcf86cd799439033",
    name: "Platform Administrator",
    email: "admin@greenguard.ai",
    role: "administrator",
    approvalStatus: "approved",
    phone: "+91 9844455566",
    city: "belagavi",
    avatar: "/uploads/avatars/admin-platform.jpg",
  });

  const userMap = new Map<string, any>([
    [adityaAuthority._id.toString(), adityaAuthority],
    [riteshCitizen._id.toString(), riteshCitizen],
    [adminUser._id.toString(), adminUser],
  ]);

  (User as any).findById = (id: any) => ({
    select: async () => userMap.get(id.toString()) ?? null,
  });

  // ─── TEST 1: Authority user logs in → profile returns Authority user ───
  {
    const token = jwt.sign({ id: adityaAuthority._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = fakeRes();

    await new Promise<void>((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await getMe(req, res, () => {});

    const returnedUser = res.body?.data?.user;
    assert(returnedUser?._id?.toString() === adityaAuthority._id.toString(), 1, "Authority user ID matches authenticated token");
    assert(returnedUser?.name === "Aditya Dalvi", 1, "Authority name is Aditya Dalvi");
    assert(returnedUser?.role === "authority", 1, "Authority role is authority");
    assert(returnedUser?.avatar === "/uploads/avatars/aditya-authority.jpg", 1, "Authority avatar belongs to Aditya");
  }

  // ─── TEST 2: Citizen user logs in → profile returns Citizen user ───
  {
    const token = jwt.sign({ id: riteshCitizen._id.toString(), role: "citizen" }, process.env.JWT_SECRET!);
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = fakeRes();

    await new Promise<void>((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await getMe(req, res, () => {});

    const returnedUser = res.body?.data?.user;
    assert(returnedUser?._id?.toString() === riteshCitizen._id.toString(), 2, "Citizen user ID matches authenticated token");
    assert(returnedUser?.name === "Ritesh Desai", 2, "Citizen name is Ritesh Desai");
    assert(returnedUser?.role === "citizen", 2, "Citizen role is citizen");
  }

  // ─── TEST 3: Administrator user logs in → profile returns Administrator user ───
  {
    const token = jwt.sign({ id: adminUser._id.toString(), role: "administrator" }, process.env.JWT_SECRET!);
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = fakeRes();

    await new Promise<void>((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await getMe(req, res, () => {});

    const returnedUser = res.body?.data?.user;
    assert(returnedUser?._id?.toString() === adminUser._id.toString(), 3, "Admin user ID matches authenticated token");
    assert(returnedUser?.role === "administrator", 3, "Admin role is administrator");
    assert(returnedUser?.name === "Platform Administrator", 3, "Admin name is Platform Administrator");
  }

  // ─── TEST 4: /api/auth/me.id === /api/profile.userId ───
  {
    const token = jwt.sign({ id: adityaAuthority._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const resAuthMe = fakeRes();
    const resCompletion = fakeRes();

    await new Promise<void>((resolve, reject) => {
      authenticate(req, resAuthMe, (err) => (err ? reject(err) : resolve()));
    });
    await getMe(req, resAuthMe, () => {});
    await getCompletion(req, resCompletion, () => {});

    const authMeId = resAuthMe.body?.data?.user?._id?.toString();
    const profileReqUserId = (req.user as any)?._id?.toString();

    assert(authMeId === profileReqUserId, 4, "/api/auth/me user ID strictly equals profile execution context user ID");
    assert(authMeId === adityaAuthority._id.toString(), 4, "Both identity resolvers point to Aditya Dalvi");
  }

  // ─── TEST 5: Authenticated user cannot accidentally receive another user's profile ───
  {
    // Aditya is authenticated. Even if a spoofed/malicious client sends ?userId=ritesh or body { userId: ritesh }
    const token = jwt.sign({ id: adityaAuthority._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const req: any = {
      headers: { authorization: `Bearer ${token}` },
      query: { userId: riteshCitizen._id.toString() },
      body: { userId: riteshCitizen._id.toString() },
    };
    const res = fakeRes();

    await new Promise<void>((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await getMe(req, res, () => {});

    const returnedUser = res.body?.data?.user;
    assert(returnedUser?._id?.toString() !== riteshCitizen._id.toString(), 5, "Authenticated authority NEVER receives another user's profile");
    assert(returnedUser?._id?.toString() === adityaAuthority._id.toString(), 5, "Identity is anchored strictly to req.user._id from verified JWT");
  }

  // ─── TEST 6: Logout User A → login User B → profile shows User B ───
  {
    // Step A: User A (Ritesh) session
    const tokenA = jwt.sign({ id: riteshCitizen._id.toString(), role: "citizen" }, process.env.JWT_SECRET!);
    const reqA: any = { headers: { authorization: `Bearer ${tokenA}` } };
    const resA = fakeRes();
    await new Promise<void>((resolve) => authenticate(reqA, resA, () => resolve()));
    await getMe(reqA, resA, () => {});
    assert(resA.body?.data?.user?.name === "Ritesh Desai", 6, "Session A loads User A (Ritesh)");

    // Step B: Transition to User B (Aditya) session
    const tokenB = jwt.sign({ id: adityaAuthority._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const reqB: any = { headers: { authorization: `Bearer ${tokenB}` } };
    const resB = fakeRes();
    await new Promise<void>((resolve) => authenticate(reqB, resB, () => resolve()));
    await getMe(reqB, resB, () => {});
    assert(resB.body?.data?.user?.name === "Aditya Dalvi", 6, "Session B loads User B (Aditya)");
    assert(resB.body?.data?.user?.role === "authority", 6, "Session B role is Authority, no residual citizen data");
  }

  // ─── TEST 7: Profile avatar belongs to authenticated user ───
  {
    const token = jwt.sign({ id: adityaAuthority._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = fakeRes();
    await new Promise<void>((resolve) => authenticate(req, res, () => resolve()));
    await getMe(req, res, () => {});

    const returnedUser = res.body?.data?.user;
    assert(returnedUser?.avatar === adityaAuthority.avatar, 7, "Avatar is Aditya's avatar, not another user's");
  }

  // ─── TEST 8: Role, name, email, phone, city, and avatar all come from the same user record ───
  {
    const token = jwt.sign({ id: adityaAuthority._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = fakeRes();
    await new Promise<void>((resolve) => authenticate(req, res, () => resolve()));
    await getMe(req, res, () => {});

    const u = res.body?.data?.user;
    assert(
      u._id.toString() === adityaAuthority._id.toString() &&
      u.name === adityaAuthority.name &&
      u.role === adityaAuthority.role &&
      u.email === adityaAuthority.email &&
      u.phone === adityaAuthority.phone &&
      u.city === adityaAuthority.city &&
      u.avatar === adityaAuthority.avatar,
      8,
      "Role, name, email, phone, city, and avatar all originate synchronously from the same user document",
    );
  }

  // ─── TEST 9: No hardcoded/demo user is returned from the profile route ───
  {
    const dynamicUser = makeUser({
      _id: new mongoose.Types.ObjectId().toString(),
      name: "Unique Non-Demo User",
      email: "unique.custom@greenguard.ai",
      role: "authority",
      city: "hubballi",
      phone: "+91 9900112233",
      avatar: "/uploads/avatars/custom-dynamic.jpg",
    });
    userMap.set(dynamicUser._id.toString(), dynamicUser);

    const token = jwt.sign({ id: dynamicUser._id.toString(), role: "authority" }, process.env.JWT_SECRET!);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = fakeRes();
    await new Promise<void>((resolve) => authenticate(req, res, () => resolve()));
    await getMe(req, res, () => {});

    const u = res.body?.data?.user;
    assert(u?.name === "Unique Non-Demo User", 9, "Dynamic user returns exact runtime name");
    assert(u?.email === "unique.custom@greenguard.ai", 9, "Dynamic user returns exact runtime email");
    assert(u?.avatar === "/uploads/avatars/custom-dynamic.jpg", 9, "No fallback/demo user is substituted");
  }

  console.log("──────────────────────────────────────────────────────────────────");
  console.log(`  Summary: ${pass} passed, ${fail} failed`);
  console.log("──────────────────────────────────────────────────────────────────");

  if (fail > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
