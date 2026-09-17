"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Profile } from "@/types/domain";
import { createLocalStorage, STORAGE_KEY } from "./persistence";

export interface Snapshot {
  profile: Profile;
  completed: string[];
  takenAt: string;
}

interface StepwiseState {
  profile: Profile | null;
  /** Requirement ids the applicant has ticked off. */
  completed: string[];
  /**
   * The state right before the most recent profile edit. The change screen
   * recomputes both boards from this, which is possible only because the engine
   * is deterministic. Storing profiles instead of results keeps this tiny.
   */
  previous: Snapshot | null;
  /** Set when a profile edit produced something worth showing. */
  changePending: boolean;

  setProfile: (profile: Profile) => void;
  /** Applies an edit and records the before-state for the change screen. */
  updateProfile: (patch: Partial<Profile>) => void;
  toggleRequirement: (id: string) => void;
  acknowledgeChange: () => void;
  reset: () => void;
}

export const emptyProfile = (): Profile => ({
  rawStatement: "",
  homeCountry: "KZ",
  grade: "11",
  intakeYear: new Date().getUTCFullYear() + 1,
  targetCountries: [],
  interest: "undecided",
  budget: "under_15k",
  exams: {
    nationalScore: null,
    nationalTaken: false,
    gpa: null,
    sat: null,
    languageTest: "none",
    languageScore: null,
  },
  strengths: {},
  updatedAt: new Date().toISOString(),
});

/** Only the data half of the store is persisted; actions are re-attached by zustand. */
type PersistedSlice = Pick<StepwiseState, "profile" | "completed" | "previous" | "changePending">;

const BLANK: PersistedSlice = {
  profile: null,
  completed: [],
  previous: null,
  changePending: false,
};

function blankPersisted(): StepwiseState {
  return BLANK as StepwiseState;
}

export const useStepwise = create<StepwiseState>()(
  persist(
    (set, get) => ({
      profile: null,
      completed: [],
      previous: null,
      changePending: false,

      setProfile: (profile) => set({ profile: { ...profile, updatedAt: new Date().toISOString() } }),

      updateProfile: (patch) => {
        const current = get().profile;
        if (!current) return;
        set({
          previous: { profile: current, completed: [...get().completed], takenAt: new Date().toISOString() },
          profile: { ...current, ...patch, updatedAt: new Date().toISOString() },
          changePending: true,
        });
      },

      toggleRequirement: (id) =>
        set((s) => ({
          completed: s.completed.includes(id)
            ? s.completed.filter((x) => x !== id)
            : [...s.completed, id],
        })),

      acknowledgeChange: () => set({ changePending: false }),

      reset: () => set({ profile: null, completed: [], previous: null, changePending: false }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createLocalStorage<StepwiseState>(),
      partialize: (s) =>
        ({
          profile: s.profile,
          completed: s.completed,
          previous: s.previous,
          changePending: s.changePending,
        }) satisfies PersistedSlice as StepwiseState,
      /**
       * The prototype persisted without a migration, so any shape change would
       * have bricked returning users. Unknown old shapes are discarded rather
       * than half-read.
       */
      migrate: (persisted, version): StepwiseState => {
        if (version < 2) return blankPersisted();
        return persisted as StepwiseState;
      },
    },
  ),
);

const noopSubscribe = () => () => {};

/**
 * Persisted state cannot exist during server rendering, so any screen reading
 * the store must wait for hydration before trusting it. Without this the markup
 * the server produced and the markup the client produces disagree.
 *
 * Implemented with `useSyncExternalStore` rather than an effect: the two
 * snapshots differ by design, which is exactly what this hook is asking about.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
