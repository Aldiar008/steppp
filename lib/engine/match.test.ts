import { describe, expect, it } from "vitest";

import {
  matchProfileToProgram,
  matchProgram,
  type MatchDimension,
  type MatchResult,
} from "@/lib/engine";
import type { ActionStep, DateFact, Profile, Program, Requirement } from "@/lib/types";

/**
 * Matching is the layer that decides what an applicant is even shown, so its
 * failure modes are expensive in both directions: a false blocker hides a route
 * a person could have taken, a false pass sends them at a route they cannot.
 *
 * These tests pin the four promises the module makes — fit and availability
 * stay separate, unknown data never becomes an invented fact, the score stays a
 * bounded match score, and the same inputs always give the same answer.
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

function catalogue(...steps: ActionStep[]): Record<string, ActionStep> {
  return Object.fromEntries(steps.map((step) => [step.id, step]));
}

/** Tuition is optional on a Program now; these fixtures always state one. */
const TUITION = {
  amount: 4_000,
  currency: "USD",
  confidence: "verified",
  source_id: "src-test",
} as const;

function program(over: Partial<Program> = {}): Program {
  return {
    id: "prog-test",
    name: "Test programme",
    org: "Test org",
    country: "DE",
    level: "bachelor",
    fields: ["computer_science", "ux"],
    language: ["en"],
    tuition_per_year: { ...TUITION },
    funding: ["partial"],
    requirements: [],
    action_chain: [],
    application_deadline: fact("2027-01-15"),
    ...over,
  };
}

function profile(over: Partial<Profile> = {}): Profile {
  return {
    interests: ["design", "programming"],
    countries: ["DE"],
    languages: [{ code: "en", level: "B2" }],
    exams: [],
    constraints: {},
    ...over,
  };
}

function requirement(over: Partial<Requirement> = {}): Requirement {
  return { id: "req", kind: "other", label: "req", required: true, ...over };
}

function componentOf(result: MatchResult, dimension: MatchDimension): number | null {
  const component = result.components.find((item) => item.dimension === dimension);
  if (!component) throw new Error(`No component for ${dimension}`);
  return component.value;
}

/** A chain that is comfortably in the future, so the schedule never interferes. */
const OPEN_CHAIN = catalogue(action("apply", { kind: "application", duration_days: 7 }));

describe("interest matching", () => {
  it("scores a profile the programme was written for", () => {
    const result = matchProfileToProgram(
      profile({
        interests: ["дизайн интерфейсов", "код"],
        countries: ["DE"],
        languages: [{ code: "en", level: "B2" }],
      }),
      program({ fields: ["computer_science", "ux"], funding: ["full_scholarship"] }),
    );

    // "дизайн интерфейсов" → ux is an exact hit, "код" → programming is one
    // family away from computer_science.
    expect(componentOf(result, "interest")).toBeCloseTo(0.875, 10);
    expect(result.hard_pass).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons.some((line) => line.includes("интересы совпадают"))).toBe(true);
  });

  it("gives no interest credit when the fields are unrelated", () => {
    const result = matchProfileToProgram(
      profile({ interests: ["медицина"] }),
      program({ fields: ["computer_science", "ux"] }),
    );

    expect(componentOf(result, "interest")).toBe(0);
    expect(result.reasons.some((line) => line.includes("интересы совпадают"))).toBe(false);
    expect(result.score).toBeLessThan(50);
    // A mismatch of taste is not a gate: the door stays a legal option.
    expect(result.hard_pass).toBe(true);
  });

  it("drops the dimension instead of scoring zero when interests are unstated", () => {
    const stated = matchProfileToProgram(profile({ interests: ["медицина"] }), program());
    const blank = matchProfileToProgram(profile({ interests: [] }), program());

    expect(componentOf(blank, "interest")).toBeNull();
    expect(blank.signals).toContain("interests_unknown");
    expect(blank.score).toBeGreaterThan(stated.score);
  });
});

describe("hard constraints", () => {
  it("blocks a programme with no funded place when full funding is required", () => {
    const result = matchProfileToProgram(
      profile({ constraints: { needs_full_funding: true } }),
      program({ funding: ["none"] }),
    );

    expect(result.hard_pass).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]).toContain("полный вариант финансирования");
    expect(componentOf(result, "funding")).toBe(0);
  });

  it("passes the funding constraint on a state grant or a full scholarship", () => {
    for (const funding of [["state_grant"], ["full_scholarship"], ["partial", "state_grant"]]) {
      const result = matchProfileToProgram(
        profile({ constraints: { needs_full_funding: true } }),
        program({ funding: funding as Program["funding"] }),
      );
      expect(result.hard_pass).toBe(true);
      expect(componentOf(result, "funding")).toBe(1);
    }
  });

  it("keeps a country outside the applicant's list as a preference, not a gate", () => {
    const result = matchProfileToProgram(
      profile({ countries: ["PL"] }),
      program({ country: "DE" }),
    );

    expect(result.hard_pass).toBe(true);
    expect(componentOf(result, "country")).toBe(0);
  });

  it("blocks a foreign country only when the applicant said they cannot relocate", () => {
    const cannotMove = matchProfileToProgram(
      profile({ countries: ["KZ"], constraints: { can_relocate: false } }),
      program({ country: "DE" }),
    );
    expect(cannotMove.hard_pass).toBe(false);
    expect(cannotMove.blockers[0]).toContain("переезд невозможен");

    // With no country list there is nothing to check against, and nothing is
    // assumed about where the applicant lives.
    const noList = matchProfileToProgram(
      profile({ countries: [], constraints: { can_relocate: false } }),
      program({ country: "DE" }),
    );
    expect(noList.hard_pass).toBe(true);
    expect(noList.signals).toContain("relocation_scope_unknown");
  });

  it("blocks a stated tuition ceiling only in the same currency", () => {
    const overCeiling = matchProfileToProgram(
      profile({
        constraints: {
          max_tuition_per_year: { amount: 3_000, currency: "USD" },
        },
      }),
      program({ tuition_per_year: { ...TUITION, amount: 9_000 } }),
    );
    expect(overCeiling.hard_pass).toBe(false);
    expect(overCeiling.blockers[0]).toContain("выше указанного потолка");

    const otherCurrency = matchProfileToProgram(
      profile({
        constraints: {
          max_tuition_per_year: { amount: 3_000, currency: "KZT" },
        },
      }),
      program({ tuition_per_year: { ...TUITION, amount: 9_000 } }),
    );
    expect(otherCurrency.hard_pass).toBe(true);
    expect(otherCurrency.signals).toContain("tuition_ceiling_currency_mismatch");
  });
});

describe("language", () => {
  const ENGLISH = requirement({ id: "en", kind: "language", label: "английский язык" });

  it("blocks when the required language of instruction is explicitly absent", () => {
    const result = matchProfileToProgram(
      profile({ languages: [{ code: "ru", level: "C1" }] }),
      program({ language: ["en"], requirements: [ENGLISH] }),
    );

    expect(result.hard_pass).toBe(false);
    expect(result.blockers[0]).toContain("обязательного языка обучения");
    expect(result.unmatched).toContain("en");
    expect(componentOf(result, "language")).toBe(0);
  });

  it("does not block when no language data was entered at all", () => {
    const result = matchProfileToProgram(
      profile({ languages: [] }),
      program({ language: ["en"], requirements: [ENGLISH] }),
    );

    expect(result.hard_pass).toBe(true);
    expect(result.signals).toContain("en.unknown");
    expect(result.unmatched).toContain("en");
    expect(componentOf(result, "language")).toBeNull();
  });

  it("does not invent a level when the certificate has no score", () => {
    const withThreshold = requirement({
      id: "en",
      kind: "language",
      label: "английский B2",
      value: 6.5,
    });
    const result = matchProfileToProgram(
      profile({ languages: [{ code: "en", level: "B2" }] }),
      program({ language: ["en"], requirements: [withThreshold] }),
    );

    expect(result.signals).toContain("en.level_unknown");
    expect(result.matched).not.toContain("en");
    expect(result.hard_pass).toBe(true);
  });

  it("treats a language test as an exam, never as a gate", () => {
    const ielts = requirement({ id: "ielts", kind: "language", label: "IELTS 6.5", value: 6.5 });

    const passed = matchProfileToProgram(
      profile({ exams: [{ id: "ielts", score: 7, status: "taken" }] }),
      program({ requirements: [ielts] }),
    );
    expect(passed.matched).toContain("ielts");
    expect(passed.hard_pass).toBe(true);

    const notYet = matchProfileToProgram(
      profile({ exams: [{ id: "ielts", status: "registered" }] }),
      program({ requirements: [ielts] }),
    );
    expect(notYet.unmatched).toContain("ielts");
    expect(notYet.signals).toContain("ielts.in_progress");
    expect(notYet.hard_pass).toBe(true);
  });
});

describe("budget", () => {
  it("compares tuition to the budget when the currency is the same", () => {
    const affordable = matchProfileToProgram(
      profile({ budget_per_year: { amount: 5_000, currency: "USD" } }),
      program({ tuition_per_year: { ...TUITION, amount: 4_000 } }),
    );
    expect(affordable.tuition_compared).toBe(true);
    expect(componentOf(affordable, "other_fit")).toBe(1);
    expect(affordable.reasons.some((line) => line.includes("укладывается в бюджет"))).toBe(true);

    const tooExpensive = matchProfileToProgram(
      profile({ budget_per_year: { amount: 3_000, currency: "USD" } }),
      program({ tuition_per_year: { ...TUITION, amount: 9_000 } }),
    );
    expect(tooExpensive.tuition_compared).toBe(true);
    expect(componentOf(tooExpensive, "other_fit")).toBe(0);
    // Exceeding a budget is not the same as exceeding a stated ceiling.
    expect(tooExpensive.hard_pass).toBe(true);
  });

  it("refuses to convert currencies and says so instead", () => {
    const result = matchProfileToProgram(
      profile({ budget_per_year: { amount: 2_000_000, currency: "KZT" } }),
      program({ tuition_per_year: { ...TUITION, amount: 9_000 } }),
    );

    expect(result.tuition_compared).toBe(false);
    expect(result.signals).toContain("budget_currency_mismatch");
    expect(result.signals).toContain("budget_unknown");
    expect(componentOf(result, "other_fit")).toBeNull();
    expect(result.hard_pass).toBe(true);
    expect(result.reasons.some((line) => line.includes("бюджет"))).toBe(false);
  });

  it("marks an unstated budget as unknown rather than unaffordable", () => {
    const result = matchProfileToProgram(profile(), program());
    expect(result.signals).toContain("budget_not_stated");
    expect(result.tuition_compared).toBe(false);
  });
});

describe("score", () => {
  it("stays inside 0-100 across extreme inputs", () => {
    const cases: MatchResult[] = [
      matchProfileToProgram(profile(), program()),
      matchProfileToProgram(
        profile({ interests: [], countries: [], languages: [], exams: [] }),
        program({ fields: [], language: [], funding: [] }),
      ),
      matchProfileToProgram(
        profile({
          interests: ["программирование"],
          countries: ["DE"],
          languages: [{ code: "en" }],
          budget_per_year: { amount: 50_000, currency: "USD" },
        }),
        program({ fields: ["programming"], funding: ["full_scholarship"] }),
      ),
      matchProfileToProgram(
        profile({ interests: ["право"], countries: ["US"], languages: [{ code: "kk" }] }),
        program({ funding: ["none"] }),
      ),
    ];

    for (const result of cases) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    }
  });

  it("reaches 100 only when every known dimension is fully met", () => {
    const result = matchProfileToProgram(
      profile({
        interests: ["программирование"],
        countries: ["DE"],
        languages: [{ code: "en" }],
        budget_per_year: { amount: 10_000, currency: "USD" },
      }),
      program({ fields: ["programming"], funding: ["full_scholarship"] }),
    );
    expect(result.score).toBe(100);
  });

  it("scores no dimension at all as 0 without pretending otherwise", () => {
    const result = matchProfileToProgram(
      profile({ interests: [], countries: [], languages: [], exams: [] }),
      program({ fields: [], language: [], funding: [], requirements: [] }),
    );
    expect(result.score).toBe(0);
    expect(result.components.every((component) => component.value === null)).toBe(true);
  });
});

describe("door", () => {
  it("keeps a high match open when the calendar allows it", () => {
    const door = matchProgram(
      profile({ interests: ["программирование"], countries: ["DE"] }),
      program({ fields: ["programming"], action_chain: ["apply"] }),
      OPEN_CHAIN,
      TODAY,
    );

    expect(door.status).toBe("open");
    expect(door.program_id).toBe("prog-test");
    expect(door.point_of_no_return).toBe("2027-01-08");
    expect(door.next_critical_action_id).toBe("apply");
    expect(door.score).toBeGreaterThan(50);
  });

  it("closes a well-matching programme whose chain has already run out", () => {
    const chain = catalogue(
      action("sat_reg", {
        kind: "exam_registration",
        hard_deadline: fact("2026-05-20"),
        duration_days: 0,
        unlocks: ["sat_exam"],
      }),
      action("sat_exam", {
        kind: "exam",
        hard_deadline: fact("2026-06-05"),
        duration_days: 14,
        depends_on: ["sat_reg"],
      }),
      action("apply", { kind: "application", duration_days: 7, depends_on: ["sat_exam"] }),
    );

    const door = matchProgram(
      profile({
        interests: ["программирование"],
        countries: ["DE"],
        languages: [{ code: "en" }],
        budget_per_year: { amount: 10_000, currency: "USD" },
      }),
      program({
        fields: ["programming"],
        funding: ["full_scholarship"],
        action_chain: ["apply"],
        application_deadline: fact("2026-07-01"),
      }),
      chain,
      TODAY,
    );

    // Fit and availability answer different questions, and both are reported.
    expect(door.score).toBe(100);
    expect(door.status).toBe("closed");
    expect(door.point_of_no_return).toBe("2026-05-20");
    expect(door.explanation_facts.blockers.some((line) => line.includes("срок упущен"))).toBe(true);
  });

  it("reports needs_data instead of guessing a missing duration", () => {
    const chain = catalogue(action("apply", { kind: "application", duration_days: undefined }));

    const door = matchProgram(
      profile({ interests: ["программирование"] }),
      program({ fields: ["programming"], action_chain: ["apply"] }),
      chain,
      TODAY,
    );

    expect(door.status).toBe("needs_data");
    expect(door.point_of_no_return).toBeUndefined();
    expect(door.days_remaining).toBeUndefined();
    expect(
      door.explanation_facts.blockers.some((line) => line.includes("apply.duration_days")),
    ).toBe(true);
    // The match itself is still computed and still honest.
    expect(door.score).toBeGreaterThan(0);
  });

  it("never lets a weak match close a door on its own", () => {
    const door = matchProgram(
      profile({
        interests: ["медицина"],
        countries: ["US"],
        languages: [{ code: "kk" }],
        constraints: { needs_full_funding: true },
      }),
      program({ funding: ["none"], action_chain: ["apply"] }),
      OPEN_CHAIN,
      TODAY,
    );

    expect(door.status).toBe("open");
    expect(door.score).toBeLessThan(30);
    expect(door.explanation_facts.blockers.length).toBeGreaterThan(0);
  });

  it("marks closing_soon from the point of no return, not from the score", () => {
    const door = matchProgram(
      profile(),
      program({ action_chain: ["apply"], application_deadline: fact("2026-09-25") }),
      OPEN_CHAIN,
      TODAY,
    );

    expect(door.status).toBe("closing_soon");
    expect(door.days_remaining).toBe(1);
  });

  it("carries the weakest confidence of the facts it used", () => {
    const chain = catalogue(
      action("apply", {
        kind: "application",
        duration_days: 7,
        hard_deadline: {
          date: "2026-12-01",
          confidence: "last_cycle",
          source_id: "src-test",
          checked_at: "2026-09-01",
        },
      }),
    );

    const door = matchProgram(
      profile(),
      program({ action_chain: ["apply"], confidence: "verified" }),
      chain,
      TODAY,
    );
    expect(door.confidence).toBe("last_cycle");

    // A tuition fact that was never comparable never used, so it cannot drag
    // the door's confidence down.
    const demoTuition = matchProgram(
      profile({ budget_per_year: { amount: 2_000_000, currency: "KZT" } }),
      program({
        action_chain: ["apply"],
        confidence: "verified",
        tuition_per_year: {
          amount: 9_000,
          currency: "USD",
          confidence: "demo",
          source_id: "src-test",
        },
      }),
      OPEN_CHAIN,
      TODAY,
    );
    expect(demoTuition.confidence).toBe("verified");
  });
});

describe("determinism", () => {
  it("returns identical results for identical inputs", () => {
    const applicant = profile({
      interests: ["код", "дизайн интерфейсов"],
      countries: ["DE", "PL"],
      languages: [{ code: "en", score: 7 }],
      exams: [{ id: "ielts", score: 7, status: "taken" }],
      budget_per_year: { amount: 6_000, currency: "USD" },
      constraints: { needs_full_funding: false },
    });
    const target = program({
      action_chain: ["apply"],
      requirements: [requirement({ id: "ielts", kind: "language", label: "IELTS 6.5", value: 6.5 })],
    });

    const first = matchProgram(applicant, target, OPEN_CHAIN, TODAY);
    const second = matchProgram(applicant, target, OPEN_CHAIN, TODAY);

    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));

    // And the ordering of the applicant's own lists does not move the score.
    const reordered = matchProgram(
      { ...applicant, interests: ["дизайн интерфейсов", "код"], countries: ["PL", "DE"] },
      target,
      OPEN_CHAIN,
      TODAY,
    );
    expect(reordered.score).toBe(first.score);
  });
});
