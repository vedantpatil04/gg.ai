import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import {
  NOTIFICATION_CATEGORIES,
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "../constants/notifications";

import {
  SUPPORTED_LANGUAGES,
  DATE_FORMATS,
  TIME_FORMATS,
  NUMBER_FORMATS,
  MEASUREMENT_UNITS,
  AUTO_TIMEZONE,
  isValidTimezone,
  defaultLanguageRegionPreferences,
  type LanguageRegionPreferences,
} from "../constants/languageRegion";

import {
  LANDING_PAGE_IDS,
  WIDGET_IDS,
  PINNABLE_CARD_IDS,
  DEFAULT_CITY_ID,
  defaultDashboardPreferences,
  type DashboardPreferences,
} from "../constants/dashboard";

import {
  MAP_TYPES,
  MEASUREMENT_UNITS as MAP_MEASUREMENT_UNITS,
  ANIMATION_SPEEDS,
  MIN_ZOOM,
  MAX_ZOOM,
  defaultMapPreferences,
  type MapPreferences,
} from "../constants/maps";

import {
  defaultAccessibilityPreferences,
  type AccessibilityPreferences,
} from "../constants/accessibility";

import {
  defaultPrivacyPreferences,
  type PrivacyPreferences,
} from "../constants/privacy";

export type UserRole = "citizen" | "authority" | "administrator";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type ApprovalStatus = "approved" | "pending" | "rejected";

// Phase 4 — Authority availability/status
export type AuthorityAvailability = "available" | "busy" | "on_leave" | "inactive";

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
  emailVerifiedAt?: Date;
  verificationSentAt?: Date;
  phoneVerified: boolean;
  lastPasswordChangedAt?: Date;
  securityUpdatedAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;

  // ─── Security Center Phase 9: 2FA / TOTP ────────────────────────────────
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
  twoFactorBackupCodes: Array<{ hash: string; used: boolean }>;
  twoFactorBackupCodesGeneratedAt?: Date;

  // ─── Phase 4: Authority Enterprise Fields ────────────────────────────────
  // Employee / HR identity
  employeeId?: string;
  department?: string;
  designation?: string;
  // Multi-city assignment
  assignedCities: string[];   // list of cityId strings
  primaryCity?: string;       // single cityId
  specializations: string[];  // e.g. ["air_pollution", "water_contamination"]
  // Workforce state
  availability: AuthorityAvailability;
  // Lifecycle events log (immutable append-only)
  lifecycleEvents: Array<{
    event: string;
    description: string;
    performedBy?: string;
    performedByName?: string;
    at: Date;
  }>;
  // Phase 7
  notificationPreferences?: Map<string, boolean>;
    preferences?: {
  appearance?: {
    theme: "light" | "dark" | "system";
  };
  notifications?: NotificationPreferences;
  languageRegion?: LanguageRegionPreferences;
  dashboard?: DashboardPreferences;
  maps?: MapPreferences;
  accessibility?: AccessibilityPreferences;
  privacy?: PrivacyPreferences;
};
    createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Sub-schemas for user preferences ──────────────────────────────────────────
const AppearanceSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
  },
  { _id: false },
);

const NotificationsSchema = new Schema(
  NOTIFICATION_CATEGORIES.reduce((acc, category) => {
    acc[category] = {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    };
    return acc;
  }, {} as Record<string, unknown>),
  { _id: false },
);

const LanguageRegionSchema = new Schema(
  {
    language: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      default: "en",
    },
    timezone: {
      type: String,
      default: AUTO_TIMEZONE,
      validate: {
        validator: isValidTimezone,
        message: (props: { value: string }) =>
          `${props.value} is not a supported timezone.`,
      },
    },
    dateFormat: {
      type: String,
      enum: DATE_FORMATS,
      default: "DD/MM/YYYY",
    },
    timeFormat: {
      type: String,
      enum: TIME_FORMATS,
      default: "24h",
    },
    numberFormat: {
      type: String,
      enum: NUMBER_FORMATS,
      default: "1,234.56",
    },
    measurementUnit: {
      type: String,
      enum: MEASUREMENT_UNITS,
      default: "metric",
    },
  },
  { _id: false },
);

const DashboardSchema = new Schema(
  {
    defaultLandingPage: {
      type: String,
      enum: LANDING_PAGE_IDS,
      default: "dashboard",
    },
    visibleWidgets: {
      type: [String],
      enum: WIDGET_IDS,
      default: () => [...WIDGET_IDS],
    },
    widgetOrder: {
      type: [String],
      enum: WIDGET_IDS,
      default: () => [...WIDGET_IDS],
    },
    defaultCity: {
      type: String,
      default: DEFAULT_CITY_ID,
    },
    pinnedCards: {
      type: [String],
      enum: PINNABLE_CARD_IDS,
      default: () => ["aqi", "forecast"],
    },
  },
  { _id: false },
);

const MapsSchema = new Schema(
  {
    mapType: {
      type: String,
      enum: MAP_TYPES,
      default: "street",
    },
    zoom: {
      type: Number,
      min: MIN_ZOOM,
      max: MAX_ZOOM,
      default: 10,
    },
    trafficLayer: {
      type: Boolean,
      default: false,
    },
    pollutionLayer: {
      type: Boolean,
      default: true,
    },
    weatherLayer: {
      type: Boolean,
      default: true,
    },
    measurementUnit: {
      type: String,
      enum: MAP_MEASUREMENT_UNITS,
      default: "metric",
    },
    animationSpeed: {
      type: String,
      enum: ANIMATION_SPEEDS,
      default: "normal",
    },
    rememberLastLocation: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const AccessibilitySchema = new Schema(
  {
    highContrast: {
      type: Boolean,
      default: false,
    },
    reduceMotion: {
      type: Boolean,
      default: false,
    },
    largeText: {
      type: Boolean,
      default: false,
    },
    keyboardNavigation: {
      type: Boolean,
      default: true,
    },
    focusHighlight: {
      type: Boolean,
      default: true,
    },
    screenReader: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const PrivacySchema = new Schema(
  {
    anonymousAnalytics: {
      type: Boolean,
      default: true,
    },
    personalizedRecommendations: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const PreferencesSchema = new Schema(
  {
    appearance: {
      type: AppearanceSchema,
      default: () => ({ theme: "system" }),
    },
    notifications: {
      type: NotificationsSchema,
      default: () => defaultNotificationPreferences(),
    },
    languageRegion: {
      type: LanguageRegionSchema,
      default: () => defaultLanguageRegionPreferences(),
    },
    dashboard: {
      type: DashboardSchema,
      default: () => defaultDashboardPreferences(),
    },
    maps: {
      type: MapsSchema,
      default: () => defaultMapPreferences(),
    },
    accessibility: {
      type: AccessibilitySchema,
      default: () => defaultAccessibilityPreferences(),
    },
    privacy: {
      type: PrivacySchema,
      default: () => defaultPrivacyPreferences(),
    },
  },
  { _id: false },
);

function toPlainObject<T>(val: unknown): T | undefined {
  if (!val || typeof val !== "object") return undefined;
  if (typeof (val as any).toObject === "function") {
    return (val as any).toObject();
  }
  if (typeof (val as any).toJSON === "function") {
    return (val as any).toJSON();
  }
  return val as T;
}

export interface NormalizedUserPreferences {
  appearance: {
    theme: "light" | "dark" | "system";
  };
  notifications: NotificationPreferences;
  languageRegion: LanguageRegionPreferences;
  dashboard: DashboardPreferences;
  maps: MapPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
}

export function normalizeUserPreferences(
  raw?: Partial<IUser["preferences"]> | null,
): NormalizedUserPreferences {
  const rawObj = toPlainObject<Record<string, any>>(raw) || {};
  return {
    appearance: {
      theme: toPlainObject<{ theme?: "light" | "dark" | "system" }>(rawObj.appearance)?.theme ?? "system",
    },
    notifications: (() => {
      const notifs = toPlainObject<Record<string, any>>(rawObj.notifications);
      const defaults = defaultNotificationPreferences();
      if (!notifs) return defaults;
      const merged: Record<string, any> = { ...defaults };
      for (const cat of NOTIFICATION_CATEGORIES) {
        const catObj = toPlainObject<Record<string, any>>(notifs[cat]);
        merged[cat] = { ...(defaults as any)[cat], ...(catObj || {}) };
      }
      return merged as NotificationPreferences;
    })(),
    languageRegion: {
      ...defaultLanguageRegionPreferences(),
      ...(toPlainObject<LanguageRegionPreferences>(rawObj.languageRegion) || {}),
    },
    dashboard: {
      ...defaultDashboardPreferences(),
      ...(toPlainObject<DashboardPreferences>(rawObj.dashboard) || {}),
    },
    maps: {
      ...defaultMapPreferences(),
      ...(toPlainObject<MapPreferences>(rawObj.maps) || {}),
    },
    accessibility: {
      ...defaultAccessibilityPreferences(),
      ...(toPlainObject<AccessibilityPreferences>(rawObj.accessibility) || {}),
    },
    privacy: {
      ...defaultPrivacyPreferences(),
      ...(toPlainObject<PrivacyPreferences>(rawObj.privacy) || {}),
    },
  };
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

    // ─── Security Center Phase 1 ──────────────────────────────────────────
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

    // ─── Phase 4: Authority Enterprise Fields ────────────────────────────
    employeeId: { type: String, trim: true, sparse: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    assignedCities: { type: [String], default: [] },
    primaryCity: { type: String, trim: true },
    specializations: { type: [String], default: [] },
    availability: {
      type: String,
      enum: ["available", "busy", "on_leave", "inactive"],
      default: "available",
    },
    lifecycleEvents: {
      type: [
        {
          event: { type: String, required: true },
          description: { type: String, required: true },
          performedBy: { type: String },
          performedByName: { type: String },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false,
    },
    // Phase 7 — per-user notification category preferences
    notificationPreferences: {
      type: Map,
      of: Boolean,
      default: undefined,
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({
        appearance: { theme: "system" },
        notifications: defaultNotificationPreferences(),
        languageRegion: defaultLanguageRegionPreferences(),
        dashboard: defaultDashboardPreferences(),
        maps: defaultMapPreferences(),
        accessibility: defaultAccessibilityPreferences(),
        privacy: defaultPrivacyPreferences(),
      }),
    },
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

// Normalize preferences before validation to prevent casting errors on sparse documents
UserSchema.pre("validate", function (next) {
  if (this.preferences) {
    this.preferences = normalizeUserPreferences(this.preferences);
  }
  next();
});

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

export function isEligibleToAuthenticate(user: Pick<IUser, "role" | "approvalStatus">): boolean {
  return user.role !== "authority" || user.approvalStatus === "approved";
}

export function authorityApprovalMessage(user: Pick<IUser, "approvalStatus">): string {
  return user.approvalStatus === "rejected"
    ? "Your Authority account registration was not approved. Contact an administrator for details."
    : "Your Authority account is pending administrator approval.";
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;

export function isAccountLocked(user: Pick<IUser, "accountLockedUntil">): boolean {
  return !!user.accountLockedUntil && user.accountLockedUntil.getTime() > Date.now();
}

UserSchema.index({ role: 1 });
UserSchema.index({ city: 1 });
UserSchema.index({ role: 1, approvalStatus: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ assignedCities: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
