import { beforeEach, describe, expect, it } from "vitest";

import {
  APP_SCHEMA_VERSION,
  APP_STORAGE_KEY,
  createDefaultAppData,
  migrateAppState,
  useAppStore,
  type AppData,
} from "@/lib/state/app-store";
import type { RouteResult } from "@/lib/engine";
import type { Profile } from "@/lib/types";

/**
 * The store is the only thing in the product with a memory, which makes its
 * failures the ones an applicant feels most: an answer that vanishes on reload,
 * a finished step that comes back, a comparison that will not let go of a door.
 *
 * These tests pin that state changes are small and immutable, that nothing here
 * computes a route, and that a broken `localStorage` entry costs a returning
 * user their data but never the application.
 */

function profile(over: Partial<Profile> = {}): Profile {
  return {
    interests: ["программирование"],
    countries: ["DE"],
    languages: [{ code: "en", level: "B2" }],
    exams: [],
    constraints: {},
    ...over,
  };
}

/** A route as the engine would hand one over; the store treats it as opaque. */
function route(programId: string): RouteResult {
  return {
    doors: [
      {
        program_id: programId,
        status: "open",
        point_of_no_return: "2026-11-20",
        days_remaining: 64,
        next_critical_action_id: "apply",
        action_chain: ["apply"],
        matched_requirements: [],
        unmatched_requirements: [],
        score: 80,
        confidence: "verified",
        explanation_facts: { reasons: [], blockers: [] },
      },
    ],
    summary: { total: 1, open: 1, closing_soon: 0, closed: 0, needs_data: 0 },
  };
}

const store = () => useAppStore.getState();

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ ...createDefaultAppData(), hasHydrated: false });
});

describe("initial state", () => {
  it("starts empty, and says it has not read storage yet", () => {
    const state = store();

    expect(state.profile).toBeNull();
    expect(state.route).toBeNull();
    expect(state.previous_route).toBeNull();
    expect(state.completed_action_ids).toEqual([]);
    expect(state.selected_compare_ids).toEqual([]);
    expect(state.selected_door_id).toBeUndefined();
    expect(state.interview).toEqual({
      started: false,
      completed: false,
      answered_question_ids: [],
      skipped_question_ids: [],
      conflicts: [],
    });
    expect(state.preferences).toEqual({ locale: "ru", tone: "friendly" });
    expect(state.metadata.schema_version).toBe(APP_SCHEMA_VERSION);
    expect(state.metadata.last_calculated_at).toBeUndefined();
    expect(state.hasHydrated).toBe(false);
  });

  it("hands out a fresh defaults object every time", () => {
    const first = createDefaultAppData();
    const second = createDefaultAppData();

    expect(first).toEqual(second);
    expect(first.interview).not.toBe(second.interview);
    expect(first.completed_action_ids).not.toBe(second.completed_action_ids);
  });
});

describe("profile", () => {
  it("stores what it is given", () => {
    const applicant = profile();
    store().setProfile(applicant);

    expect(store().profile).toEqual(applicant);
  });

  it("patches one field and keeps the rest", () => {
    const applicant = profile({ countries: ["DE", "PL"], constraints: { can_relocate: true } });
    store().setProfile(applicant);

    store().updateProfile({ interests: ["дизайн"] });

    expect(store().profile).toEqual({ ...applicant, interests: ["дизайн"] });
    expect(store().profile?.countries).toEqual(["DE", "PL"]);
    expect(store().profile?.constraints).toEqual({ can_relocate: true });
  });

  it("never writes into the object it was handed", () => {
    const applicant = profile();
    const snapshot = JSON.stringify(applicant);
    store().setProfile(applicant);

    store().updateProfile({ interests: ["медицина"] });

    expect(JSON.stringify(applicant)).toBe(snapshot);
    expect(store().profile).not.toBe(applicant);
  });

  it("ignores a patch when there is no profile to patch", () => {
    store().updateProfile({ interests: ["медицина"] });
    expect(store().profile).toBeNull();
  });

  it("clears the profile without touching anything else", () => {
    store().setProfile(profile());
    store().markActionComplete("apply");
    store().resetProfile();

    expect(store().profile).toBeNull();
    expect(store().completed_action_ids).toEqual(["apply"]);
  });
});

describe("interview", () => {
  it("tracks progress without deciding anything", () => {
    store().startInterview();
    expect(store().interview.started).toBe(true);
    expect(store().interview.completed).toBe(false);

    store().setCurrentQuestion("q-budget");
    store().answerQuestion("q-budget");
    store().setCurrentQuestion("q-countries");
    store().answerQuestion("q-countries");

    expect(store().interview.current_question_id).toBe("q-countries");
    expect(store().interview.answered_question_ids).toEqual(["q-budget", "q-countries"]);

    store().completeInterview();
    expect(store().interview.completed).toBe(true);
  });

  it("records an answer once, however many times it arrives", () => {
    store().answerQuestion("q-budget");
    store().answerQuestion("q-budget");

    expect(store().interview.answered_question_ids).toEqual(["q-budget"]);
  });

  it("keeps a skipped question apart from an answered one", () => {
    store().skipQuestion("q-countries");
    store().skipQuestion("q-countries");

    expect(store().interview.skipped_question_ids).toEqual(["q-countries"]);
    expect(store().interview.answered_question_ids).toEqual([]);
  });

  it("keeps free text exactly as it was typed", () => {
    store().setInterviewText("10 класс, Шымкент. Люблю дизайн и код.");

    // Stored verbatim: nothing here parses it, and nothing here guesses.
    expect(store().interview.raw_text).toBe("10 класс, Шымкент. Люблю дизайн и код.");
    expect(store().profile).toBeNull();
  });
});

describe("route", () => {
  it("keeps the board being replaced, which is what a diff needs", () => {
    const first = route("p-1");
    const second = route("p-2");

    store().setRoute(first, "2026-09-17T09:00:00.000Z");
    expect(store().route).toBe(first);
    expect(store().previous_route).toBeNull();
    expect(store().metadata.last_calculated_at).toBe("2026-09-17T09:00:00.000Z");

    store().setRoute(second, "2026-09-17T09:05:00.000Z");
    expect(store().route).toBe(second);
    expect(store().previous_route).toBe(first);
    expect(store().metadata.last_calculated_at).toBe("2026-09-17T09:05:00.000Z");
  });

  it("lets the previous board be set or dropped outright", () => {
    store().setRoute(route("p-1"), "2026-09-17T09:00:00.000Z");
    store().setRoute(route("p-2"), "2026-09-17T09:05:00.000Z");

    store().setPreviousRoute(null);
    expect(store().previous_route).toBeNull();
    expect(store().route).not.toBeNull();
  });

  it("treats the route as opaque and computes nothing", () => {
    const board = route("p-1");
    store().setRoute(board, "2026-09-17T09:00:00.000Z");

    // Whatever the engine put in comes back byte for byte.
    expect(JSON.stringify(store().route)).toBe(JSON.stringify(board));
  });
});

describe("completed actions", () => {
  it("adds a step once", () => {
    store().markActionComplete("sat_reg");
    expect(store().completed_action_ids).toEqual(["sat_reg"]);
  });

  it("does not add the same step twice", () => {
    store().markActionComplete("sat_reg");
    const afterFirst = store().completed_action_ids;

    store().markActionComplete("sat_reg");

    expect(store().completed_action_ids).toEqual(["sat_reg"]);
    // Nothing changed, so the array identity did not either.
    expect(store().completed_action_ids).toBe(afterFirst);
  });

  it("takes a step back off the list", () => {
    store().markActionComplete("sat_reg");
    store().markActionComplete("apply");
    store().unmarkActionComplete("sat_reg");

    expect(store().completed_action_ids).toEqual(["apply"]);
  });

  it("shrugs at unmarking something that was never marked", () => {
    store().unmarkActionComplete("ghost");
    expect(store().completed_action_ids).toEqual([]);
  });
});

describe("selections", () => {
  it("holds at most two doors to compare", () => {
    store().toggleCompare("p-1");
    store().toggleCompare("p-2");
    expect(store().selected_compare_ids).toEqual(["p-1", "p-2"]);

    // A third tap pushes out the door chosen first rather than doing nothing.
    store().toggleCompare("p-3");
    expect(store().selected_compare_ids).toEqual(["p-2", "p-3"]);
  });

  it("never holds the same door twice", () => {
    store().toggleCompare("p-1");
    store().toggleCompare("p-1");
    expect(store().selected_compare_ids).toEqual([]);

    store().setCompareSelection(["p-1", "p-1", "p-2", "p-3"]);
    expect(store().selected_compare_ids).toEqual(["p-1", "p-2"]);
  });

  it("clears the comparison", () => {
    store().setCompareSelection(["p-1", "p-2"]);
    store().clearCompareSelection();
    expect(store().selected_compare_ids).toEqual([]);
  });

  it("selects and deselects a single door", () => {
    store().selectDoor("p-1");
    expect(store().selected_door_id).toBe("p-1");

    store().selectDoor(undefined);
    expect(store().selected_door_id).toBeUndefined();
  });
});

describe("preferences", () => {
  it("remembers language and tone", () => {
    store().setLocale("kk");
    store().setTone("direct");

    expect(store().preferences).toEqual({ locale: "kk", tone: "direct" });
  });
});

describe("reset", () => {
  it("returns to the initial state but keeps how the screen is read", () => {
    store().setProfile(profile());
    store().startInterview();
    store().answerQuestion("q-budget");
    store().setRoute(route("p-1"), "2026-09-17T09:00:00.000Z");
    store().markActionComplete("apply");
    store().selectDoor("p-1");
    store().setCompareSelection(["p-1", "p-2"]);
    store().setLocale("kk");

    store().resetApp();

    const state = store();
    const defaults = createDefaultAppData();
    expect(state.profile).toBeNull();
    expect(state.interview).toEqual(defaults.interview);
    expect(state.route).toBeNull();
    expect(state.previous_route).toBeNull();
    expect(state.completed_action_ids).toEqual([]);
    expect(state.selected_door_id).toBeUndefined();
    expect(state.selected_compare_ids).toEqual([]);
    expect(state.metadata.last_calculated_at).toBeUndefined();
    // Language is how they read the page, not something they told us.
    expect(state.preferences).toEqual({ locale: "kk", tone: "friendly" });
  });
});

describe("persistence", () => {
  it("writes the data half under its own key", async () => {
    store().setProfile(profile());
    store().markActionComplete("apply");
    await Promise.resolve();

    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const stored = JSON.parse(raw ?? "{}") as { version: number; state: Record<string, unknown> };
    expect(stored.version).toBe(APP_SCHEMA_VERSION);
    expect(stored.state.completed_action_ids).toEqual(["apply"]);
    // Actions and the hydration flag are behaviour, not data.
    expect(stored.state.setProfile).toBeUndefined();
    expect(stored.state.hasHydrated).toBeUndefined();
  });

  it("comes back after a reload", async () => {
    store().setProfile(profile({ countries: ["PL"] }));
    store().markActionComplete("sat_reg");
    store().setLocale("en");
    await Promise.resolve();

    // What a fresh page load does: empty memory, then read storage. The bytes
    // are put back by hand because resetting the store persists over them.
    const stored = window.localStorage.getItem(APP_STORAGE_KEY) ?? "";
    useAppStore.setState({ ...createDefaultAppData(), hasHydrated: false });
    window.localStorage.setItem(APP_STORAGE_KEY, stored);
    await useAppStore.persist.rehydrate();

    expect(store().profile?.countries).toEqual(["PL"]);
    expect(store().completed_action_ids).toEqual(["sat_reg"]);
    expect(store().preferences.locale).toBe("en");
    expect(store().hasHydrated).toBe(true);
  });

  it("finishes hydrating even when nothing was stored", async () => {
    await useAppStore.persist.rehydrate();
    expect(store().hasHydrated).toBe(true);
    expect(store().profile).toBeNull();
  });
});

describe("migration", () => {
  it("carries finished work across from the unversioned shape", () => {
    const legacy = {
      profile: profile(),
      completed: ["sat_reg", "apply", "sat_reg"],
      changePending: true,
      previous: { something: "that no longer exists" },
    };

    const migrated = migrateAppState(legacy, 0);

    expect(migrated.completed_action_ids).toEqual(["sat_reg", "apply"]);
    expect(migrated.profile).toEqual(legacy.profile);
    expect(migrated.metadata.schema_version).toBe(APP_SCHEMA_VERSION);
    expect(migrated.interview).toEqual(createDefaultAppData().interview);
    expect("changePending" in migrated).toBe(false);
  });

  it("passes a current payload through and fills in missing fields", () => {
    const current: Partial<AppData> = {
      profile: profile(),
      completed_action_ids: ["apply"],
      preferences: { locale: "kk", tone: "direct" },
    };

    const migrated = migrateAppState(current, APP_SCHEMA_VERSION);

    expect(migrated.profile).toEqual(current.profile);
    expect(migrated.preferences).toEqual({ locale: "kk", tone: "direct" });
    expect(migrated.interview).toEqual(createDefaultAppData().interview);
    expect(migrated.selected_compare_ids).toEqual([]);
  });

  it("re-establishes the invariants the app relies on", () => {
    const messy = {
      completed_action_ids: ["apply", "apply", "sat_reg"],
      selected_compare_ids: ["p-1", "p-1", "p-2", "p-3"],
      interview: {
        started: true,
        completed: false,
        answered_question_ids: ["q-1", "q-1"],
      },
    };

    const migrated = migrateAppState(messy, APP_SCHEMA_VERSION);

    expect(migrated.completed_action_ids).toEqual(["apply", "sat_reg"]);
    expect(migrated.selected_compare_ids).toEqual(["p-1", "p-2"]);
    expect(migrated.interview.answered_question_ids).toEqual(["q-1"]);
  });

  it("refuses to half-read a payload from a newer build", () => {
    const future = { profile: profile(), completed_action_ids: ["apply"], unknown_field: 42 };

    expect(migrateAppState(future, APP_SCHEMA_VERSION + 1)).toEqual(createDefaultAppData());
  });
});

describe("corrupted storage", () => {
  it("falls back to an empty app rather than a broken one", () => {
    expect(migrateAppState({ profile: "не профиль" }, APP_SCHEMA_VERSION)).toEqual(
      createDefaultAppData(),
    );
    expect(migrateAppState({ completed_action_ids: "apply" }, APP_SCHEMA_VERSION)).toEqual(
      createDefaultAppData(),
    );
    expect(migrateAppState("[]", APP_SCHEMA_VERSION)).toEqual(createDefaultAppData());
    expect(migrateAppState(null, APP_SCHEMA_VERSION)).toEqual(createDefaultAppData());
  });

  it("survives a storage entry that is not even JSON", async () => {
    window.localStorage.setItem(APP_STORAGE_KEY, "{ this is not json");

    await useAppStore.persist.rehydrate();

    expect(store().profile).toBeNull();
    expect(store().completed_action_ids).toEqual([]);
    expect(store().hasHydrated).toBe(true);
  });

  it("survives a structurally wrong entry", async () => {
    window.localStorage.setItem(
      APP_STORAGE_KEY,
      JSON.stringify({ version: APP_SCHEMA_VERSION, state: { completed_action_ids: 42 } }),
    );

    await useAppStore.persist.rehydrate();

    expect(store().completed_action_ids).toEqual([]);
    expect(store().hasHydrated).toBe(true);
  });
});
