import { describe, expect, it } from "vitest";

import { ALL_SPECIALIZATIONS } from "./specializations/index";
import { buildResults, whatIsHard } from "./results";
import type { EvidenceEntry } from "./types";

describe("acceptance #10 — no percentage sign anywhere near a result", () => {
  it("never appears in any synthesized hard-part line", () => {
    for (const spec of ALL_SPECIALIZATIONS) {
      expect(whatIsHard(spec)).not.toMatch(/%/);
    }
  });
});

describe("results assembly — §10.3/§10.4 hard rules", () => {
  const evidence: readonly EvidenceEntry[] = [
    { dimension: "A_PHYS", shift: 45, quote: "я люблю разбирать технику руками", question_id: "q2_broken_thing" },
  ];

  it("never returns a vetoed specialization even if it ranks first (acceptance #2, defense in depth)", () => {
    const results = buildResults(["MED_SURG", "MED_GP", "MED_NURS"], new Set(["MED_SURG", "MED_GP"]), evidence);
    expect(results.some((item) => item.id === "MED_SURG")).toBe(false);
    expect(results.some((item) => item.id === "MED_GP")).toBe(false);
  });

  it("omits a specialization with no groundable evidence rather than inventing a reason", () => {
    const results = buildResults(["ENG_MECH"], new Set(), []);
    expect(results).toHaveLength(0);
  });

  it("always pairs a why with a hard line, and the why quotes the student verbatim", () => {
    const results = buildResults(["ENG_MECH"], new Set(), evidence);
    expect(results).toHaveLength(1);
    expect(results[0]!.why).toContain("я люблю разбирать технику руками");
    expect(results[0]!.hard.length).toBeGreaterThan(0);
    expect(results[0]!.why).not.toMatch(/%/);
  });
});
