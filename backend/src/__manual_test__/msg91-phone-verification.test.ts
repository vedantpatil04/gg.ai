/**
 * msg91-phone-verification.test.ts
 *
 * Automated verification test suite for GreenGuard MSG91 Custom UI OTP Integration.
 * Exercises token validation, fallback behavior, validator rules, and security audits.
 *
 * Run with:
 *   npx ts-node src/__manual_test__/msg91-phone-verification.test.ts
 */

process.env.JWT_SECRET = "test-jwt-secret-64-bytes-long-string-for-testing-purpose-only";
process.env.MSG91_AUTH_KEY = "test_msg91_auth_key_12345";
process.env.MSG91_WIDGET_ID = "3366778899aabbcc";

import axios from "axios";
import { User } from "../models/User";
import { Otp } from "../models/Otp";
import { SecurityEvent } from "../models/SecurityEvent";
import { verifyPhoneWithMsg91Token } from "../services/security.service";
import { verifyPhoneVerificationOtp } from "../controllers/security.controller";
import { validationResult } from "express-validator";
import { verifyPhoneOtpValidator } from "../validators/security.validator";

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

async function runTests() {
  console.log("\n🧪 Running MSG91 Phone Verification Test Suite...\n");

  const originalAxiosPost = axios.post;
  const originalUserFindById = User.findById;
  const originalUserFindByIdAndUpdate = User.findByIdAndUpdate;
  const originalOtpFindOne = Otp.findOne;
  const originalSecurityEventCreate = SecurityEvent.create;

  // Track updates & security events
  let updatedUserFields: any = null;
  let recordedEvents: any[] = [];

  User.findById = (id: any) =>
    ({
      select: async () => ({
        _id: id,
        phone: "+91 98765 43210",
        phoneVerified: false,
      }),
    }) as any;

  User.findByIdAndUpdate = (async (id: any, update: any) => {
    updatedUserFields = update;
    return { _id: id, ...update };
  }) as any;

  SecurityEvent.create = (async (doc: any) => {
    recordedEvents.push(doc);
    return doc;
  }) as any;

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Service rejects when MSG91_AUTH_KEY is missing
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Suite 1: Environment & Token Validation Guards");
  const savedKey = process.env.MSG91_AUTH_KEY;
  delete process.env.MSG91_AUTH_KEY;

  const noKeyResult = await verifyPhoneWithMsg91Token("507f1f77bcf86cd799439011", "test-token");
  assert(noKeyResult.status === "error", "Rejects verification when MSG91_AUTH_KEY is missing");
  process.env.MSG91_AUTH_KEY = savedKey;

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Service rejects empty / whitespace tokens
  // ──────────────────────────────────────────────────────────────────────────
  const emptyTokenResult = await verifyPhoneWithMsg91Token("507f1f77bcf86cd799439011", "   ");
  assert(emptyTokenResult.status === "invalid", "Rejects empty or whitespace token");

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: Service rejects if user has no phone number on file
  // ──────────────────────────────────────────────────────────────────────────
  User.findById = () =>
    ({
      select: async () => ({
        _id: "user-no-phone",
        phone: "",
        phoneVerified: false,
      }),
    }) as any;

  const noPhoneResult = await verifyPhoneWithMsg91Token("user-no-phone", "valid-jwt-token");
  assert(noPhoneResult.status === "error", "Rejects verification if user has no phone on file");

  // Restore user with phone
  User.findById = (id: any) =>
    ({
      select: async () => ({
        _id: id,
        phone: "+91 98765 43210",
        phoneVerified: false,
      }),
    }) as any;

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4: Successful MSG91 Token Verification updates phoneVerified to true
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSuite 2: Successful MSG91 Token Verification");
  let axiosCallHeaders: any = null;
  let axiosCallUrl: string = "";
  let axiosCallBody: any = null;

  axios.post = (async (url: string, data: any, config: any) => {
    axiosCallUrl = url;
    axiosCallBody = data;
    axiosCallHeaders = config?.headers;
    return {
      status: 200,
      data: {
        type: "success",
        message: "Token verified successfully",
        mobile: "919876543210",
      },
    };
  }) as any;

  updatedUserFields = null;
  const successResult = await verifyPhoneWithMsg91Token(
    "507f1f77bcf86cd799439011",
    "mock-jwt-access-token-xyz",
  );

  assert(successResult.status === "verified", "Token verified successfully with MSG91 API");
  assert(
    axiosCallUrl === "https://control.msg91.com/api/v5/widget/verifyAccessToken",
    "Calls official MSG91 verifyAccessToken endpoint",
  );
  assert(
    axiosCallHeaders?.authkey === "test_msg91_auth_key_12345",
    "Passes MSG91 authkey in request headers",
  );
  assert(
    axiosCallBody?.["access-token"] === "mock-jwt-access-token-xyz",
    "Passes access-token in request body",
  );
  assert(
    updatedUserFields?.phoneVerified === true,
    "Updates user.phoneVerified = true in database",
  );
  assert(
    updatedUserFields?.securityUpdatedAt instanceof Date,
    "Updates user.securityUpdatedAt timestamp",
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5: MSG91 API Error Handling (Invalid / Expired Token)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSuite 3: Invalid / Expired Token Error Handling");
  axios.post = (async () => {
    const error: any = new Error("Request failed with status code 400");
    error.response = {
      status: 400,
      data: { message: "Invalid verification access token or expired" },
    };
    throw error;
  }) as any;

  const invalidResult = await verifyPhoneWithMsg91Token(
    "507f1f77bcf86cd799439011",
    "invalid-token",
  );
  assert(invalidResult.status === "invalid", "Handles 400 invalid token response from MSG91 cleanly");
  assert(
    Boolean(invalidResult.message && invalidResult.message.includes("Invalid")),
    "Returns descriptive message from provider error",
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6: Controller Endpoint — verifyPhoneVerificationOtp with MSG91 Token
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSuite 4: Controller Integration & Audit Events");
  axios.post = (async () => ({
    status: 200,
    data: { message: "Valid token", type: "success" },
  })) as any;

  recordedEvents = [];
  const req: any = {
    user: { _id: "507f1f77bcf86cd799439011", phone: "+91 98765 43210" },
    body: { accessToken: "verified-msg91-token" },
    ip: "127.0.0.1",
    headers: { "user-agent": "GreenGuard-Test-Agent" },
  };
  const res = fakeRes();
  let nextErr: any = null;

  await verifyPhoneVerificationOtp(req, res, (err) => {
    nextErr = err;
  });

  assert(!nextErr, "Controller executes without unhandled error");
  assert(res.statusCode === 200, "Controller returns HTTP 200 on successful token verification");
  assert(res.body?.success === true, "Response payload indicates success");
  assert(
    recordedEvents.some((e) => e.action === "PHONE_VERIFIED" && e.result === "SUCCESS"),
    "Records PHONE_VERIFIED audit log event",
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7: Validator rules for verifyPhoneOtpValidator
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSuite 5: Express Validator Rules");
  const testValidation = async (body: any) => {
    const fakeReq: any = { body };
    for (const middleware of verifyPhoneOtpValidator) {
      await (middleware as any).run(fakeReq);
    }
    return validationResult(fakeReq);
  };

  const validOtpVal = await testValidation({ otp: "123456" });
  assert(validOtpVal.isEmpty(), "Validator accepts valid 6-digit OTP");

  const validTokenVal = await testValidation({ accessToken: "msg91-access-token" });
  assert(validTokenVal.isEmpty(), "Validator accepts MSG91 accessToken");

  const emptyVal = await testValidation({});
  assert(!emptyVal.isEmpty(), "Validator rejects request when neither OTP nor token is provided");

  // Restore mocks
  axios.post = originalAxiosPost;
  User.findById = originalUserFindById;
  User.findByIdAndUpdate = originalUserFindByIdAndUpdate;
  Otp.findOne = originalOtpFindOne;
  SecurityEvent.create = originalSecurityEventCreate;

  console.log(`\n========================================`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  console.log(`========================================\n`);

  if (fail > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test suite threw uncaught error:", err);
  process.exit(1);
});
