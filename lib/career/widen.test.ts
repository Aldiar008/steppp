import { describe, expect, it } from "vitest";

import {
  createWidenState,
  recordRejection,
  shouldEscalateToStage3b,
  widenRound1,
  widenRound2,
  widenRound3,
} from "./widen";

describe("stage 3a — widening (§7)", () => {
  it("round 1 offers same-field neighbours, nearest first, excluding the rejected one", () => {
    const state = createWidenState();
    const result = widenRound1("ENG_MECH", state);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((spec) => spec.id !== "ENG_MECH")).toBe(true);
    expect(result.every((spec) => spec.field === "ENG")).toBe(true);
  });

  it("round 2's training-length branch applies the document's own substitution", () => {
    const state = createWidenState();
    const result = widenRound2("how_long", "ENG_MECH", state);
    expect(result.map((spec) => spec.id)).toContain("TRD_CNC");
  });

  it("round 3 draws from adjacent fields only", () => {
    const state = createWidenState();
    const result = widenRound3("ENG", state);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((spec) => ["TRD", "IT", "SCI"].includes(spec.field))).toBe(true);
  });

  it("acceptance #6 — escalates to stage 3b only after three rounds, never offers a fourth list", () => {
    let state = createWidenState();
    expect(shouldEscalateToStage3b(state)).toBe(false);
    state = { ...recordRejection(state, "a", 1), round: 1 };
    expect(shouldEscalateToStage3b(state)).toBe(false);
    state = { ...recordRejection(state, "b", 2), round: 2 };
    expect(shouldEscalateToStage3b(state)).toBe(false);
    state = { ...recordRejection(state, "c", 3), round: 3 };
    expect(shouldEscalateToStage3b(state)).toBe(true);
  });
});
