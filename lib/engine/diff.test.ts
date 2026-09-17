import { describe, expect, it } from "vitest";

import { computeRoute, diffDoorSets, diffRoutes, type Catalog } from "@/lib/engine";
import type { ActionStep, DateFact, Door, DoorStatus, Profile, Program } from "@/lib/types";

/**
 * The diff is what an applicant reads straight after touching their profile, so
 * a wrong entry here is a wrong instruction at the exact moment somebody is
 * deciding what to do. These tests pin the four things that make it trustworthy:
 * doors are matched by id and never by position, a door that lost its dates is
 * never reported as a door that shut, nothing is explained — only stated — and
 * the same two boards always produce the same bytes.
 */

const TODAY = "2026-09-17";

function door(programId: string, over: Partial<Door> = {}): Door {
  return {
    program_id: programId,
    status: "open",
    point_of_no_return: "2027-01-08",
    days_remaining: 478,
    next_critical_action_id: "apply",
    action_chain: ["apply"],
    matched_requirements: [],
    unmatched_requirements: [],
    score: 80,
    confidence: "verified",
    explanation_facts: { reasons: [], blockers: [] },
    ...over,
  };
}

/** A door in a given status, with the fields that status implies. */
function doorIn(programId: string, status: DoorStatus, over: Partial<Door> = {}): Door {
  if (status === "needs_data") {
    const undated: Door = door(programId, { status, ...over });
    delete undated.point_of_no_return;
    delete undated.days_remaining;
    delete undated.next_critical_action_id;
    undated.action_chain = [];
    undated.explanation_facts = { reasons: [], blockers: ["не хватает данных: apply.duration_days"] };
    return undated;
  }
  if (status === "closed") {
    return door(programId, {
      status,
      point_of_no_return: "2026-05-25",
      days_remaining: -115,
      explanation_facts: { reasons: [], blockers: ["срок упущен: последний день — 2026-05-25"] },
      ...over,
    });
  }
  if (status === "closing_soon") {
    return door(programId, {
      status,
      point_of_no_return: "2026-09-18",
      days_remaining: 1,
      ...over,
    });
  }
  return door(programId, { status, ...over });
}

describe("status transitions", () => {
  it("reports a door that came back as opened", () => {
    const diff = diffDoorSets([doorIn("p", "closed")], [doorIn("p", "open")]);

    expect(diff.opened).toEqual(["p"]);
    expect(diff.closed).toEqual([]);
    expect(diff.changed).toEqual(["p"]);
    expect(diff.unchanged).toEqual([]);
  });

  it("reports a door that ran out of time as closed", () => {
    const diff = diffDoorSets([doorIn("p", "open")], [doorIn("p", "closed")]);

    expect(diff.closed).toEqual(["p"]);
    expect(diff.opened).toEqual([]);
  });

  it("counts closing_soon → closed as closed", () => {
    const diff = diffDoorSets([doorIn("p", "closing_soon")], [doorIn("p", "closed")]);

    expect(diff.closed).toEqual(["p"]);
    expect(diff.opened).toEqual([]);
  });

  it("does not call open → closing_soon a closure", () => {
    const diff = diffDoorSets([doorIn("p", "open")], [doorIn("p", "closing_soon")]);

    expect(diff.closed).toEqual([]);
    expect(diff.opened).toEqual([]);
    // It is still movement worth showing, just not a door lost.
    expect(diff.changed).toEqual(["p"]);
    expect(diff.deadline_changes).toEqual([
      {
        program_id: "p",
        old_date: "2027-01-08",
        new_date: "2026-09-18",
        delta_days: -112,
      },
    ]);
  });

  it("separates a datable door from a shut one", () => {
    const available = diffDoorSets([doorIn("p", "needs_data")], [doorIn("p", "open")]);
    expect(available.became_data_available).toEqual(["p"]);
    expect(available.became_data_missing).toEqual([]);
    // It became reachable, so it is also an opening — named twice, not counted
    // twice, because the two lists answer different questions.
    expect(available.opened).toEqual(["p"]);

    const missing = diffDoorSets([doorIn("p", "open")], [doorIn("p", "needs_data")]);
    expect(missing.became_data_missing).toEqual(["p"]);
    expect(missing.closed).toEqual([]);
    expect(missing.opened).toEqual([]);
  });

  it("never reads needs_data → closed as a door that shut", () => {
    const diff = diffDoorSets([doorIn("p", "needs_data")], [doorIn("p", "closed")]);

    expect(diff.closed).toEqual([]);
    expect(diff.became_data_available).toEqual(["p"]);
    expect(diff.changed).toEqual(["p"]);
  });
});

describe("field transitions", () => {
  it("measures a deadline that moved", () => {
    const diff = diffDoorSets(
      [door("p", { point_of_no_return: "2026-11-20" })],
      [door("p", { point_of_no_return: "2026-12-04" })],
    );

    expect(diff.deadline_changes).toEqual([
      { program_id: "p", old_date: "2026-11-20", new_date: "2026-12-04", delta_days: 14 },
    ]);
    expect(diff.changed).toEqual(["p"]);
  });

  it("refuses to subtract a date that is not there", () => {
    const appeared = diffDoorSets([doorIn("p", "needs_data")], [door("p")]);
    expect(appeared.deadline_changes).toEqual([
      { program_id: "p", new_date: "2027-01-08" },
    ]);
    expect(appeared.deadline_changes[0]?.delta_days).toBeUndefined();

    const vanished = diffDoorSets([door("p")], [doorIn("p", "needs_data")]);
    expect(vanished.deadline_changes).toEqual([
      { program_id: "p", old_date: "2027-01-08" },
    ]);
  });

  it("records the binding step by id and says nothing about it", () => {
    const diff = diffDoorSets(
      [door("p", { next_critical_action_id: "sat_reg" })],
      [door("p", { next_critical_action_id: "ielts" })],
    );

    expect(diff.next_action_changes).toEqual([
      { program_id: "p", old_action_id: "sat_reg", new_action_id: "ielts" },
    ]);

    const lost = diffDoorSets([door("p")], [doorIn("p", "needs_data")]);
    expect(lost.next_action_changes).toEqual([{ program_id: "p", old_action_id: "apply" }]);
  });

  it("keeps a score move out of the door counts", () => {
    const diff = diffDoorSets([door("p", { score: 62 })], [door("p", { score: 89 })]);

    expect(diff.score_changes).toEqual([{ program_id: "p", old_score: 62, new_score: 89 }]);
    expect(diff.opened).toEqual([]);
    expect(diff.closed).toEqual([]);
    expect(diff.added).toEqual([]);
    // The door did change — a score move is movement, just not a door gained.
    expect(diff.changed).toEqual(["p"]);
  });

  it("treats an identical door as unchanged", () => {
    const diff = diffDoorSets([door("p")], [door("p")]);

    expect(diff.unchanged).toEqual(["p"]);
    expect(diff.changed).toEqual([]);
    expect(diff.deadline_changes).toEqual([]);
    expect(diff.score_changes).toEqual([]);
    expect(diff.next_action_changes).toEqual([]);
  });

  it("ignores a countdown that only moved because a day passed", () => {
    // Same last day to act, one day closer to it: nothing about the door moved.
    const diff = diffDoorSets([door("p", { days_remaining: 478 })], [door("p", { days_remaining: 477 })]);

    expect(diff.unchanged).toEqual(["p"]);
  });

  it("notices a blocker appearing even when the status holds", () => {
    const diff = diffDoorSets(
      [door("p")],
      [door("p", { explanation_facts: { reasons: [], blockers: ["нужен полный грант"] } })],
    );

    expect(diff.changed).toEqual(["p"]);
    expect(diff.closed).toEqual([]);
  });
});

describe("catalogue movement", () => {
  it("reports a programme that only exists on one side", () => {
    const diff = diffDoorSets([door("p-gone"), door("p-stays")], [door("p-stays"), door("p-new")]);

    expect(diff.removed).toEqual(["p-gone"]);
    expect(diff.added).toEqual(["p-new"]);
    expect(diff.unchanged).toEqual(["p-stays"]);
    // A programme that was not there before did not "open".
    expect(diff.opened).toEqual([]);
  });
});

describe("determinism", () => {
  const before = [doorIn("b", "open"), doorIn("a", "closed"), doorIn("c", "open", { score: 40 })];
  const after = [doorIn("c", "open", { score: 70 }), doorIn("a", "open"), doorIn("b", "closed")];

  it("does not care what order the doors arrive in", () => {
    const straight = diffDoorSets(before, after);
    const shuffled = diffDoorSets([...before].reverse(), [...after].reverse());

    expect(JSON.stringify(shuffled)).toBe(JSON.stringify(straight));
    expect(straight.opened).toEqual(["a"]);
    expect(straight.closed).toEqual(["b"]);
    expect(straight.score_changes).toEqual([{ program_id: "c", old_score: 40, new_score: 70 }]);
  });

  it("sorts every list by program id", () => {
    const diff = diffDoorSets(
      [door("z", { score: 10 }), door("a", { score: 10 }), door("m", { score: 10 })],
      [door("z", { score: 20 }), door("a", { score: 20 }), door("m", { score: 20 })],
    );

    expect(diff.changed).toEqual(["a", "m", "z"]);
    expect(diff.score_changes.map((item) => item.program_id)).toEqual(["a", "m", "z"]);
  });

  it("gives the same answer twice", () => {
    expect(JSON.stringify(diffDoorSets(before, after))).toBe(
      JSON.stringify(diffDoorSets(before, after)),
    );
  });

  it("leaves both inputs exactly as they were", () => {
    const beforeSnapshot = JSON.stringify(before);
    const afterSnapshot = JSON.stringify(after);

    diffDoorSets(before, after);

    expect(JSON.stringify(before)).toBe(beforeSnapshot);
    expect(JSON.stringify(after)).toBe(afterSnapshot);
  });
});

/* -------------------------------------------------------------------------- */
/* Route level                                                                 */
/* -------------------------------------------------------------------------- */

function fact(date: string): DateFact {
  return { date, confidence: "verified", source_id: "src-test", checked_at: "2026-09-01" };
}

const ACTIONS: ActionStep[] = [
  {
    id: "apply",
    title: "apply",
    kind: "application",
    depends_on: [],
    unlocks: [],
    effort_minutes: 90,
    duration_days: 7,
    source_id: "src-test",
  },
  {
    id: "sat_reg",
    title: "sat_reg",
    kind: "exam_registration",
    depends_on: [],
    unlocks: [],
    effort_minutes: 20,
    duration_days: 0,
    hard_deadline: fact("2026-10-01"),
    source_id: "src-test",
  },
];

function program(id: string, over: Partial<Program> = {}): Program {
  return {
    id,
    name: id,
    org: "Test org",
    country: "DE",
    level: "bachelor",
    fields: ["programming"],
    language: ["ru"],
    tuition_per_year: {
      amount: 9_000,
      currency: "USD",
      confidence: "verified",
      source_id: "src-test",
    },
    funding: ["none"],
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
    languages: [{ code: "ru", level: "C1" }],
    exams: [],
    constraints: {},
    ...over,
  };
}

describe("diffRoutes", () => {
  const CATALOG: Catalog = {
    actions: ACTIONS,
    programs: [
      program("p-paid"),
      program("p-sat", { action_chain: ["sat_reg"], application_deadline: fact("2026-11-01") }),
    ],
  };

  it("compares the single next step by id", () => {
    const before = computeRoute(profile(), CATALOG, TODAY);
    const after = computeRoute(profile(), { ...CATALOG, programs: [program("p-paid")] }, TODAY);

    expect(before.next_action?.action_id).toBe("sat_reg");
    expect(after.next_action?.action_id).toBe("apply");

    const diff = diffRoutes(before, after);
    expect(diff.next_action_changed).toBe(true);
    expect(diff.old_next_action_id).toBe("sat_reg");
    expect(diff.new_next_action_id).toBe("apply");
    expect(diff.removed).toEqual(["p-sat"]);
  });

  it("says nothing changed when nothing did", () => {
    const route = computeRoute(profile(), CATALOG, TODAY);
    const diff = diffRoutes(route, computeRoute(profile(), CATALOG, TODAY));

    expect(diff.next_action_changed).toBe(false);
    expect(diff.old_next_action_id).toBe(diff.new_next_action_id);
    expect(diff.changed).toEqual([]);
    expect(diff.unchanged).toEqual(["p-paid", "p-sat"]);
  });

  it("reports a real profile edit as facts and nothing else", () => {
    // The applicant can only take a fully funded place; both programmes are
    // paid, so both are blocked. Dropping that condition unblocks them without
    // touching a single date.
    const strict = profile({ constraints: { needs_full_funding: true } });
    const before = computeRoute(strict, CATALOG, TODAY);
    const after = computeRoute(profile(), CATALOG, TODAY);

    const diff = diffRoutes(before, after);

    expect(diff.changed).toEqual(["p-paid", "p-sat"]);
    expect(diff.deadline_changes).toEqual([]);
    expect(diff.next_action_changed).toBe(false);
    // Statuses are a matter of the calendar, so none of them moved.
    expect(diff.opened).toEqual([]);
    expect(diff.closed).toEqual([]);
    // What moved is the blockers, which the door itself carries.
    expect(before.doors.every((item) => item.explanation_facts.blockers.length > 0)).toBe(true);
    expect(after.doors.every((item) => item.explanation_facts.blockers.length === 0)).toBe(true);
  });
});
