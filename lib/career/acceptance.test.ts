import { describe, expect, it } from "vitest";

import {
  extractAxesRequestSchema,
  stage2QuestionRequestSchema,
  stage3bTurnRequestSchema,
} from "@/lib/ai/career-contracts";
import { buildParentComparison, type ParentCareerSignal } from "./parent-signal";
import { applyShifts, createEmptyVector, selectFieldCandidates } from "./scoring";
import type { EvidenceEntry } from "./types";

/**
 * §11.2's remaining acceptance rows not already covered by a more specific
 * test file (scoring.test.ts covers #1/#2/#7/#9, results.test.ts covers
 * #10, widen.test.ts covers #6).
 */

describe("acceptance #3 — mostly-skipped answers still finish honestly", () => {
  it("never throws and still returns a usable candidate list when 6 of 10 answers carry no signal", () => {
    // Only Q2, Q4, Q6, Q9 carry real shifts; the rest are "не знаю" (empty).
    const vector = applyShifts(createEmptyVector(), [
      { dimension: "O_MATTER", amount: 25, quote: "Разберу и посмотрю, что внутри", question_id: "q2_broken_thing" },
      { dimension: "O_DATA", amount: 25, quote: "А. Найти ошибку в таблице", question_id: "q4_less_annoying_task" },
      { dimension: "O_MATTER", amount: 30, quote: "Вещь, которую можно потрогать", question_id: "q6_end_result" },
      { dimension: "A_HORIZON", amount: 35, quote: "Б тяжелее", question_id: "q9_horizon" },
    ]);

    expect(() => selectFieldCandidates(vector, new Set())).not.toThrow();
    const result = selectFieldCandidates(vector, new Set());
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(result.confidence)).toBe(true);
  });
});

describe("acceptance #4 — parent's signal never touches the student's own vector", () => {
  it("produces the exact same field candidates whether or not a parent signal exists", () => {
    const evidence: EvidenceEntry[] = [
      { dimension: "A_PHYS", shift: 45, quote: "разбирал технику руками", question_id: "q2_broken_thing" },
    ];
    const vector = applyShifts(createEmptyVector(), [
      { dimension: "O_MATTER", amount: 40, quote: "разбирал технику руками", question_id: "q2_broken_thing" },
    ]);

    const before = selectFieldCandidates(vector, new Set());

    // A parent submits their own signal — nothing about the student's own
    // vector/evidence is read or written by this call.
    const signal: ParentCareerSignal = { parent_direction: "Хотим, чтобы стал врачом" };
    const comparison = buildParentComparison(signal, before.candidates[0]!, evidence);

    const after = selectFieldCandidates(vector, new Set());
    expect(after).toEqual(before);
    expect(comparison).not.toBeNull();
  });
});

describe("acceptance #8 — no personal identifiers reach the LLM boundary, structurally", () => {
  const forbidden = /name|school|age|city|email|phone|surname|address/i;

  it("the axis-extraction request schema has no field for name, school, age, city, email or phone", () => {
    const keys = Object.keys(extractAxesRequestSchema.shape);
    expect(keys.some((key) => forbidden.test(key))).toBe(false);
  });

  it("the stage-2 next-question request schema has no such field either", () => {
    const keys = Object.keys(stage2QuestionRequestSchema.shape);
    expect(keys.some((key) => forbidden.test(key))).toBe(false);
  });

  it("the stage-3b free-form request schema has no such field either", () => {
    const keys = Object.keys(stage3bTurnRequestSchema.shape);
    expect(keys.some((key) => forbidden.test(key))).toBe(false);
  });
});
