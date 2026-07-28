import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "citizen" | "authority" | "administrator";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

// Approval status for role-gated login (currently enforced for the
// "authority" role only — see Phase 1.1: Backend Authentication & Registration
// Rules). Defaults to "approved" so pre-existing accounts created before this
// field was introduced are never accidentally locked out; the signup
// controller explicitly overrides this to "pending" for new Authority
// registrations.
export type ApprovalStatus = "approved" | "pending" | "rejected";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  organization?: string;
  phone?: string;
  city?: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: string[];
  lastLogin?: Date;

  // ─── Profile Fields (Phase 3/7) ──────────────────────────────────────────
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  addressLine?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  profileUpdatedAt?: Date;

  // ─── Security Center Phase 1: data foundation ──────────────────────────
  // isVerified (above) already represents "email verified"; these add the
  // supporting timestamps rather than duplicating the boolean itself.
  emailVerifiedAt?: Date;
  verificationSentAt?: Date;
  // `phone` (above) already represents the phone number; phoneVerified is
  // the only new piece of state needed alongside it.
  phoneVerified: boolean;
  lastPasswordChangedAt?: Date;
  securityUpdatedAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;

  // ─── Security Center Phase 9: 2FA / TOTP ────────────────────────────────
  twoFactorEnabled: boolean;
  twoFactorSecret?: string; // base32 TOTP secret; only set after successful setup
  twoFactorPendingSecret?: string; // temporary secret during setup, cleared after verification
  twoFactorBackupCodes: Array<{ hash: string; used: boolean }>;
  twoFactorBackupCodesGeneratedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["citizen", "authority", "administrator"],
      default: "citizen",
    },
    // See ApprovalStatus type above for why this defaults to "approved".
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
    organization: { type: String, trim: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true, default: "belagavi" },
    avatar: { type: String },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, trim: true },
    addressLine: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    profileUpdatedAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshTokens: { type: [String], select: false, default: [] },
    lastLogin: { type: Date },

    // ─── Security Center Phase 1: data foundation ────────────────────────
    emailVerifiedAt: { type: Date },
    verificationSentAt: { type: Date },
    phoneVerified: { type: Boolean, default: false },
    lastPasswordChangedAt: { type: Date },
    securityUpdatedAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    accountLockedUntil: { type: Date, select: false },

    // ─── Phase 9: 2FA ──────────────────────────────────────────────────────
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorPendingSecret: { type: String, select: false },
    twoFactorBackupCodes: {
      type: [{ hash: { type: String }, used: { type: Boolean, default: false } }],
      default: [],
      select: false,
    },
    twoFactorBackupCodesGeneratedAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret["password"];
        delete ret["refreshTokens"];
        delete ret["passwordResetToken"];
        delete ret["passwordResetExpires"];
        delete ret["failedLoginAttempts"];
        delete ret["accountLockedUntil"];
        return ret;
      },
    },
  },
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Whether this account is currently allowed to authenticate, under the
 * Authority approval gate introduced in Phase 1.1. Citizen and
 * Administrator accounts are always eligible; an Authority account is only
 * eligible once approvalStatus is "approved".
 *
 * Centralized here (Phase 1.4 hardening) so login(), refreshToken(), and
 * the authenticate() middleware share one source of truth instead of three
 * independent copies of the same condition that could silently drift out
 * of sync.
 */
export function isEligibleToAuthenticate(user: Pick<IUser, "role" | "approvalStatus">): boolean {
  return user.role !== "authority" || user.approvalStatus === "approved";
}

/**
 * Human-readable reason a currently-ineligible Authority account can't log
 * in yet. Only meaningful when isEligibleToAuthenticate(user) is false.
 */
export function authorityApprovalMessage(user: Pick<IUser, "approvalStatus">): string {
  return user.approvalStatus === "rejected"
    ? "Your Authority account registration was not approved. Contact an administrator for details."
    : "Your Authority account is pending administrator approval.";
}

/**
 * Failed-login lockout policy (Security Center Phase 1). Kept as named
 * constants, in one place, so login() and any future callers agree on the
 * same thresholds instead of hardcoding magic numbers per call site.
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Whether this account is currently locked out due to failed login
 * attempts. Mirrors the isEligibleToAuthenticate pattern above — centralized
 * so it can be reused anywhere lockout needs checking, not just login().
 */
export function isAccountLocked(user: Pick<IUser, "accountLockedUntil">): boolean {
  return !!user.accountLockedUntil && user.accountLockedUntil.getTime() > Date.now();
}

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ city: 1 });
UserSchema.index({ role: 1, approvalStatus: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
