import mongoose, { Document, Schema } from "mongoose";

/**
 * Phase 3 — FCM Device Token registry.
 *
 * One document per (user, physical device/app-install). A user may have
 * many active tokens at once (phone + tablet + reinstall left dangling
 * until it naturally errors out — see push.service.ts's stale-token
 * cleanup). A token belongs to exactly one user at a time: logging out on
 * a device and a different user logging back in on the *same* device
 * re-registers the same FCM token string, which upserts this document's
 * `userId` rather than creating a duplicate row — see
 * push.service.ts#registerDeviceToken.
 */

export type DevicePlatform = "android" | "ios" | "web";

export interface IDeviceToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  /** Capacitor appId, e.g. "com.vedant.greenguard" — lets a future web push
   *  or a second native app share this collection without ambiguity. */
  appId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // A given FCM token is unique per physical app install — never shared
    // across users at the same time, which is what makes the upsert-by-token
    // re-association on login/logout (see push.service.ts) correct.
    token: { type: String, required: true, unique: true, trim: true },
    platform: {
      type: String,
      enum: ["android", "ios", "web"],
      default: "android",
    },
    appId: { type: String, trim: true },
    active: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Central push service's primary access pattern: "every active token for
// this user".
DeviceTokenSchema.index({ userId: 1, active: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>("DeviceToken", DeviceTokenSchema);
