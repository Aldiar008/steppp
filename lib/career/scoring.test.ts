import { describe, expect, it } from "vitest";

import { matchAversions, vetoedIdsFrom } from "./aversions";
import { applyShifts, createEmptyVector, eligibleFields, isConfident, selectFieldCandidates, type ShiftInput } from "./scoring";
import { STAGE1_QUESTIONS } from "./stage1";

/** §11.2's acceptance tests that target pure scoring — no UI, no network. */

function shiftsFromChoice(questionId: string, optionValue: string): ShiftInput[] {
  const question = STAGE1_QUESTIONS.find((q) => q.id === questionId);
  if (question === undefined || question.kind === "text" || question.kind === "text_with_chips") {
    throw new Error(`not a choice question: ${questionId}`);
  }
  const option = question.options.find((o) => o.value === optionValue);
  if (option === undefined) throw new Error(`no such option: ${optionValue}`);
  return (option.shifts ?? []).map((shift) => ({
    dimension: shift.dimension,
    amount: shift.amount,
    quote: option.label,
    question_id: questionId,
  }));
}

describe("acceptance #1 — all-neutral answers never produce a false leader", () => {
  it("keeps confidence low and surfaces more than one candidate from a zero vector", () => {
    const vector = createEmptyVector();
    const result = selectFieldCandidates(vector, new Set());
    expect(isConfident(result.confidence)).toBe(false);
    expect(result.candidates.length).toBeGreaterThan(1);
  });
});

describe("acceptance #7 — scoring is deterministic", () => {
  it("returns identical results for the identical answer set run twice", () => {
    const shifts = [
      ...shiftsFromChoice("q2_broken_thing", "disassemble"),
      ...shiftsFromChoice("q5_workday", "on_feet"),
      ...shiftsFromChoice("q6_end_result", "physical_thing"),
    ];

    const run = () => {
      const vector = applyShifts(createEmptyVector(), shifts);
      return selectFieldCandidates(vector, new Set());
    };

    const first = run();
    const second = run();
    expect(second).toEqual(first);
  });
});

describe("acceptance #2 — AVERSIONS is a hard veto, not a scoring penalty", () => {
  it("removes every blood-averse specialization from the eligible set", () => {
    const matched = matchAversions("точно не хочу видеть кровь, вообще никаких операций");
    expect(matched.length).toBeGreaterThan(0);
    const vetoed = vetoedIdsFrom(matched.map((m) => m.rule));
    expect(vetoed.has("MED_SURG")).toBe(true);
    expect(vetoed.has("MED_GP")).toBe(true);
    expect(vetoed.has("MED_EMS")).toBe(true);
    expect(vetoed.has("MED_VET")).toBe(true);
  });

  it("only removes vetoed specializations, not the whole field, when siblings survive", () => {
    const vetoed = vetoedIdsFrom(matchAversions("кровь").map((m) => m.rule));
    const fields = eligibleFields(vetoed);
    // MED_DENT, MED_NURS etc. are untouched, so MED itself stays selectable.
    expect(fields).toContain("MED");
  });

  it("removes a whole field when every one of its specializations is vetoed", () => {
    const vetoed = vetoedIdsFrom(matchAversions("не хочу сидеть весь день перед компьютером").map((m) => m.rule));
    const fields = eligibleFields(vetoed);
    expect(fields).not.toContain("IT");
  });
});

describe("acceptance #9 — hard cap on total questions", () => {
  it("stage 1 alone never exceeds the ten-question fixed set plus two optional", () => {
    expect(STAGE1_QUESTIONS.length).toBe(10);
  });
});

describe("Q7's fixed-choice veto (documented alongside AVERSIONS)", () => {
  it("vetoes high-stakes specializations when the student says they could not live with high-cost errors", () => {
    const question = STAGE1_QUESTIONS.find((q) => q.id === "q7_cost_of_error");
    if (question === undefined || question.kind !== "single_with_text") throw new Error("missing q7");
    const option = question.options.find((o) => o.value === "would_not_want_it");
    expect(option?.vetoedIds).toContain("MED_SURG");
    expect(option?.vetoedIds).toContain("TRD_PILOT");
  });
});
