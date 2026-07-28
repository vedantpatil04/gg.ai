import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import { User, type IUser } from "../models/User";
import { storage } from "./storage/storage";
import { isValidImageBuffer, isWithinDimensionLimits } from "../middleware/uploadPhoto";
import { AppError } from "../middleware/errorHandler";
import { emitProfileEvent, PROFILE_EVENTS } from "../events/profileEvents";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadProfilePhoto(
  userId: mongoose.Types.ObjectId,
  file: { buffer: Buffer; mimetype: string },
): Promise<IUser> {
  // Phase 3 — magic-byte check (MIME spoofing defence)
  if (!isValidImageBuffer(file.buffer, file.mimetype)) {
    throw new AppError("This doesn't look like a valid image file", 400);
  }

  // Phase 9 — dimension guard (decompression-bomb defence)
  if (!isWithinDimensionLimits(file.buffer, file.mimetype)) {
    throw new AppError("Image dimensions are too large. Please upload a smaller image.", 400);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const hadPreviousPhoto = Boolean(user.avatar);
  const previousAvatar = user.avatar;

  const extension = EXTENSION_BY_MIME[file.mimetype] ?? "jpg";
  const filename = `${userId.toString()}-${uuid()}.${extension}`;
  const url = await storage.save(file.buffer, filename, file.mimetype);

  user.avatar = url;
  user.profileUpdatedAt = new Date();
  await user.save();

  // Best-effort cleanup of the old file — never lets a stale image block
  // the update the person is actually waiting on.
  if (hadPreviousPhoto && previousAvatar) {
    storage.delete(previousAvatar).catch(() => {
      /* logged inside the provider's own error paths where relevant */
    });
  }

  emitProfileEvent(
    hadPreviousPhoto ? PROFILE_EVENTS.PHOTO_UPDATED : PROFILE_EVENTS.PHOTO_UPLOADED,
    { userId: userId.toString(), avatar: url },
  );

  return user;
}

export async function removeProfilePhoto(userId: mongoose.Types.ObjectId): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  const previousAvatar = user.avatar;
  if (!previousAvatar) return user; // nothing to remove — treat as a no-op success

  user.avatar = undefined;
  user.profileUpdatedAt = new Date();
  await user.save();

  await storage.delete(previousAvatar).catch(() => {
    /* file already gone / not ours — safe to ignore, DB is the source of truth */
  });

  emitProfileEvent(PROFILE_EVENTS.PHOTO_REMOVED, { userId: userId.toString() });

  return user;
}
