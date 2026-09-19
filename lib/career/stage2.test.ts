import { describe, expect, it } from "vitest";

import { specializationsOf } from "./specializations/index";
import {
  applyStage2Answer,
  checkStage2Stop,
  createTally,
  pickNextStage2Question,
  rankCandidates,
  splitCandidates,
  stage2Confident,
} from "./stage2";
import { bankOf } from "./stage2-banks/index";

describe("stage 2 — offline question selection", () => {
  it("picks a question that actually splits the full ENG candidate list", () => {
    const remaining = specializationsOf("ENG").map((s) => s.id);
    const question = pickNextStage2Question("ENG", remaining, new Set());
    expect(question).not.toBeNull();
    if (question === null) return;
    const split = splitCandidates(question, remaining);
    expect(split.inA.length).toBeGreaterThan(0);
    expect(split.inB.length).toBeGreaterThan(0);
  });

  it("never repeats an already-asked question", () => {
    const remaining = specializationsOf("IT").map((s) => s.id);
    const asked = new Set(bankOf("IT").map((q) => q.id));
    const question = pickNextStage2Question("IT", remaining, asked);
    expect(question).toBeNull();
  });

  it("prefers a question about the barrier specialization while it is still in play", () => {
    const remaining = specializationsOf("TRD").map((s) => s.id);
    const question = pickNextStage2Question("TRD", remaining, new Set());
    expect(question?.id).toBe("trd_2");
  });
});

describe("stage 2 — candidate tally and stopping", () => {
  it("separates a leader from the field after a few consistent answers", () => {
    const remaining = specializationsOf("ENG").map((s) => s.id);
    let tally = createTally(remaining);
    const q1 = bankOf("ENG").find((q) => q.id === "eng_3")!; // ENG_BIO vs rest
    tally = applyStage2Answer(tally, q1, remaining, "A");
    const q2 = bankOf("ENG").find((q) => q.id === "eng_8")!; // ENG_ENV vs rest — different axis
    tally = applyStage2Answer(tally, q2, remaining, "B"); // reject ENG_ENV branch, favors rest (including BIO)

    const ranked = rankCandidates(tally, remaining);
    expect(ranked[0]!.id).toBe("ENG_BIO");
  });

  it("stops once the candidate list is down to two", () => {
    const ranked = rankCandidates(createTally(["ENG_BIO", "ENG_ROB"]), ["ENG_BIO", "ENG_ROB"]);
    const check = checkStage2Stop(ranked, 0, 3);
    expect(check.stop).toBe(true);
    expect(check.reason).toBe("few_candidates");
  });

  it("stops at the total question limit even without a confident leader", () => {
    const remaining = specializationsOf("ENG").map((s) => s.id);
    const ranked = rankCandidates(createTally(remaining), remaining);
    const check = checkStage2Stop(ranked, 0, 12);
    expect(check.stop).toBe(true);
    expect(check.reason).toBe("question_limit");
  });

  it("is confident once the leader outruns the second by more than 1.6x", () => {
    const ranked = rankCandidates({ A: 3, B: 0, C: -2 }, ["A", "B", "C"]);
    expect(stage2Confident(ranked)).toBe(true);
  });
});
