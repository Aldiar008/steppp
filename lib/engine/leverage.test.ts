import { describe, expect, it } from "vitest";

import { computeDoors, computeLeverage, getTopLeverage, type Catalog } from "@/lib/engine";
import { diffDeadlines } from "@/lib/engine/diff";
import { applyProfileChange } from "@/lib/engine/profile-patch";
import { LEVERAGE_CANDIDATES, type LeverageCandidate } from "@/data/leverage-candidates";
import type { ActionStep, DateFact, Door, Profile, Program, Requirement } from "@/lib/types";

/**
 * Leverage is the one screen that tells an applicant what to spend an autumn
 * on, so every number on it has to survive being checked. These tests pin that
 * a door is only ever counted once the engine shows it standing open on the
 * counterfactual board, that a change which costs doors is never dressed up as
 * a recommendation, and that the profile the applicant actually entered comes
 * back from the analysis untouched.
 */

const TODAY = "2026-09-17";

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
];

const ENGLISH: Requirement = {
  id: "en",
  kind: "language",
  label: "английский язык",
  required: true,
};

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
      amount: 4_000,
      currency: "USD",
      confidence: "verified",
      source_id: "src-test",
    },
    funding: ["state_grant"],
    requirements: [],
    action_chain: ["apply"],
    application_deadline: fact("2027-01-15"),
    ...over,
  };
}

/** A programme taught in English, which the baseline applicant does not have. */
function englishProgram(id: string, over: Partial<Program> = {}): Program {
  return program(id, { language: ["en"], requirements: [ENGLISH], ...over });
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

function candidate(over: Partial<LeverageCandidate> = {}): LeverageCandidate {
  return {
    id: "c-english",
    title: "Подтвердить английский",
    field: "languages",
    to: { code: "en", level: "B2" },
    effort_minutes: 2_400,
    ...over,
  } as LeverageCandidate;
}

const ENGLISH_CANDIDATE = candidate();
const NOOP_CANDIDATE = candidate({
  id: "c-interest",
  title: "Добавить Computer Science",
  field: "interests",
  to: ["computer_science"],
  effort_minutes: 10,
});

/**
 * Three English-taught programmes the applicant cannot enter today, and one
 * Russian-taught one they can. Every deadline is far away, so the calendar
 * never interferes with what the profile is doing.
 */
const BOARD: Catalog = {
  actions: ACTIONS,
  programs: [
    englishProgram("p-en-1"),
    englishProgram("p-en-2"),
    englishProgram("p-en-3"),
    program("p-ru"),
  ],
};

function byId<T extends { id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`No entry for ${id}`);
  return found;
}

describe("baseline", () => {
  it("starts from doors the engine says are actually reachable", () => {
    const doors = computeDoors(profile(), BOARD, TODAY);

    // All four are open on the calendar…
    expect(doors.every((door) => door.status === "open")).toBe(true);
    // …but three of them are blocked by a language the applicant does not have.
    const blocked = doors.filter((door) => door.explanation_facts.blockers.length > 0);
    expect(blocked.map((door) => door.program_id)).toEqual(["p-en-1", "p-en-2", "p-en-3"]);
  });
});

describe("computeLeverage", () => {
  it("counts the doors a change opens", () => {
    const result = computeLeverage(profile(), BOARD, [ENGLISH_CANDIDATE], TODAY);
    const english = byId(result, "c-english");

    expect(english.doors_gained).toBe(3);
    expect(english.doors_retained).toBe(1);
    expect(english.doors_delta).toBe(3);
    expect(english.lost_doors).toEqual([]);
    expect(english.changed_field).toBe("languages");
    expect(english.old_value).toBeUndefined();
    expect(english.new_value).toEqual({ code: "en", level: "B2" });
  });

  it("names the doors behind the number", () => {
    const result = computeLeverage(profile(), BOARD, [ENGLISH_CANDIDATE], TODAY);
    const english = byId(result, "c-english");

    expect(english.reopened_doors).toEqual(["p-en-1", "p-en-2", "p-en-3"]);
    expect(english.reopened_doors).toHaveLength(english.doors_gained);
    // Real programme ids, not labels invented for the screen.
    const known = BOARD.programs.map((item) => item.id);
    for (const id of english.reopened_doors) expect(known).toContain(id);
  });

  it("reports a change that opens nothing as opening nothing", () => {
    const result = computeLeverage(profile(), BOARD, [NOOP_CANDIDATE], TODAY);
    const noop = byId(result, "c-interest");

    expect(noop.doors_gained).toBe(0);
    expect(noop.doors_delta).toBe(0);
    expect(noop.reopened_doors).toEqual([]);
    expect(noop.efficiency).toBe(0);
    // It does change the fit score — and that is deliberately not a door.
    const before = computeDoors(profile(), BOARD, TODAY);
    const after = computeDoors(
      applyProfileChange(profile(), NOOP_CANDIDATE),
      BOARD,
      TODAY,
    );
    expect(after[0]?.score).not.toBe(before[0]?.score);
  });

  it("records a change that costs doors instead of hiding it", () => {
    const wealthy = profile({ constraints: { needs_full_funding: false } });
    const paidBoard: Catalog = {
      actions: ACTIONS,
      programs: [program("p-paid", { funding: ["none"] }), program("p-ru")],
    };
    const demandGrant = candidate({
      id: "c-grant-only",
      title: "Рассматривать только полный грант",
      field: "constraints.needs_full_funding",
      to: true,
      effort_minutes: 30,
    });

    const result = computeLeverage(wealthy, paidBoard, [demandGrant], TODAY);
    const item = byId(result, "c-grant-only");

    expect(item.doors_gained).toBe(0);
    expect(item.lost_doors).toEqual(["p-paid"]);
    expect(item.doors_delta).toBe(-1);
    expect(item.doors_retained).toBe(1);
    // A change that costs a door is never offered as a recommendation.
    expect(getTopLeverage(result)).toEqual([]);
  });

  it("does not read uncertainty as an opened door", () => {
    const gapBoard: Catalog = {
      actions: ACTIONS,
      programs: [englishProgram("p-gap", { action_chain: ["ghost"] })],
    };
    const result = computeLeverage(profile(), gapBoard, [ENGLISH_CANDIDATE], TODAY);
    const english = byId(result, "c-english");

    // The language blocker goes away, but the door still cannot be dated.
    expect(computeDoors(profile(), gapBoard, TODAY)[0]?.status).toBe("needs_data");
    expect(english.doors_gained).toBe(0);
    expect(english.reopened_doors).toEqual([]);
  });
});

describe("deadline impacts", () => {
  it("records a moved date and ignores an unchanged one", () => {
    const before = [
      { program_id: "p-moved", point_of_no_return: "2026-11-20" },
      { program_id: "p-still", point_of_no_return: "2026-12-01" },
      { program_id: "p-undated" },
    ] as Door[];
    const after = [
      { program_id: "p-moved", point_of_no_return: "2026-12-04" },
      { program_id: "p-still", point_of_no_return: "2026-12-01" },
      { program_id: "p-undated", point_of_no_return: "2027-01-05" },
    ] as Door[];

    expect(diffDeadlines(before, after)).toEqual([
      { program_id: "p-moved", old_date: "2026-11-20", new_date: "2026-12-04", delta_days: 14 },
      { program_id: "p-undated", new_date: "2027-01-05" },
    ]);
  });

  it("stays empty when a change moves a status but no date", () => {
    const result = computeLeverage(profile(), BOARD, [ENGLISH_CANDIDATE], TODAY);
    const english = byId(result, "c-english");

    // Three doors became reachable and not one deadline moved: the reverse
    // planner is a function of the programme and the catalogue, never of the
    // profile. An invented date here would be the worst kind of lie.
    expect(english.doors_gained).toBe(3);
    expect(english.deadline_impacts).toEqual([]);
  });
});

describe("effort and efficiency", () => {
  it("prices doors per minute of effort", () => {
    const result = computeLeverage(profile(), BOARD, [ENGLISH_CANDIDATE], TODAY);
    const english = byId(result, "c-english");

    expect(english.effort_minutes).toBe(2_400);
    expect(english.efficiency).toBe(3 / 2_400);
    expect(english.insufficient_data).toEqual([]);
  });

  it("survives zero effort without dividing by it", () => {
    const free = candidate({ id: "c-free", effort_minutes: 0 });
    const result = computeLeverage(profile(), BOARD, [free], TODAY);
    const item = byId(result, "c-free");

    expect(item.doors_gained).toBe(3);
    expect(item.efficiency).toBe(0);
    expect(Number.isFinite(item.efficiency)).toBe(true);
    expect(item.insufficient_data).toEqual(["effort_minutes_zero"]);
  });

  it("refuses to rank an effort it does not have", () => {
    const unknownEffort = candidate({
      id: "c-unknown",
      effort_minutes: undefined as unknown as number,
    });
    const result = computeLeverage(profile(), BOARD, [unknownEffort], TODAY);
    const item = byId(result, "c-unknown");

    expect(item.doors_gained).toBe(3);
    expect(item.efficiency).toBe(0);
    expect(item.insufficient_data).toEqual(["effort_minutes_missing"]);
  });

  it("keeps a change the engine cannot apply out of the way", () => {
    const broken = {
      ...ENGLISH_CANDIDATE,
      id: "c-broken",
      field: "nickname",
    } as unknown as LeverageCandidate;
    const result = computeLeverage(profile(), BOARD, [broken, ENGLISH_CANDIDATE], TODAY);
    const item = byId(result, "c-broken");

    expect(item.doors_gained).toBe(0);
    expect(item.insufficient_data[0]).toContain("change_not_applicable");
    // And the healthy candidate is still analysed.
    expect(byId(result, "c-english").doors_gained).toBe(3);
  });
});

describe("ranking", () => {
  const cheapTwo = candidate({
    id: "c-cheap",
    field: "constraints.needs_full_funding",
    to: false,
    effort_minutes: 30,
  });

  it("puts doors first, then doors per minute", () => {
    const grantSeeker = profile({ constraints: { needs_full_funding: true } });
    const board: Catalog = {
      actions: ACTIONS,
      programs: [
        englishProgram("p-en-1"),
        englishProgram("p-en-2"),
        englishProgram("p-en-3"),
        program("p-paid-1", { funding: ["none"] }),
        program("p-paid-2", { funding: ["none"] }),
      ],
    };

    const result = computeLeverage(
      grantSeeker,
      board,
      [cheapTwo, ENGLISH_CANDIDATE, NOOP_CANDIDATE],
      TODAY,
    );

    // English opens three doors at 2400 minutes, funding opens two at 30.
    expect(result.map((item) => item.id)).toEqual(["c-english", "c-cheap", "c-interest"]);
    expect(byId(result, "c-english").doors_gained).toBe(3);
    expect(byId(result, "c-cheap").doors_gained).toBe(2);
    expect(byId(result, "c-cheap").efficiency).toBeGreaterThan(
      byId(result, "c-english").efficiency,
    );
  });

  it("orders identical candidates by id, every time", () => {
    const twins: LeverageCandidate[] = [
      candidate({ id: "c-b" }),
      candidate({ id: "c-a" }),
      candidate({ id: "c-c" }),
    ];
    const first = computeLeverage(profile(), BOARD, twins, TODAY);
    const second = computeLeverage(profile(), BOARD, twins, TODAY);

    expect(first.map((item) => item.id)).toEqual(["c-a", "c-b", "c-c"]);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("offers at most three changes and only ones that help", () => {
    const grantSeeker = profile({ constraints: { needs_full_funding: true } });
    const board: Catalog = {
      actions: ACTIONS,
      programs: [
        englishProgram("p-en-1"),
        englishProgram("p-en-2"),
        program("p-paid", { funding: ["none"] }),
        program("p-ru"),
      ],
    };
    const relocation = candidate({
      id: "c-relocate",
      field: "countries",
      to: ["PL"],
      effort_minutes: 20,
    });

    const result = computeLeverage(
      grantSeeker,
      board,
      [cheapTwo, ENGLISH_CANDIDATE, NOOP_CANDIDATE, relocation],
      TODAY,
    );
    const top = getTopLeverage(result);

    expect(top.map((item) => item.id)).toEqual(["c-english", "c-cheap"]);
    expect(top.length).toBeLessThanOrEqual(3);
    for (const item of top) expect(item.doors_gained).toBeGreaterThan(0);

    expect(getTopLeverage(result, 1).map((item) => item.id)).toEqual(["c-english"]);
    expect(getTopLeverage(result, 0)).toEqual([]);
  });

  it("rejects a today that is not an ISO date", () => {
    expect(() => computeLeverage(profile(), BOARD, [ENGLISH_CANDIDATE], "17.09.2026")).toThrow(
      /ISO date/,
    );
  });
});

describe("immutability", () => {
  it("leaves the applicant's profile exactly as it was", () => {
    const applicant = profile({
      exams: [{ id: "ielts", score: 5.5, status: "taken" }],
      constraints: { needs_full_funding: true },
    });
    const snapshot = JSON.parse(JSON.stringify(applicant)) as Profile;

    computeLeverage(applicant, BOARD, [ENGLISH_CANDIDATE, NOOP_CANDIDATE], TODAY);

    expect(applicant).toEqual(snapshot);
  });

  it("builds a new object rather than writing into the old one", () => {
    const applicant = profile();
    const changed = applyProfileChange(applicant, ENGLISH_CANDIDATE);

    expect(changed).not.toBe(applicant);
    expect(changed.languages).not.toBe(applicant.languages);
    expect(applicant.languages).toEqual([{ code: "ru", level: "C1" }]);
    expect(changed.languages).toEqual([{ code: "ru", level: "C1" }, { code: "en", level: "B2" }]);
    // Untouched branches are carried over unchanged.
    expect(changed.interests).toBe(applicant.interests);
    expect(changed.constraints).toBe(applicant.constraints);
  });

  it("replaces an entry with the same id instead of listing it twice", () => {
    const applicant = profile({ exams: [{ id: "ielts", score: 5.5, status: "taken" }] });
    const retake = candidate({
      id: "c-retake",
      field: "exams",
      to: { id: "ielts", score: 6.5, status: "taken" },
      effort_minutes: 900,
    });

    const changed = applyProfileChange(applicant, retake);
    expect(changed.exams).toEqual([{ id: "ielts", score: 6.5, status: "taken" }]);
    expect(applicant.exams).toEqual([{ id: "ielts", score: 5.5, status: "taken" }]);
  });

  it("adds to a list without dropping or duplicating what is there", () => {
    const applicant = profile({ countries: ["DE"] });
    const addBoth = candidate({
      id: "c-countries",
      field: "countries",
      to: ["DE", "PL"],
      effort_minutes: 20,
    });

    expect(applyProfileChange(applicant, addBoth).countries).toEqual(["DE", "PL"]);
    expect(applicant.countries).toEqual(["DE"]);
  });
});

describe("the shipped candidate list", () => {
  it("is applicable end to end, every entry", () => {
    const applicant = profile({ constraints: { needs_full_funding: true, can_relocate: false } });
    const result = computeLeverage(applicant, BOARD, LEVERAGE_CANDIDATES, TODAY);

    expect(result).toHaveLength(LEVERAGE_CANDIDATES.length);
    for (const item of result) {
      // Nothing in the authored list is unapplicable, and no entry invents a
      // door: every gain is backed by a named programme.
      expect(item.insufficient_data.filter((r) => r.startsWith("change_not_applicable"))).toEqual(
        [],
      );
      expect(item.reopened_doors).toHaveLength(item.doors_gained);
      expect(item.doors_delta).toBe(item.doors_gained - item.lost_doors.length);
    }
    expect(getTopLeverage(result).length).toBeLessThanOrEqual(3);
  });
});
