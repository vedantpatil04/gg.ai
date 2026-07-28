import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  signup,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  complete2FAChallenge,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updateProfileValidator,
  changePasswordValidator,
} from "../validators/auth.validator";

const router = Router();

// Reuse express-rate-limit for the challenge endpoint — same approach as
// the security routes' emailOtpLimiter; no new dependency.
const challengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification attempts. Please try again later." },
});

router.post("/signup", signupValidator, validate, signup);
router.post("/login", loginValidator, validate, login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPasswordValidator, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);

// Phase 9: completes login for 2FA-enabled accounts using the challengeToken
// issued by POST /login when twoFactorEnabled is true.
router.post("/2fa-challenge", challengeLimiter, complete2FAChallenge);

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfileValidator, validate, updateProfile);
router.patch("/me/password", authenticate, changePasswordValidator, validate, changePassword);

export default router;
