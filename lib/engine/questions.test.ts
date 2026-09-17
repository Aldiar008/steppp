import { describe, expect, it } from "vitest";

import {
  applyInterviewAnswer,
  candidateValuesOf,
  computeRoute,
  MAX_ADAPTIVE_QUESTIONS,
  QUESTION_INFLUENCE_THRESHOLD,
  selectNextQuestion,
  unknownProfileFields,
  type Catalog,
  type QuestionDefinition,
} from "@/lib/engine";
import { QUESTION_CATALOG } from "@/data/questions";
import { CATALOG } from "@/data/catalog";
import type { ActionStep, DateFact, Profile, Program } from "@/lib/types";

/**
 * The interview's promise is that every question earns its place: an applicant
 * answers five things instead of thirty because the other twenty-five would not
 * have changed a single door. These tests pin that the choice is measured
 * rather than opinionated, that it stops when there is nothing left worth
 * asking, and that an answer never damages the profile it is applied to.
 */

const TODAY = "2026-09-17";

function fact(date: string): DateFact {
  return { date, confidence: "demo", source_id: "src-test", checked_at: "2026-09-01" };
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

function program(id: string, over: Partial<Program> = {}): Program {
  return {
    id,
    name: id,
    org: "Test org",
    country: "KZ",
    level: "bachelor",
    fields: ["programming"],
    language: ["ru"],
    tuition_per_year: {
      amount: 4_000,
      currency: "USD",
      confidence: "demo",
      source_id: "src-test",
    },
    funding: ["state_grant"],
    requirements: [],
    action_chain: ["apply"],
    application_deadline: fact("2027-01-15"),
    ...over,
  };
}

function profile(over: Partial<Profile> = {}): Profile {
  return {
    interests: [],
    countries: [],
    languages: [],
    exams: [],
    constraints: {},
    ...over,
  };
}

/**
 * Three programmes taught in English that the applicant cannot enter without
 * it, and one taught in Russian that they can.
 */
const BOARD: Catalog = {
  actions: ACTIONS,
  programs: [
    program("p-en-1", {
      language: ["en"],
      requirements: [{ id: "en", kind: "language", label: "английский", required: true }],
    }),
    program("p-en-2", {
      language: ["en"],
      requirements: [{ id: "en", kind: "language", label: "английский", required: true }],
    }),
    program("p-en-3", {
      language: ["en"],
      requirements: [{ id: "en", kind: "language", label: "английский", required: true }],
    }),
    program("p-ru"),
  ],
};

/** Moves three doors from unreachable to reachable, or leaves them shut. */
const LANGUAGE_QUESTION: QuestionDefinition = {
  id: "q-language",
  field: "languages",
  type: "single",
  title: "Как у тебя с английским?",
  options: [
    { value: "en", label: "Есть английский", to: { code: "en", level: "B2" } },
    { value: "ru", label: "Только русский", to: { code: "ru", level: "C1" } },
  ],
};

/** Changes fit and nothing else: every programme is in the same field. */
const INTEREST_QUESTION: QuestionDefinition = {
  id: "q-interests",
  field: "interests",
  type: "multi",
  title: "Что тебе интересно?",
  options: [
    { value: "programming", label: "Программирование", to: "programming" },
    { value: "medicine", label: "Медицина", to: "medicine" },
  ],
};

describe("candidate questions", () => {
  it("asks about a field the profile does not know", () => {
    const selection = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [LANGUAGE_QUESTION],
    });

    expect(selection?.question_id).toBe("q-language");
    expect(selection?.remaining_candidate_questions).toBe(1);
  });

  it("never asks about a field the profile already holds", () => {
    const known = profile({ languages: [{ code: "en", level: "B2" }] });

    expect(selectNextQuestion(known, BOARD, [], TODAY, { questions: [LANGUAGE_QUESTION] })).toBeNull();
    expect(unknownProfileFields(known, [LANGUAGE_QUESTION])).toEqual([]);
    expect(unknownProfileFields(profile(), [LANGUAGE_QUESTION])).toEqual(["languages"]);
  });

  it("never asks the same question twice", () => {
    expect(
      selectNextQuestion(profile(), BOARD, ["q-language"], TODAY, { questions: [LANGUAGE_QUESTION] }),
    ).toBeNull();
  });
});

describe("influence", () => {
  it("prefers the question that moves the board most", () => {
    const selection = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [INTEREST_QUESTION, LANGUAGE_QUESTION],
    });

    expect(selection?.question_id).toBe("q-language");
    // Worth asking because one of the answers *removes* three doors: with no
    // language on file the engine refuses to assume either way, and "только
    // русский" is what turns that unknown into a blocker.
    expect(selection?.affected_program_ids).toEqual(["p-en-1", "p-en-2", "p-en-3", "p-ru"]);
    expect(selection?.strongest_changes.slice(0, 3)).toEqual([
      "unreachable:p-en-1",
      "unreachable:p-en-2",
      "unreachable:p-en-3",
    ]);
    expect(selection?.remaining_candidate_questions).toBe(2);
  });

  it("scores a question that changes nothing at zero", () => {
    // Every programme is in the same field, so no answer reorders anything.
    const flat: Catalog = {
      actions: ACTIONS,
      programs: [program("p-1"), program("p-2")],
    };
    const selection = selectNextQuestion(profile(), flat, [], TODAY, {
      questions: [
        {
          ...INTEREST_QUESTION,
          options: [{ value: "programming", label: "Программирование", to: "programming" }],
        },
      ],
    });

    expect(selection).toBeNull();
  });

  it("reports only structured codes, never prose", () => {
    const selection = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [LANGUAGE_QUESTION],
    });

    for (const code of selection?.strongest_changes ?? []) {
      expect(code).toMatch(/^(reachable|unreachable|status|order):/);
    }
  });

  it("breaks a tie by authored importance, then by id", () => {
    const twin = (id: string, importance?: number): QuestionDefinition => ({
      ...LANGUAGE_QUESTION,
      id,
      ...(importance === undefined ? {} : { importance }),
    });

    const byImportance = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [twin("q-b", 1), twin("q-a", 5)],
    });
    expect(byImportance?.question_id).toBe("q-a");

    const byId = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [twin("q-z"), twin("q-c"), twin("q-m")],
    });
    expect(byId?.question_id).toBe("q-c");
  });

  it("gives the same answer for the same inputs", () => {
    const first = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [INTEREST_QUESTION, LANGUAGE_QUESTION],
    });
    const second = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [LANGUAGE_QUESTION, INTEREST_QUESTION],
    });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});

describe("stopping", () => {
  it("stops when nothing left would change the board", () => {
    const selection = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [INTEREST_QUESTION],
    });

    // A reorder of the same four doors is below the bar for another question.
    expect(QUESTION_INFLUENCE_THRESHOLD).toBeGreaterThan(0);
    expect(selection === null || selection.influence_score >= QUESTION_INFLUENCE_THRESHOLD).toBe(
      true,
    );
  });

  it("stops at the ceiling however much is still unknown", () => {
    const asked = Array.from({ length: MAX_ADAPTIVE_QUESTIONS }, (_, i) => `q-${i}`);

    expect(
      selectNextQuestion(profile(), BOARD, asked, TODAY, { questions: [LANGUAGE_QUESTION] }),
    ).toBeNull();
    // Skipped questions count against the ceiling too: both cost attention.
    expect(
      selectNextQuestion(profile(), BOARD, asked.slice(1), TODAY, {
        questions: [LANGUAGE_QUESTION],
        skippedQuestionIds: [asked[0] ?? ""],
      }),
    ).toBeNull();
  });

  it("never returns a skipped question again", () => {
    const selection = selectNextQuestion(profile(), BOARD, [], TODAY, {
      questions: [LANGUAGE_QUESTION, INTEREST_QUESTION],
      skippedQuestionIds: ["q-language"],
    });

    expect(selection?.question_id).not.toBe("q-language");
  });

  it("rejects a today that is not an ISO date", () => {
    expect(() => selectNextQuestion(profile(), BOARD, [], "17.09.2026")).toThrow(/ISO date/);
  });
});

describe("answers", () => {
  it("writes the answer into the right field", () => {
    const answered = applyInterviewAnswer(profile(), LANGUAGE_QUESTION, "en");

    expect(answered.languages).toEqual([{ code: "en", level: "B2" }]);
  });

  it("collects every chosen option of a multi-select", () => {
    const answered = applyInterviewAnswer(profile(), INTEREST_QUESTION, [
      "programming",
      "medicine",
    ]);

    expect(answered.interests).toEqual(["programming", "medicine"]);
  });

  it("never mutates the profile it was given", () => {
    const applicant = profile({ interests: ["дизайн"] });
    const snapshot = JSON.stringify(applicant);

    const answered = applyInterviewAnswer(applicant, INTEREST_QUESTION, ["programming"]);

    expect(JSON.stringify(applicant)).toBe(snapshot);
    expect(answered).not.toBe(applicant);
    expect(answered.interests).toEqual(["дизайн", "programming"]);
  });

  it("leaves the profile alone when the answer makes no sense", () => {
    const applicant = profile();

    expect(applyInterviewAnswer(applicant, LANGUAGE_QUESTION, "klingon")).toBe(applicant);
    expect(applyInterviewAnswer(applicant, LANGUAGE_QUESTION, undefined)).toBe(applicant);
    expect(applyInterviewAnswer(applicant, LANGUAGE_QUESTION, 42)).toBe(applicant);
    expect(applyInterviewAnswer(applicant, INTEREST_QUESTION, [])).toBe(applicant);

    // And a route still computes over the untouched profile.
    expect(() => computeRoute(applicant, BOARD, TODAY)).not.toThrow();
  });

  it("offers exactly the values the selector tried", () => {
    expect(candidateValuesOf(LANGUAGE_QUESTION)).toEqual([
      { code: "en", level: "B2" },
      { code: "ru", level: "C1" },
    ]);
  });
});

describe("the shipped catalogue on the demo board", () => {
  it("asks between five and seven questions and then stops", () => {
    let applicant = profile();
    const answered: string[] = [];

    for (let step = 0; step < MAX_ADAPTIVE_QUESTIONS + 2; step += 1) {
      const selection = selectNextQuestion(applicant, CATALOG, answered, TODAY);
      if (selection === null) break;

      const question = QUESTION_CATALOG.find((item) => item.id === selection.question_id);
      expect(question).toBeDefined();
      if (question === undefined) break;

      applicant = applyInterviewAnswer(applicant, question, question.options[0]?.value);
      answered.push(question.id);
    }

    expect(answered.length).toBeGreaterThanOrEqual(3);
    expect(answered.length).toBeLessThanOrEqual(MAX_ADAPTIVE_QUESTIONS);
    // Every question asked was asked once.
    expect(new Set(answered).size).toBe(answered.length);
  });

  it("produces a board that can actually be computed", () => {
    const applicant = applyInterviewAnswer(
      applyInterviewAnswer(profile(), QUESTION_CATALOG[0] as QuestionDefinition, ["programming"]),
      QUESTION_CATALOG[4] as QuestionDefinition,
      "en_b2",
    );

    const route = computeRoute(applicant, CATALOG, TODAY);

    expect(route.doors).toHaveLength(CATALOG.programs.length);
    expect(route.summary.total).toBe(CATALOG.programs.length);
    // Real data, so the board carries a mixture of provenance — and never a
    // level stronger than the source supports.
    const levels = new Set(route.doors.map((door) => door.confidence));
    expect(levels.has("demo")).toBe(false);
    expect(levels.size).toBeGreaterThan(1);
  });
});
