"use client";

/**
 * Who is using the app right now, as state a screen can subscribe to.
 *
 * Thin on purpose. The registry algebra lives in `profiles.ts` and is pure; the
 * key-switching lives in `profile-session.ts` and is careful about order. This
 * only holds the current registry, calls those two, and writes the result — so
 * the sidebar and the sign-in screen cannot disagree about whose profile is
 * open.
 */
import { create } from "zustand";

import type { Profile } from "@/lib/types";
import { useAppStore } from "./app-store";
import { activateSlot, bootProfiles } from "./profile-session";
import {
  activeSlot,
  dropStoredState,
  emptyRegistry,
  ensureDemoSlot,
  findSlot,
  personalSlots,
  removeSlot,
  rename,
  setActive,
  signIn,
  storageKeyFor,
  touch,
  writeRegistry,
  type ProfileRegistry,
  type ProfileSlot,
} from "./profiles";

/**
 * Nobody signed in.
 *
 * Kept out of the registry: a guest is not a profile somebody made, and putting
 * them in the list would offer "Гость" as something to come back to. It exists
 * so that leaving a profile has somewhere to land that is not somebody else's
 * box.
 */
export const GUEST_SLOT: ProfileSlot = {
  id: "guest",
  first_name: "Гость",
  last_name: "",
  kind: "personal",
  storage_key: storageKeyFor("guest"),
  created_at: "",
  updated_at: "",
};

interface ProfileState {
  registry: ProfileRegistry;
  /** False until the browser has been read; screens must not decide before it. */
  ready: boolean;

  boot: (now: string) => void;
  signInAs: (firstName: string, lastName: string, now: string) => ProfileSlot;
  openDemo: (demoProfile: Profile, now: string) => ProfileSlot;
  switchTo: (id: string, now: string) => void;
  leave: () => void;
  renameSlot: (id: string, firstName: string, lastName: string, now: string) => void;
  forget: (id: string) => void;
}

function commit(registry: ProfileRegistry): ProfileRegistry {
  writeRegistry(registry);
  return registry;
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  registry: emptyRegistry(),
  ready: false,

  boot: (now) => set({ registry: bootProfiles(now), ready: true }),

  signInAs: (firstName, lastName, now) => {
    const result = signIn(get().registry, firstName, lastName, now);
    activateSlot(result.slot);
    set({ registry: commit(result.registry), ready: true });
    return result.slot;
  },

  /**
   * The demo, in a box of its own.
   *
   * This is the bug that started the feature: looking at the demo used to
   * overwrite the only profile there was. It now has its own storage key, so
   * whoever is signed in is still there afterwards.
   *
   * Seeded once rather than on every visit: after the first look it behaves
   * like any other profile, and answering a question inside it is not undone
   * by walking away from the screen.
   */
  openDemo: (demoProfile, now) => {
    const { registry, slot } = ensureDemoSlot(get().registry, now);
    activateSlot(slot);
    if (useAppStore.getState().profile === null) useAppStore.getState().setProfile(demoProfile);
    set({ registry: commit(setActive(touch(registry, slot.id, now), slot.id)), ready: true });
    return slot;
  },

  switchTo: (id, now) => {
    const slot = findSlot(get().registry, id);
    if (slot === undefined) return;
    activateSlot(slot);
    set({ registry: commit(setActive(touch(get().registry, id, now), id)) });
  },

  /** Step out without deleting anything. The box stays; the app stops reading it. */
  leave: () => {
    activateSlot(GUEST_SLOT);
    set({ registry: commit(setActive(get().registry, null)) });
  },

  renameSlot: (id, firstName, lastName, now) =>
    set({ registry: commit(rename(get().registry, id, firstName, lastName, now)) }),

  /**
   * Forget a profile: the name goes, and so does the data behind it.
   *
   * Deleting the list entry alone would leave the answers sitting in the
   * browser with nothing pointing at them, which is the worst of both — gone
   * from the person's view, still on their machine.
   */
  forget: (id) => {
    const slot = findSlot(get().registry, id);
    if (slot === undefined) return;

    const next = removeSlot(get().registry, id);
    dropStoredState(slot.storage_key);

    if (get().registry.active_id === id) {
      const fallback = personalSlots(next)[0];
      if (fallback === undefined) activateSlot(GUEST_SLOT);
      else activateSlot(fallback);
      set({ registry: commit(setActive(next, fallback?.id ?? null)) });
      return;
    }
    set({ registry: commit(next) });
  },
}));

/** The slot whose data is loaded, or undefined when nobody is signed in. */
export function useActiveSlot(): ProfileSlot | undefined {
  return useProfileStore((state) => activeSlot(state.registry));
}
