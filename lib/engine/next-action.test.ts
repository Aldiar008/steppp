import { describe, expect, it } from "vitest";

import { computeNextBestAction } from "@/lib/engine";
import type { ActionStep, DateFact, Door, DoorStatus } from "@/lib/types";

/**
 * This engine produces the one sentence an applicant acts on tonight, so the
 * only acceptable failure mode is silence. These tests pin that it never names
 * a step the board cannot justify, that ranking is urgency and doors rather
 * than taste, that finished work is not recommended again, and that the same
 * board always yields the same answer.
 */

const TODAY = "2026-09-17";

function fact(date: string): DateFact {
  return { date, confidence: "verified", source_id: "src-test", checked_at: "2026-09-01" };
}

function action(id: string, over: Partial<ActionStep> = {}): ActionStep {
  return {
    id,
    title: `title of ${id}`,
    kind: "preparation",
    depends_on: [],
    unlocks: [],
    effort_minutes: 60,
    duration_days: 0,
    source_id: "src-test",
    ...over,
  };
}

function catalogue(...steps: ActionStep[]): Record<string, ActionStep> {
  return Object.fromEntries(steps.map((step) => [step.id, step]));
}

/**
 * A door as the route engine would have produced it: a status, a countdown, a
 * binding step and the chain that step belongs to.
 */
function door(
  programId: string,
  over: Partial<Door> & { status?: DoorStatus } = {},
): Door {
  return {
    program_id: programId,
    status: "open",
    point_of_no_return: "2026-11-20",
    days_remaining: 64,
    next_critical_action_id: "a",
    action_chain: ["a"],
    matched_requirements: [],
    unmatched_requirements: [],
    score: 80,
    confidence: "verified",
    explanation_facts: { reasons: [], blockers: [] },
    ...over,
  };
}

describe("choosing a step", () => {
  it("names the binding step of the only active door", () => {
    const doors = [door("p")];
    const next = computeNextBestAction(doors, catalogue(action("a")), undefined, TODAY);

    expect(next).not.toBeNull();
    expect(next?.action_id).toBe("a");
    expect(next?.title).toBe("title of a");
    expect(next?.due_date).toBe("2026-11-20");
    expect(next?.days_remaining).toBe(64);
    expect(next?.effort_minutes).toBe(60);
    expect(next?.affected_doors).toEqual(["p"]);
    expect(next?.affected_doors_count).toBe(1);
  });

  it("takes the more urgent of two steps", () => {
    const doors = [
      door("p-far", {
        point_of_no_return: "2027-01-08",
        days_remaining: 478,
        next_critical_action_id: "far",
        action_chain: ["far"],
      }),
      door("p-near", {
        status: "closing_soon",
        point_of_no_return: "2026-09-20",
        days_remaining: 3,
        next_critical_action_id: "near",
        action_chain: ["near"],
      }),
    ];
    const next = computeNextBestAction(doors, catalogue(action("far"), action("near")), undefined, TODAY);

    expect(next?.action_id).toBe("near");
    expect(next?.urgency).toBe("critical");
    expect(next?.reason_code).toBe("nearest_deadline");
  });

  it("prefers the step that holds more doors when the day is the same", () => {
    const doors = [
      door("p-1", { next_critical_action_id: "shared", action_chain: ["shared"] }),
      door("p-2", { next_critical_action_id: "shared", action_chain: ["shared"] }),
      door("p-3", { next_critical_action_id: "lonely", action_chain: ["lonely"] }),
    ];
    const next = computeNextBestAction(
      doors,
      catalogue(action("shared"), action("lonely")),
      undefined,
      TODAY,
    );

    expect(next?.action_id).toBe("shared");
    expect(next?.affected_doors).toEqual(["p-1", "p-2"]);
    expect(next?.affected_doors_count).toBe(2);
    expect(next?.reason_code).toBe("holds_most_doors");
  });

  it("prefers the cheaper step when the day and the doors are the same", () => {
    const doors = [
      door("p-1", { next_critical_action_id: "cheap", action_chain: ["cheap"] }),
      door("p-2", { next_critical_action_id: "dear", action_chain: ["dear"] }),
    ];
    const next = computeNextBestAction(
      doors,
      catalogue(action("cheap", { effort_minutes: 20 }), action("dear", { effort_minutes: 300 })),
      undefined,
      TODAY,
    );

    expect(next?.action_id).toBe("cheap");
    expect(next?.effort_minutes).toBe(20);
    expect(next?.reason_code).toBe("lowest_effort");
  });

  it("falls back to the lower id when everything else ties", () => {
    const doors = [
      door("p-1", { next_critical_action_id: "b", action_chain: ["b"] }),
      door("p-2", { next_critical_action_id: "a", action_chain: ["a"] }),
      door("p-3", { next_critical_action_id: "c", action_chain: ["c"] }),
    ];
    const next = computeNextBestAction(doors, catalogue(action("a"), action("b"), action("c")), undefined, TODAY);

    expect(next?.action_id).toBe("a");
  });

  it("puts a binding step ahead of one that merely sits in a chain", () => {
    // `prep` is due sooner but binds nothing; `bind` is what actually decides
    // whether the door survives.
    const doors = [door("p", { next_critical_action_id: "bind", action_chain: ["prep", "bind"] })];
    const next = computeNextBestAction(
      doors,
      catalogue(action("bind"), action("prep", { hard_deadline: fact("2026-10-01") })),
      undefined,
      TODAY,
    );

    expect(next?.action_id).toBe("bind");
  });
});

describe("nothing to recommend", () => {
  it("says nothing when every door has closed", () => {
    const doors = [
      door("p-1", { status: "closed", days_remaining: -20, point_of_no_return: "2026-08-28" }),
      door("p-2", { status: "closed", days_remaining: -5, point_of_no_return: "2026-09-12" }),
    ];

    expect(computeNextBestAction(doors, catalogue(action("a")), undefined, TODAY)).toBeNull();
  });

  it("says nothing when no door can be dated", () => {
    const doors = [
      door("p-1", { status: "needs_data", action_chain: [] }),
      door("p-2", { status: "needs_data", action_chain: [] }),
    ];
    delete doors[0]?.point_of_no_return;
    delete doors[0]?.next_critical_action_id;

    expect(computeNextBestAction(doors, catalogue(action("a")), undefined, TODAY)).toBeNull();
  });

  it("says nothing on an empty board", () => {
    expect(computeNextBestAction([], catalogue(action("a")), undefined, TODAY)).toBeNull();
  });

  it("will not name a step the action catalogue does not hold", () => {
    expect(computeNextBestAction([door("p")], {}, undefined, TODAY)).toBeNull();
  });
});

describe("work already done", () => {
  it("skips a completed step and moves to the next one in the chain", () => {
    const doors = [
      door("p", {
        next_critical_action_id: "done",
        action_chain: ["done", "next"],
      }),
    ];
    const actions = catalogue(
      action("done"),
      action("next", { hard_deadline: fact("2026-12-01"), effort_minutes: 45 }),
    );

    const before = computeNextBestAction(doors, actions, undefined, TODAY);
    expect(before?.action_id).toBe("done");

    const after = computeNextBestAction(doors, actions, new Set(["done"]), TODAY);
    expect(after?.action_id).toBe("next");
    expect(after?.due_date).toBe("2026-12-01");
    expect(after?.effort_minutes).toBe(45);
  });

  it("says nothing once the whole chain is done", () => {
    const doors = [door("p", { action_chain: ["a", "b"] })];
    const actions = catalogue(action("a"), action("b"));

    expect(computeNextBestAction(doors, actions, new Set(["a", "b"]), TODAY)).toBeNull();
  });

  it("treats everything as outstanding when nothing is passed", () => {
    const doors = [door("p")];
    const actions = catalogue(action("a"));

    expect(computeNextBestAction(doors, actions, new Set(), TODAY)?.action_id).toBe("a");
    expect(computeNextBestAction(doors, actions, undefined, TODAY)?.action_id).toBe("a");
  });
});

describe("what the step holds", () => {
  it("counts every active door whose chain carries the step", () => {
    const doors = [
      door("p-1", { action_chain: ["shared", "a"] }),
      door("p-2", { action_chain: ["shared", "a"] }),
      door("p-3", { action_chain: ["shared", "a"] }),
      // Closed and undated doors are not opportunities, so they hold nothing.
      door("p-closed", { status: "closed", days_remaining: -3, action_chain: ["shared"] }),
      door("p-gap", { status: "needs_data", action_chain: ["shared"] }),
    ];
    const next = computeNextBestAction(doors, catalogue(action("a"), action("shared")), undefined, TODAY);

    expect(next?.action_id).toBe("a");
    expect(next?.affected_doors).toEqual(["p-1", "p-2", "p-3"]);
    expect(next?.affected_doors_count).toBe(3);
    expect(next?.affected_doors).not.toContain("p-closed");
    expect(next?.affected_doors).not.toContain("p-gap");
  });

  it("reports the count from the named doors and nowhere else", () => {
    const doors = [door("p-1"), door("p-2")];
    const next = computeNextBestAction(doors, catalogue(action("a")), undefined, TODAY);

    expect(next?.affected_doors_count).toBe(next?.affected_doors.length);
    expect(next?.reason_code).toBe("critical_for_multiple_doors");
  });
});

describe("urgency", () => {
  it("uses the schedule engine's own threshold", () => {
    const soon = computeNextBestAction(
      [door("p", { days_remaining: 15 })],
      catalogue(action("a")),
      undefined,
      TODAY,
    );
    expect(soon?.urgency).toBe("soon");

    // CLOSING_SOON_DAYS is 14, and the day itself still counts.
    const critical = computeNextBestAction(
      [door("p", { days_remaining: 14 })],
      catalogue(action("a")),
      undefined,
      TODAY,
    );
    expect(critical?.urgency).toBe("critical");
  });

  it("calls an undated step planned rather than guessing a date", () => {
    const doors = [door("p", { action_chain: ["prep"] })];
    delete doors[0]?.next_critical_action_id;
    const next = computeNextBestAction(doors, catalogue(action("prep")), undefined, TODAY);

    expect(next?.action_id).toBe("prep");
    expect(next?.due_date).toBeUndefined();
    expect(next?.days_remaining).toBeUndefined();
    expect(next?.urgency).toBe("planned");
  });

  it("dates an unbound step from its own cap, never from the door", () => {
    const doors = [door("p", { action_chain: ["prep"] })];
    delete doors[0]?.next_critical_action_id;
    const next = computeNextBestAction(
      doors,
      catalogue(action("prep", { hard_deadline: fact("2026-09-24") })),
      undefined,
      TODAY,
    );

    expect(next?.due_date).toBe("2026-09-24");
    expect(next?.days_remaining).toBe(7);
    expect(next?.urgency).toBe("critical");
  });
});

describe("determinism", () => {
  const ACTIONS = catalogue(
    action("a", { effort_minutes: 30 }),
    action("b", { effort_minutes: 30 }),
    action("c", { effort_minutes: 10 }),
  );
  const DOORS = [
    door("p-1", { next_critical_action_id: "a", action_chain: ["a"] }),
    door("p-2", { next_critical_action_id: "b", action_chain: ["b"] }),
    door("p-3", {
      next_critical_action_id: "c",
      action_chain: ["c"],
      point_of_no_return: "2026-12-01",
      days_remaining: 75,
    }),
  ];

  it("does not care what order the doors arrive in", () => {
    const straight = computeNextBestAction(DOORS, ACTIONS, undefined, TODAY);
    const reversed = computeNextBestAction([...DOORS].reverse(), ACTIONS, undefined, TODAY);

    expect(JSON.stringify(reversed)).toBe(JSON.stringify(straight));
    expect(straight?.action_id).toBe("a");
  });

  it("gives the same answer twice", () => {
    expect(JSON.stringify(computeNextBestAction(DOORS, ACTIONS, undefined, TODAY))).toBe(
      JSON.stringify(computeNextBestAction(DOORS, ACTIONS, undefined, TODAY)),
    );
  });

  it("leaves the board exactly as it was", () => {
    const snapshot = JSON.stringify(DOORS);
    computeNextBestAction(DOORS, ACTIONS, undefined, TODAY);
    expect(JSON.stringify(DOORS)).toBe(snapshot);
  });

  it("returns one step and never a list", () => {
    const next = computeNextBestAction(DOORS, ACTIONS, undefined, TODAY);

    expect(Array.isArray(next)).toBe(false);
    expect(Object.keys(next ?? {})).toContain("action_id");
    // Nothing in the result is phrasing: ids, a title from the catalogue,
    // dates, counts and two closed enums.
    expect(next?.title).toBe("title of a");
    expect(["critical", "soon", "planned"]).toContain(next?.urgency);
    expect([
      "nearest_deadline",
      "holds_most_doors",
      "critical_for_multiple_doors",
      "lowest_effort",
    ]).toContain(next?.reason_code);
  });
});
