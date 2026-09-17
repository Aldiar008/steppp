"use client";

import { useEffect, useState } from "react";

import { useProfileStore } from "@/lib/state/profile-store";
import { activeSlot, personalSlots, type ProfileSlot } from "@/lib/state/profiles";

/**
 * Reads the browser once and tells every screen who is signed in.
 *
 * The boot has to happen before a screen reads the application store, because
 * the store starts out pointed at the default key and the active profile may
 * live under a different one. Doing it in a lazy `useState` initialiser rather
 * than an effect is deliberate: an effect runs after paint, and the board would
 * flash somebody else's numbers for a frame before switching.
 *
 * `bootProfiles` guards itself against being called twice, which is what makes
 * that safe under React's double-render in development.
 */
export function useProfileSession(): {
  ready: boolean;
  slot: ProfileSlot | undefined;
  profiles: ProfileSlot[];
} {
  const boot = useProfileStore((state) => state.boot);
  const registry = useProfileStore((state) => state.registry);
  const ready = useProfileStore((state) => state.ready);

  useState(() => {
    if (!ready) boot(new Date().toISOString());
  });

  // A second, harmless pass for the case where the store was created before
  // this component mounted — `boot` is idempotent.
  useEffect(() => {
    if (!ready) boot(new Date().toISOString());
  }, [boot, ready]);

  return { ready, slot: activeSlot(registry), profiles: personalSlots(registry) };
}

/** The timestamp the profile actions want. Kept in one place, not scattered. */
export function nowIso(): string {
  return new Date().toISOString();
}
