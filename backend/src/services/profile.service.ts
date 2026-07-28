import mongoose from "mongoose";
import { User, type IUser, type Gender } from "../models/User";

/**
 * Phase 3 — Personal Information / Edit Profile.
 *
 * Mirrors the "Controller → Validation → Service → Database" split the spec
 * asks for: the controller only extracts req.user/req.body and forwards
 * here; the validator (profile.validator.ts) is the request-shape gate;
 * this service owns turning a validated partial payload into the exact
 * Mongo update.
 *
 * Two things worth calling out:
 *  - `displayName` maps onto the existing `name` field rather than adding
 *    a parallel one — `name` is already read everywhere else in the app
 *    (headers, avatars, complaint/report attribution) as "the" display
 *    name, so keeping it as the single source of truth avoids a split-
 *    brain field instead of inventing a second copy of the same concept.
 *  - Clearing an optional field sends `""` from the form; that's turned
 *    into `$unset` here rather than `$set` to `""`, so it never collides
 *    with the schema's `minlength` on firstName/lastName and reads as
 *    "not provided" everywhere the frontend already checks for that
 *    (`hasValue()`), not as a stored empty string.
 */
export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  /** Maps to the existing `name` field. */
  displayName?: string;
  phone?: string;
  /** ISO date string ("YYYY-MM-DD"), or "" to clear. */
  dateOfBirth?: string;
  /** One of the Gender enum values, or "" to clear. */
  gender?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
}

const CLEARABLE_STRING_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "addressLine",
  "city",
  "state",
  "country",
  "pinCode",
] as const;

export async function updatePersonalInformation(
  userId: mongoose.Types.ObjectId,
  input: ProfileUpdateInput,
): Promise<IUser | null> {
  const set: Record<string, unknown> = {};
  const unset: Record<string, "" | 1> = {};

  if (input.displayName !== undefined) {
    // displayName is required-if-present at the validator level, so it's
    // never an empty string by the time it reaches here.
    set.name = input.displayName.trim();
  }

  for (const key of CLEARABLE_STRING_FIELDS) {
    const value = input[key];
    if (value === undefined) continue;
    const trimmed = value.trim();
    if (trimmed === "") unset[key] = "";
    else set[key] = trimmed;
  }

  if (input.gender !== undefined) {
    if (input.gender === "") unset.gender = "";
    else set.gender = input.gender as Gender;
  }

  if (input.dateOfBirth !== undefined) {
    if (input.dateOfBirth === "") {
      unset.dateOfBirth = "";
    } else {
      set.dateOfBirth = new Date(input.dateOfBirth);
    }
  }

  // Distinct from Mongoose's own `updatedAt` (bumped on any document
  // write, e.g. lastLogin) — this specifically tracks identity-form edits.
  set.profileUpdatedAt = new Date();

  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  return User.findByIdAndUpdate(userId, update, { new: true, runValidators: true });
}
