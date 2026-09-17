import { describe, expect, it } from "vitest";

import {
  buildActionIndex,
  computeDoors,
  computeNextBestAction,
  computeRoute,
  getActiveDoors,
  getClosedDoors,
  getNeedsDataDoors,
  getOpenDoors,
  summarizeDoors,
  type Catalog,
} from "@/lib/engine";
import type { ActionStep, DateFact, Door, Profile, Program } from "@/lib/types";

/**
 * The route is the layer an applicant actually sees the shape of: which door is
 * at the top of the board, what the counter says, and what they are told to do
 * today. Its failures are quiet ones — a door sorted three rows too low is not
 * an exception anywhere, it is simply a route somebody never took.
 *
 * These tests pin the ordering rule (urgency, never prestige), the counting
 * rule (an undated door is not an opportunity), the recommendation rule (only
 * steps the catalogue can show), and the promise that one broken record costs
 * the applicant one door rather than the whole catalogue.
 */

const TODAY = "2026-09-17";

function fact(date: string): DateFact {
  return { date, confidence: "verified", source_id: "src-test", checked_at: "2026-09-01" };
}

function action(id: string, over: Partial<ActionStep> = {}): ActionStep {
  return {
    id,
    title: id,
    kind: "preparation",
    depends_on: [],
    effort_minutes: 15,
    unlocks: [],
    source_id: "src-test",
    duration_days: 0,
    ...over,
  };
}

function program(id: string, over: Partial<Program> = {}): Program {
  return {
    id,
    name: id,
    org: "Test org",
    country: "DE",
    level: "bachelor",
    fields: ["programming"],
    language: ["en"],
    tuition_per_year: {
      amount: 4_000,
      currency: "USD",
      confidence: "verified",
      source_id: "src-test",
    },
    funding: ["partial"],
    requirements: [],
    action_chain: ["apply"],
    application_deadline: fact("2027-01-15"),
    ...over,
  };
}

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

/**
 * The shared action catalogue.
 *
 *   apply      — 7 days, no cap of its own
 *   sat_reg    — instant, closes 2026-11-20, unlocks the sitting
 *   sat_exam   — the sitting plus 14 days of waiting for the score
 *   essay      — 21 days of writing
 */
const ACTIONS: ActionStep[] = [
  action("apply", { kind: "application", duration_days: 7, effort_minutes: 90 }),
  action("sat_reg", {
    kind: "exam_registration",
    hard_deadline: fact("2026-11-20"),
    duration_days: 0,
    effort_minutes: 20,
    unlocks: ["sat_exam"],
  }),
  action("sat_exam", {
    kind: "exam",
    hard_deadline: fact("2026-12-05"),
    duration_days: 14,
    effort_minutes: 240,
    depends_on: ["sat_reg"],
  }),
  action("essay", { duration_days: 21, effort_minutes: 300 }),
];

/**
 * One programme of every status, deliberately authored out of order so the
 * sorting is doing the work and not the fixture.
 *
 *   p-closed     deadline 2026-06-01 → last start 2026-05-25, already gone
 *   p-open-far   deadline 2027-05-01 → last start 2027-04-24
 *   p-gap        chain names an action the catalogue does not hold
 *   p-soon       deadline 2026-09-25 → last start 2026-09-18, one day left
 *   p-open-near  deadline 2026-11-01 → last start 2026-10-25
 */
const BOARD: Catalog = {
  actions: ACTIONS,
  programs: [
    program("p-closed", { application_deadline: fact("2026-06-01") }),
    program("p-open-far", { application_deadline: fact("2027-05-01") }),
    program("p-gap", { action_chain: ["ghost"] }),
    program("p-soon", { application_deadline: fact("2026-09-25") }),
    program("p-open-near", { application_deadline: fact("2026-11-01") }),
  ],
};

function idsOf(doors: readonly Door[]): string[] {
  return doors.map((door) => door.program_id);
}

function doorOf(doors: readonly Door[], id: string): Door {
  const door = doors.find((item) => item.program_id === id);
  if (!door) throw new Error(`No door for ${id}`);
  return door;
}

describe("computeDoors", () => {
  it("turns every programme in the catalogue into a door", () => {
    const doors = computeDoors(profile(), BOARD, TODAY);

    expect(doors).toHaveLength(BOARD.programs.length);
    expect(idsOf(doors).sort()).toEqual([
      "p-closed",
      "p-gap",
      "p-open-far",
      "p-open-near",
      "p-soon",
    ]);
    expect(doorOf(doors, "p-open-near").point_of_no_return).toBe("2026-10-25");
    expect(doorOf(doors, "p-open-near").next_critical_action_id).toBe("apply");
  });

  it("orders the board by urgency, not by fit", () => {
    const doors = computeDoors(profile(), BOARD, TODAY);

    expect(idsOf(doors)).toEqual(["p-soon", "p-open-near", "p-open-far", "p-gap", "p-closed"]);
  });

  it("puts a door closing in a day above a better-dated one months out", () => {
    const doors = computeDoors(profile(), BOARD, TODAY);
    const soon = doorOf(doors, "p-soon");
    const far = doorOf(doors, "p-open-far");

    expect(soon.status).toBe("closing_soon");
    expect(far.status).toBe("open");
    expect(doors.indexOf(soon)).toBeLessThan(doors.indexOf(far));
    expect(soon.days_remaining).toBe(1);
  });

  it("breaks a tie on the same date by score, then by id", () => {
    const catalog: Catalog = {
      actions: ACTIONS,
      programs: [
        program("p-tie-b", { application_deadline: fact("2026-11-01") }),
        program("p-tie-a", { application_deadline: fact("2026-11-01") }),
        program("p-tie-off", {
          fields: ["medicine"],
          application_deadline: fact("2026-11-01"),
        }),
      ],
    };
    const doors = computeDoors(profile(), catalog, TODAY);

    for (const door of doors) expect(door.point_of_no_return).toBe("2026-10-25");
    // Equal dates and equal scores fall back to the id; the weaker fit sinks.
    expect(idsOf(doors)).toEqual(["p-tie-a", "p-tie-b", "p-tie-off"]);
    expect(doorOf(doors, "p-tie-a").score).toBeGreaterThan(doorOf(doors, "p-tie-off").score);
  });

  it("keeps closed doors out of the active set", () => {
    const doors = computeDoors(profile(), BOARD, TODAY);

    expect(idsOf(getActiveDoors(doors))).toEqual(["p-soon", "p-open-near", "p-open-far"]);
    expect(idsOf(getOpenDoors(doors))).toEqual(["p-open-near", "p-open-far"]);
    expect(idsOf(getClosedDoors(doors))).toEqual(["p-closed"]);
    expect(idsOf(getNeedsDataDoors(doors))).toEqual(["p-gap"]);

    const closed = doorOf(doors, "p-closed");
    expect(closed.point_of_no_return).toBe("2026-05-25");
    expect(closed.days_remaining).toBeLessThan(0);
  });

  it("keeps the diagnostics on a door it could not date", () => {
    const doors = computeDoors(profile(), BOARD, TODAY);
    const gap = doorOf(doors, "p-gap");

    expect(gap.status).toBe("needs_data");
    expect(gap.point_of_no_return).toBeUndefined();
    expect(gap.days_remaining).toBeUndefined();
    expect(gap.next_critical_action_id).toBeUndefined();
    expect(gap.explanation_facts.blockers.some((line) => line.includes("ghost"))).toBe(true);
    // The match half still ran, so the applicant is not left with nothing.
    expect(gap.score).toBeGreaterThan(0);
  });

  it("rejects a today that is not an ISO date", () => {
    expect(() => computeDoors(profile(), BOARD, "17.09.2026")).toThrow(/ISO date/);
  });

  it("returns the same board for the same inputs", () => {
    const first = computeDoors(profile(), BOARD, TODAY);
    const second = computeDoors(profile(), BOARD, TODAY);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});

describe("summarizeDoors", () => {
  it("counts each status and treats needs_data as no opportunity", () => {
    const summary = summarizeDoors(computeDoors(profile(), BOARD, TODAY));

    expect(summary.total).toBe(5);
    expect(summary.open).toBe(2);
    expect(summary.closing_soon).toBe(1);
    expect(summary.closed).toBe(1);
    expect(summary.needs_data).toBe(1);
    expect(summary.open + summary.closing_soon).toBe(3);
  });

  it("names the active door that shuts first", () => {
    const summary = summarizeDoors(computeDoors(profile(), BOARD, TODAY));

    expect(summary.nearest?.program_id).toBe("p-soon");
    expect(summary.nearest?.point_of_no_return).toBe("2026-09-18");
  });

  it("never reaches for a closed or undated door to fill nearest", () => {
    const catalog: Catalog = {
      actions: ACTIONS,
      programs: [
        program("p-closed", { application_deadline: fact("2026-06-01") }),
        program("p-gap", { action_chain: ["ghost"] }),
      ],
    };
    const summary = summarizeDoors(computeDoors(profile(), catalog, TODAY));

    expect(summary.total).toBe(2);
    expect(summary.nearest).toBeUndefined();
  });
});

describe("the next action, on a real board", () => {
  const actionsById = buildActionIndex(ACTIONS);

  /** Two programmes bound by the same SAT registration, one bound by its form. */
  const SAT_BOARD: Catalog = {
    actions: ACTIONS,
    programs: [
      program("p-sat-a", { action_chain: ["sat_exam"] }),
      program("p-sat-b", { action_chain: ["sat_exam"], application_deadline: fact("2027-03-01") }),
      program("p-apply", { application_deadline: fact("2026-11-01") }),
    ],
  };

  it("takes its candidates from the chains the board computed", () => {
    const doors = computeDoors(profile(), SAT_BOARD, TODAY);
    const next = computeNextBestAction(doors, actionsById, undefined, TODAY);

    // Both registrations bind a door; the form comes first because its last day
    // to start is 2026-10-25 and the SAT registration's is 2026-11-20.
    expect(next?.action_id).toBe("apply");
    expect(next?.due_date).toBe("2026-10-25");
    expect(next?.affected_doors).toEqual(["p-apply"]);
    expect(next?.urgency).toBe("soon");
    expect(next?.reason_code).toBe("nearest_deadline");
  });

  it("names the SAT registration once the form is out of the way", () => {
    const doors = computeDoors(profile(), SAT_BOARD, TODAY);
    const next = computeNextBestAction(doors, actionsById, new Set(["apply"]), TODAY);

    expect(next?.action_id).toBe("sat_reg");
    expect(next?.due_date).toBe("2026-11-20");
    expect(next?.affected_doors).toEqual(["p-sat-a", "p-sat-b"]);
    expect(next?.affected_doors_count).toBe(2);
    for (const id of next?.affected_doors ?? []) {
      expect(doorOf(doors, id).action_chain).toContain("sat_reg");
    }
  });

  it("recommends nothing rather than a step the catalogue cannot show", () => {
    const doors = computeDoors(profile(), SAT_BOARD, TODAY);

    expect(computeNextBestAction(doors, {}, undefined, TODAY)).toBeNull();
    expect(computeNextBestAction([], actionsById, undefined, TODAY)).toBeNull();
  });

  it("ignores closed and undated doors when choosing", () => {
    const catalog: Catalog = {
      actions: ACTIONS,
      programs: [
        program("p-closed", { application_deadline: fact("2026-06-01") }),
        program("p-gap", { action_chain: ["ghost"] }),
      ],
    };
    const doors = computeDoors(profile(), catalog, TODAY);

    expect(computeNextBestAction(doors, actionsById, undefined, TODAY)).toBeNull();
  });
});

describe("computeRoute", () => {
  it("returns the board, its counts and the one next move together", () => {
    const route = computeRoute(profile(), BOARD, TODAY);

    expect(idsOf(route.doors)).toEqual(["p-soon", "p-open-near", "p-open-far", "p-gap", "p-closed"]);
    expect(route.summary.total).toBe(5);
    expect(route.summary.nearest?.program_id).toBe("p-soon");
    expect(route.next_action?.action_id).toBe("apply");
    expect(route.next_action?.affected_doors).toEqual(["p-soon", "p-open-near", "p-open-far"]);
  });

  it("agrees with the parts computed separately", () => {
    const route = computeRoute(profile(), BOARD, TODAY);
    const doors = computeDoors(profile(), BOARD, TODAY);

    expect(JSON.stringify(route.doors)).toBe(JSON.stringify(doors));
    expect(JSON.stringify(route.summary)).toBe(JSON.stringify(summarizeDoors(doors)));
    expect(JSON.stringify(route.next_action)).toBe(
      JSON.stringify(computeNextBestAction(doors, buildActionIndex(ACTIONS), undefined, TODAY)),
    );
  });
});

describe("damaged catalogue data", () => {
  it("costs the applicant one door, not the whole board", () => {
    // A record that lost its funding list on the way out of the crawl. Reading
    // it throws, which must not take the two healthy programmes with it.
    const broken = { ...program("p-broken"), funding: undefined } as unknown as Program;
    const catalog: Catalog = {
      actions: ACTIONS,
      programs: [
        program("p-open-near", { application_deadline: fact("2026-11-01") }),
        broken,
        program("p-open-far", { application_deadline: fact("2027-05-01") }),
      ],
    };

    const doors = computeDoors(profile(), catalog, TODAY);

    expect(doors).toHaveLength(3);
    expect(idsOf(getOpenDoors(doors))).toEqual(["p-open-near", "p-open-far"]);

    const damaged = doorOf(doors, "p-broken");
    expect(damaged.status).toBe("needs_data");
    expect(damaged.score).toBe(0);
    expect(damaged.confidence).toBe("demo");
    expect(damaged.explanation_facts.blockers[0]).toContain("не читается");

    // And the rest of the route still works over the surviving doors.
    const route = computeRoute(profile(), catalog, TODAY);
    expect(route.summary.open).toBe(2);
    expect(route.summary.needs_data).toBe(1);
    expect(route.next_action?.affected_doors).toEqual(["p-open-near", "p-open-far"]);
  });

  it("still names a record that lost its own id", () => {
    const nameless = { ...program("p-nameless"), id: undefined } as unknown as Program;
    const doors = computeDoors(profile(), { actions: ACTIONS, programs: [nameless] }, TODAY);

    expect(doors).toHaveLength(1);
    expect(doors[0]?.program_id).toBe("catalog_entry_0");
    expect(doors[0]?.status).toBe("needs_data");
  });
});
