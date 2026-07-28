import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getSecurityStatus,
  getSessions,
  revokeSession,
  logoutAllOtherSessions,
  getLoginHistory,
  getSecurityEvents,
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
  sendPhoneVerificationOtp,
  verifyPhoneVerificationOtp,
  deactivateAccount,
  getTwoFactorStatus,
  initiateTwoFactorSetup,
  verifyTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
} from "../controllers/security.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  loginHistoryQueryValidator,
  paginationQueryValidator,
  sessionIdParamValidator,
  sendEmailOtpValidator,
  verifyEmailOtpValidator,
  verifyPhoneOtpValidator,
  deactivateAccountValidator,
} from "../validators/security.validator";

const router = Router();

// Every Security Center endpoint requires authentication — none of these
// are ever reachable without a valid access token (see middleware/auth.ts).
router.use(authenticate);

// Phase 6: separate from both the general /api limiter (app.ts) and the
// per-user resend cooldown enforced in security.service.ts — this is a
// per-IP ceiling specifically against OTP-endpoint abuse, reusing the same
// express-rate-limit already used for authLimiter/aiLimiter in app.ts
// rather than adding any new rate-limiting dependency.
const emailOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification requests. Please try again later." },
});

router.get("/status", getSecurityStatus);

router.get("/sessions", getSessions);
router.post("/sessions/:sessionId/revoke", sessionIdParamValidator, validate, revokeSession);
router.post("/sessions/logout-all", logoutAllOtherSessions);

router.get("/history", loginHistoryQueryValidator, validate, getLoginHistory);
router.get("/events", paginationQueryValidator, validate, getSecurityEvents);

router.post(
  "/email/send-otp",
  emailOtpLimiter,
  sendEmailOtpValidator,
  validate,
  sendEmailChangeOtp,
);
router.post(
  "/email/verify-otp",
  emailOtpLimiter,
  verifyEmailOtpValidator,
  validate,
  verifyEmailChangeOtp,
);

router.post("/phone/send-otp", emailOtpLimiter, sendPhoneVerificationOtp);
router.post(
  "/phone/verify-otp",
  emailOtpLimiter,
  verifyPhoneOtpValidator,
  validate,
  verifyPhoneVerificationOtp,
);

router.post("/deactivate-account", deactivateAccountValidator, validate, deactivateAccount);

// 2FA management (Phase 9)
router.get("/2fa/status", getTwoFactorStatus);
router.post("/2fa/setup", emailOtpLimiter, initiateTwoFactorSetup);
router.post("/2fa/verify-setup", emailOtpLimiter, verifyTwoFactorSetup);
router.post("/2fa/disable", emailOtpLimiter, disableTwoFactor);
router.post("/2fa/recovery-codes/regenerate", emailOtpLimiter, regenerateRecoveryCodes);

export default router;
