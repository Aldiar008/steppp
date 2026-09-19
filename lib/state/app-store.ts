"use client";

/**
 * The application's state, and nothing else.
 *
 *     profile · interview · route · previous route · completed steps
 *     selections · preferences · metadata
 *            ↓
 *          zustand
 *            ↓
 *     persist → localStorage["stepwise-storage"]
 *
 * This layer remembers. It does not compute: there is no `computeDoors` call
 * below, no catalogue, no date arithmetic, no notion of why a door closed. A
 * screen or service runs the engine and hands the finished `RouteResult` in.
 * Keeping it that way is what lets the engine stay pure and testable, and stops
 * the same calculation from existing in two places with two answers.
 *
 * Everything is local. Nothing here sends a profile anywhere — there is no
 * account, no server session, no database. A sixteen-year-old answering
 * questions about money and grades has not agreed to any of that, and the
 * product has not earned it.
 *
 * Note for later stages: `lib/store.ts` is the first-generation store behind
 * the screens that ship today, keyed `stepwise.v2`. This is the store for the
 * new engine, keyed `stepwise-storage`; the two never touch the same bytes.
 * When the screens move over, that file goes away and this one stays.
 */
import { z } from "zod";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createDefaultCareerState, type CareerState } from "@/lib/career/types";
import type { RouteResult } from "@/lib/engine";
import { createLocalStorage } from "@/lib/persistence";
import type { Profile } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Shape                                                                       */
/* -------------------------------------------------------------------------- */

export type Locale = "ru" | "kk" | "en";
export type Tone = "friendly" | "direct";

export interface InterviewState {
  started: boolean;
  completed: boolean;
  current_question_id?: string;
  /** Answered once each, in the order they were answered. */
  answered_question_ids: string[];
  /**
   * Waved away rather than answered. Kept apart from the answered ones because
   * they are two different facts: one is something the applicant told us, the
   * other is something they chose not to. The selector treats both as asked.
   */
  skipped_question_ids: string[];
  /**
   * What the applicant typed about themselves, verbatim.
   *
   * Stored because it is theirs and because the parser reads it. It is never
   * interpreted *here*: the store remembers, it does not extract.
   */
  raw_text?: string;
  /**
   * Contradictions the parser found in the applicant's own text.
   *
   * Kept rather than resolved. Two different budgets in one paragraph is a
   * question for the person who wrote it, not something to settle by picking
   * the larger number.
   */
  conflicts: { field: string; values: string[]; explanation: string }[];
}

export interface Preferences {
  locale: Locale;
  tone: Tone;
}

export interface AppMetadata {
  schema_version: number;
  /** ISO instant the stored route was computed at, supplied by the caller. */
  last_calculated_at?: string;
}

/**
 * The edit that produced the current board.
 *
 * Kept because a diff of two boards cannot say *what the applicant changed* —
 * it only knows what moved afterwards. The field and the two values are
 * recorded by whoever made the edit, at the one moment they are still known.
 */
export interface ProfileEdit {
  field: string;
  old_value: unknown;
  new_value: unknown;
  /** ISO instant, supplied by the caller. */
  at: string;
}

export type ActionStatus = "planned" | "doing" | "done";

export interface ActionState {
  status: ActionStatus;
  /** The day the applicant means to do it. Their plan, never a deadline. */
  planned_date?: string;
}

/** The half of the store that is data. Exactly this is persisted. */
export interface AppData {
  profile: Profile | null;

  interview: InterviewState;

  /** The board as last computed. Written by whoever ran the engine. */
  route: RouteResult | null;
  /** The board the applicant was looking at before the last recalculation. */
  previous_route: RouteResult | null;

  completed_action_ids: string[];

  /**
   * Where each step stands, beyond "done".
   *
   * "Сделано" alone forces a lie: a step you have not started has no honest
   * button. A step can be planned for a date, in progress, or finished, and the
   * date is the applicant's own intention — the engine never reads it and no
   * deadline moves because of it.
   *
   * `done` here and membership in `completed_action_ids` are the same fact kept
   * in two shapes: the engine takes a list of finished ids, the screen needs a
   * state per step.
   */
  action_states: Record<string, ActionState>;

  /** What the applicant last changed about themselves, if anything. */
  last_edit?: ProfileEdit;
  /** False while a change is still worth showing in the "что изменилось" view. */
  change_seen: boolean;

  selected_door_id?: string;
  /** At most two, for the comparison screen. */
  selected_compare_ids: string[];

  preferences: Preferences;
  metadata: AppMetadata;

  /** The career-interview module's own state — a standalone module, see lib/career. */
  career: CareerState;
}

export interface AppActions {
  setProfile: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  resetProfile: () => void;

  startInterview: () => void;
  completeInterview: () => void;
  setCurrentQuestion: (questionId: string | undefined) => void;
  answerQuestion: (questionId: string) => void;
  skipQuestion: (questionId: string) => void;
  setInterviewText: (text: string) => void;
  /** Records what the parser could not settle, so a screen can ask about it. */
  setInterviewConflicts: (conflicts: InterviewState["conflicts"]) => void;

  /** Stores a freshly computed board and keeps the outgoing one for the diff. */
  setRoute: (route: RouteResult, calculatedAt: string) => void;
  setPreviousRoute: (route: RouteResult | null) => void;

  markActionComplete: (actionId: string) => void;
  unmarkActionComplete: (actionId: string) => void;
  /** Sets where a step stands, with an optional date the applicant chose. */
  setActionStatus: (actionId: string, status: ActionStatus, plannedDate?: string) => void;
  /** Takes a step back to having no state at all. */
  clearActionStatus: (actionId: string) => void;

  /** Records the edit behind the newest board and marks it worth showing. */
  recordProfileEdit: (edit: ProfileEdit) => void;
  /** The applicant has read the change; stop offering it. */
  acknowledgeChange: () => void;

  selectDoor: (programId: string | undefined) => void;
  setCompareSelection: (programIds: readonly string[]) => void;
  toggleCompare: (programId: string) => void;
  clearCompareSelection: () => void;

  setLocale: (locale: Locale) => void;
  setTone: (tone: Tone) => void;

  resetApp: () => void;

  /** Set by the persist middleware once localStorage has been read. */
  setHasHydrated: (value: boolean) => void;

  /* Career interview ------------------------------------------------------ */

  /**
   * The one write path for the whole career-interview module. Every real
   * computation (scoring, question selection, widening, results) lives in
   * pure functions under `lib/career/` and runs in the hook that calls this
   * — the store's job stays "remember what the hook computed," the same
   * split as the rest of this file.
   */
  patchCareer: (patch: Partial<CareerState>) => void;
  resetCareer: () => void;
}

export interface AppState extends AppData, AppActions {
  /**
   * False until persisted state has been read back.
   *
   * Server-rendered markup cannot contain anything from localStorage, so a
   * screen that renders "0 doors" before this turns true is not showing a
   * result — it is showing the empty defaults, and saying so out loud is the
   * difference between a loading state and a lie.
   */
  hasHydrated: boolean;
}

/* -------------------------------------------------------------------------- */
/* Persistence                                                                 */
/* -------------------------------------------------------------------------- */

/** Namespaced on purpose: `app`/`state` would collide with anything else. */
export const APP_STORAGE_KEY = "stepwise-storage";

export const APP_SCHEMA_VERSION = 3;

export const MAX_COMPARE_SELECTION = 2;

/** A fresh, empty application. Built per call so nothing is ever shared. */
export function createDefaultAppData(): AppData {
  return {
    profile: null,
    interview: {
      started: false,
      completed: false,
      answered_question_ids: [],
      skipped_question_ids: [],
      conflicts: [],
    },
    route: null,
    previous_route: null,
    completed_action_ids: [],
    action_states: {},
    change_seen: true,
    selected_compare_ids: [],
    preferences: { locale: "ru", tone: "friendly" },
    metadata: { schema_version: APP_SCHEMA_VERSION },
    career: createDefaultCareerState(),
  };
}

/**
 * The data half of the state, and nothing else — no `hasHydrated`, no
 * actions. Shared by the `localStorage` persist config below and by
 * `lib/state/remote-sync.ts`, which upserts exactly this shape into
 * `student_state.state`: one field list, so the two never drift apart.
 */
export function partializeAppData(state: AppData): AppData {
  return {
    profile: state.profile,
    interview: state.interview,
    route: state.route,
    previous_route: state.previous_route,
    completed_action_ids: state.completed_action_ids,
    action_states: state.action_states,
    last_edit: state.last_edit,
    change_seen: state.change_seen,
    selected_door_id: state.selected_door_id,
    selected_compare_ids: state.selected_compare_ids,
    preferences: state.preferences,
    metadata: state.metadata,
    career: state.career,
  };
}

/**
 * A deliberately shallow guard over persisted state.
 *
 * Its job is not to re-describe the domain — `lib/types.ts` already does, and a
 * second copy would drift. Its job is to survive a `localStorage` entry that a
 * browser extension, a half-finished write or an older build left broken, so a
 * returning applicant gets an empty app instead of a white screen. Anything
 * structurally sound passes through untouched, unknown keys included.
 */
const interviewSchema = z.looseObject({
  started: z.boolean(),
  completed: z.boolean(),
  current_question_id: z.string().optional(),
  answered_question_ids: z.array(z.string()),
  skipped_question_ids: z.array(z.string()).optional(),
  raw_text: z.string().optional(),
  conflicts: z
    .array(z.looseObject({ field: z.string(), values: z.array(z.string()), explanation: z.string() }))
    .optional(),
});

const profileSchema = z.looseObject({
  interests: z.array(z.string()),
  countries: z.array(z.string()),
  languages: z.array(z.unknown()),
  exams: z.array(z.unknown()),
  constraints: z.looseObject({}),
});

const routeSchema = z.looseObject({
  doors: z.array(z.unknown()),
  summary: z.looseObject({}),
});

const careerEvidenceSchema = z.looseObject({
  dimension: z.string(),
  shift: z.number(),
  quote: z.string(),
  question_id: z.string(),
});

const careerAnswerRecordSchema = z.looseObject({
  question_id: z.string(),
  question_text: z.string(),
  answer_text: z.string(),
  source: z.enum(["stage1", "stage2", "stage3a", "stage3b"]),
});

const careerStage2StateSchema = z.looseObject({
  field: z.string(),
  remaining: z.array(z.string()),
  tally: z.record(z.string(), z.number()),
  askedBankIds: z.array(z.string()),
  lastAxis: z.string().optional(),
  stalledStreak: z.number(),
  previousTopThree: z.array(z.string()).nullable(),
});

const careerWidenStateSchema = z.looseObject({
  round: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  phase: z.enum(["list", "clarify"]).nullable(),
  rejected: z.array(
    z.looseObject({
      id: z.string(),
      round: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      reason: z.string().optional(),
    }),
  ),
  lastRejectedId: z.string().optional(),
  originField: z.string().optional(),
  clarifyBranch: z.enum(["what", "where", "how_long"]).optional(),
});

const careerResultItemSchema = z.looseObject({
  id: z.string(),
  field: z.string(),
  label: z.string(),
  why: z.string(),
  hard: z.string(),
});

const careerStateSchema = z.looseObject({
  stage: z.enum(["idle", "stage1", "stage1_optional", "stage2", "stage3a", "stage3b", "result", "crisis"]),
  vector: z.looseObject({ facets: z.record(z.string(), z.number()), axes: z.record(z.string(), z.number()) }),
  evidence: z.array(careerEvidenceSchema),
  aversionLabels: z.array(z.string()),
  vetoedIds: z.array(z.string()),
  fieldBonuses: z.record(z.string(), z.number()),
  answers: z.array(careerAnswerRecordSchema),
  askedStage1Ids: z.array(z.string()),
  candidateFields: z.array(z.string()),
  stage2: careerStage2StateSchema.nullable(),
  widen: careerWidenStateSchema,
  stage3bHistory: z.array(z.looseObject({ question: z.string(), answer: z.string() })),
  stage3bTurns: z.number(),
  result: z
    .looseObject({
      items: z.array(careerResultItemSchema),
      generated_at: z.string(),
      source: z.enum(["stage2", "stage3a", "stage3b"]),
    })
    .nullable(),
  crisisTriggered: z.boolean(),
  monosyllabicStreak: z.number(),
});

const persistedSchema = z.looseObject({
  profile: profileSchema.nullable().optional(),
  interview: interviewSchema.optional(),
  route: routeSchema.nullable().optional(),
  previous_route: routeSchema.nullable().optional(),
  completed_action_ids: z.array(z.string()).optional(),
  action_states: z
    .record(
      z.string(),
      z.looseObject({
        status: z.enum(["planned", "doing", "done"]),
        planned_date: z.string().max(10).optional(),
      }),
    )
    .optional(),
  last_edit: z
    .looseObject({ field: z.string(), at: z.string() })
    .nullable()
    .optional(),
  change_seen: z.boolean().optional(),
  selected_door_id: z.string().optional(),
  selected_compare_ids: z.array(z.string()).optional(),
  preferences: z
    .looseObject({
      locale: z.enum(["ru", "kk", "en"]),
      tone: z.enum(["friendly", "direct"]),
    })
    .optional(),
  metadata: z.looseObject({ schema_version: z.number() }).optional(),
  career: careerStateSchema.optional(),
});

/**
 * Upgrades from an older persisted shape, one version at a time.
 *
 * Each step is a pure function from the previous shape to the next, so adding
 * version 3 later means adding one entry and nothing else. A payload from a
 * *newer* build cannot be understood by this one and is discarded rather than
 * half-read — downgrading is not a migration.
 */
const MIGRATIONS: Readonly<Record<number, (state: Record<string, unknown>) => Record<string, unknown>>> = {
  /**
   * 0 → 1. Version 0 is anything written before this schema carried a version:
   * it tracked finished steps as `completed` and had no route, interview or
   * preferences. The list of finished steps is the one piece worth keeping —
   * it is work the applicant actually did — and the rest takes today's
   * defaults rather than being guessed at.
   */
  0: (state) => {
    const legacyCompleted = Array.isArray(state.completed)
      ? state.completed.filter((id): id is string => typeof id === "string")
      : [];

    const dropped = new Set(["completed", "changePending", "previous"]);
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state)) {
      if (!dropped.has(key)) next[key] = value;
    }
    next.completed_action_ids = legacyCompleted;
    return next;
  },

  /**
   * 2 → 3. The old `profession` module (5 fixed clusters, a flat
   * specialization list) was replaced wholesale by `lib/career`'s 16-axis
   * model — there is no honest way to turn five cluster scores into a
   * 16-dimension vector, so an in-progress career interview is dropped
   * rather than guessed at. Nothing else about the applicant's account is
   * affected: their route, profile and progress carry over untouched.
   */
  2: (state) => {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state)) {
      if (key !== "profession") next[key] = value;
    }
    return next;
  },
};

/**
 * Persisted bytes in, usable state out — or the empty app, never an exception.
 *
 * Exported because a migration is real behaviour with real failure modes, and
 * something that only runs on a returning user's first paint deserves to be
 * testable directly.
 */
export function migrateAppState(persisted: unknown, version: number): AppData {
  const defaults = createDefaultAppData();
  if (!isRecord(persisted)) return defaults;

  // A payload from a future version cannot be read by this build.
  if (version > APP_SCHEMA_VERSION) return defaults;

  let migrated: Record<string, unknown> = persisted;
  for (let from = version; from < APP_SCHEMA_VERSION; from += 1) {
    const step = MIGRATIONS[from];
    if (step !== undefined) migrated = step(migrated);
  }

  const parsed = persistedSchema.safeParse(migrated);
  if (!parsed.success) return defaults;

  const data = parsed.data;
  const restored: AppData = {
    ...defaults,
    ...(data as Partial<AppData>),
    // Merged rather than replaced: a payload written before a field existed
    // must come back with today's default for it, not with `undefined`.
    interview: { ...defaults.interview, ...(data.interview as InterviewState | undefined) },
    preferences: { ...defaults.preferences, ...(data.preferences as Preferences | undefined) },
    // `last_calculated_at` has to survive this round trip like everything else
    // above it: it is what lets `lib/state/remote-sync.ts` tell a locally
    // computed board apart from a stale one without it, every reload would
    // look like neither side has ever computed anything.
    metadata: { ...defaults.metadata, ...(data.metadata as AppMetadata | undefined), schema_version: APP_SCHEMA_VERSION },
    // Absent entirely on anything saved before this module existed — the
    // default fills it, exactly like `interview` and `preferences` above.
    career: { ...defaults.career, ...(data.career as CareerState | undefined) },
  };

  // Invariants the rest of the app relies on, re-established on load.
  restored.completed_action_ids = unique(restored.completed_action_ids);
  restored.action_states = restored.action_states ?? {};
  restored.selected_compare_ids = unique(restored.selected_compare_ids).slice(
    0,
    MAX_COMPARE_SELECTION,
  );
  restored.interview.answered_question_ids = unique(restored.interview.answered_question_ids);
  restored.interview.skipped_question_ids = unique(restored.interview.skipped_question_ids ?? []);
  restored.interview.conflicts = restored.interview.conflicts ?? [];

  return restored;
}

/* -------------------------------------------------------------------------- */
/* Store                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The single state layer.
 *
 * Every action below is a small, total change to state. None of them reach for
 * a clock, a network or `window`: a timestamp that matters is passed in, so the
 * same sequence of calls always produces the same store.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createDefaultAppData(),
      hasHydrated: false,

      /* Profile ------------------------------------------------------------ */

      setProfile: (profile) => set({ profile }),

      updateProfile: (patch) => {
        const current = get().profile;
        if (current === null) return;
        // A new object every time: React and the diff both compare by identity.
        set({ profile: { ...current, ...patch } });
      },

      resetProfile: () => set({ profile: null }),

      /* Interview ---------------------------------------------------------- */

      startInterview: () =>
        set((state) => ({ interview: { ...state.interview, started: true, completed: false } })),

      completeInterview: () =>
        set((state) => ({
          interview: { ...state.interview, started: true, completed: true },
        })),

      setCurrentQuestion: (questionId) =>
        set((state) => ({ interview: { ...state.interview, current_question_id: questionId } })),

      answerQuestion: (questionId) =>
        set((state) => {
          if (state.interview.answered_question_ids.includes(questionId)) return {};
          return {
            interview: {
              ...state.interview,
              answered_question_ids: [...state.interview.answered_question_ids, questionId],
            },
          };
        }),

      skipQuestion: (questionId) =>
        set((state) => {
          if (state.interview.skipped_question_ids.includes(questionId)) return {};
          return {
            interview: {
              ...state.interview,
              skipped_question_ids: [...state.interview.skipped_question_ids, questionId],
            },
          };
        }),

      setInterviewText: (text) =>
        set((state) => ({ interview: { ...state.interview, raw_text: text } })),

      setInterviewConflicts: (conflicts) =>
        set((state) => ({ interview: { ...state.interview, conflicts } })),

      /* Route -------------------------------------------------------------- */

      setRoute: (route, calculatedAt) =>
        set((state) => ({
          route,
          // The board being replaced is exactly what the change screen needs to
          // diff against, so it is kept here rather than left to the caller to
          // remember at the one moment it is still available.
          previous_route: state.route,
          metadata: { ...state.metadata, last_calculated_at: calculatedAt },
        })),

      setPreviousRoute: (route) => set({ previous_route: route }),

      /* Progress ----------------------------------------------------------- */

      markActionComplete: (actionId) =>
        set((state) => {
          if (state.completed_action_ids.includes(actionId)) return {};
          return {
            completed_action_ids: [...state.completed_action_ids, actionId],
            action_states: { ...state.action_states, [actionId]: { status: "done" } },
          };
        }),

      unmarkActionComplete: (actionId) =>
        set((state) => {
          return {
            completed_action_ids: state.completed_action_ids.filter((id) => id !== actionId),
            action_states: without(state.action_states, actionId),
          };
        }),

      setActionStatus: (actionId, status, plannedDate) =>
        set((state) => {
          const entry: ActionState = { status };
          if (plannedDate !== undefined && plannedDate !== "") entry.planned_date = plannedDate;

          // The finished list and the state map are one fact in two shapes, so
          // they are written together and can never disagree.
          const completed = state.completed_action_ids.filter((id) => id !== actionId);
          if (status === "done") completed.push(actionId);

          return {
            action_states: { ...state.action_states, [actionId]: entry },
            completed_action_ids: completed,
          };
        }),

      clearActionStatus: (actionId) =>
        set((state) => {
          return {
            action_states: without(state.action_states, actionId),
            completed_action_ids: state.completed_action_ids.filter((id) => id !== actionId),
          };
        }),

      recordProfileEdit: (edit) => set({ last_edit: edit, change_seen: false }),

      acknowledgeChange: () => set({ change_seen: true }),

      /* Selections --------------------------------------------------------- */

      // `undefined` clears the selection; it is dropped on the way to storage.
      selectDoor: (programId) => set({ selected_door_id: programId }),

      setCompareSelection: (programIds) =>
        set({ selected_compare_ids: unique(programIds).slice(0, MAX_COMPARE_SELECTION) }),

      /**
       * One tap per door.
       *
       * A door already chosen is dropped, an empty slot is filled, and choosing
       * a third door pushes out the one chosen first — tapping something and
       * having nothing happen reads as a broken screen.
       */
      toggleCompare: (programId) =>
        set((state) => {
          const current = state.selected_compare_ids;
          if (current.includes(programId)) {
            return { selected_compare_ids: current.filter((id) => id !== programId) };
          }
          const kept = current.slice(Math.max(0, current.length - (MAX_COMPARE_SELECTION - 1)));
          return { selected_compare_ids: [...kept, programId] };
        }),

      clearCompareSelection: () => set({ selected_compare_ids: [] }),

      /* Preferences -------------------------------------------------------- */

      setLocale: (locale) => set((state) => ({ preferences: { ...state.preferences, locale } })),

      setTone: (tone) => set((state) => ({ preferences: { ...state.preferences, tone } })),

      /* Lifecycle ---------------------------------------------------------- */

      /**
       * Back to an empty app, through the store rather than around it.
       *
       * Language and tone survive: they are how the applicant reads the screen,
       * not something they entered about themselves, and resetting them would
       * hand a Kazakh-speaking user a Russian interface as a side effect of
       * starting over. Persistence follows from the state change, so no
       * `localStorage` key is cleared by hand here.
       */
      resetApp: () =>
        set((state) => ({
          ...createDefaultAppData(),
          // `set` merges, and the defaults simply omit these optional keys, so
          // they have to be cleared by name or they survive the reset.
          selected_door_id: undefined,
          last_edit: undefined,
          preferences: state.preferences,
        })),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      /* Career interview ----------------------------------------------------- */

      patchCareer: (patch) => set((state) => ({ career: { ...state.career, ...patch } })),

      resetCareer: () => set({ career: createDefaultCareerState() }),
    }),
    {
      name: APP_STORAGE_KEY,
      version: APP_SCHEMA_VERSION,
      // Reads and writes are guarded against a missing `window`, so importing
      // this module during a server render is safe; only the hook is not.
      storage: createLocalStorage<AppState>(),
      partialize: (state) => partializeAppData(state) as AppState,
      migrate: (persisted, version) => migrateAppState(persisted, version) as AppState,
      /**
       * Zustand only calls `migrate` when the stored version differs from this
       * one, so validation cannot live there alone: an entry written by *this*
       * build and then corrupted — a truncated write, an extension, a user
       * editing devtools — would be merged in unchecked. Everything that comes
       * back from storage passes through the same repair, whatever version it
       * claims.
       */
      merge: (persisted, current) => ({
        ...current,
        ...migrateAppState(persisted, APP_SCHEMA_VERSION),
      }),
      onRehydrateStorage: () => (state) => {
        // Reached whether or not anything was stored, and whether or not it
        // parsed, so the UI is never left waiting on a hydration that already
        // happened.
        state?.setHasHydrated(true);
      },
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** The same map without one key, leaving the original untouched. */
function without<T>(map: Record<string, T>, key: string): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [id, value] of Object.entries(map)) if (id !== key) next[id] = value;
  return next;
}

function unique(values: readonly string[]): string[] {
  const seen: string[] = [];
  for (const value of values) if (!seen.includes(value)) seen.push(value);
  return seen;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
