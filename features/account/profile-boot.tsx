"use client";

import { useProfileSession } from "./use-profile-session";

/**
 * Points the application state at the active profile before any screen reads it.
 *
 * Renders nothing. It exists because the store is created pointing at the
 * default storage key, and the person using the app may be in a different box —
 * every screen below would otherwise read one profile's answers for a frame and
 * then swap.
 */
export function ProfileBoot() {
  useProfileSession();
  return null;
}
