import { logger } from "../utils/logger";

/**
 * Reserved event names for the Profile Picture workflow. No Notification
 * or Activity module subscribes to these yet (both are explicitly out of
 * scope for this phase) — this just makes the emit points real and
 * exercised now, so wiring a subscriber later is additive, not a redesign.
 */
export const PROFILE_EVENTS = {
  PHOTO_UPLOADED: "ProfilePictureUploaded",
  PHOTO_UPDATED: "ProfilePictureUpdated",
  PHOTO_REMOVED: "ProfilePictureRemoved",
} as const;

export type ProfileEventName = (typeof PROFILE_EVENTS)[keyof typeof PROFILE_EVENTS];

export interface ProfileEventPayload {
  userId: string;
  avatar?: string;
}

/**
 * No-op today beyond logging — swap the body for an EventEmitter#emit,
 * a queue publish, etc. once something needs to listen.
 */
export function emitProfileEvent(event: ProfileEventName, payload: ProfileEventPayload): void {
  logger.info(`[profile-event] ${event}`, payload);
}
