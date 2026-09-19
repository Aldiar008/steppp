import { describe, expect, it } from "vitest";

import { summarizeProgramCosts, type ProgramCostRow } from "./program-costs";

function row(overrides: Partial<ProgramCostRow>): ProgramCostRow {
  return { programId: "p", org: "Test U", country: "kz", funding: [], ...overrides };
}

describe("summarizeProgramCosts", () => {
  it("counts nothing as priced or fully funded when the list is empty", () => {
    const summary = summarizeProgramCosts([]);
    expect(summary).toEqual({ totalOpen: 0, pricedCount: 0, unpricedCount: 0, fullyFundedCount: 0, ranges: [] });
  });

  it("never merges two currencies into one range", () => {
    const rows: ProgramCostRow[] = [
      row({ tuition: { amount: 2_000_000, currency: "KZT", confidence: "verified", source_id: "s1" } }),
      row({ tuition: { amount: 20_000, currency: "USD", confidence: "verified", source_id: "s2" } }),
    ];
    const summary = summarizeProgramCosts(rows);
    expect(summary.ranges).toHaveLength(2);
    expect(summary.ranges.find((r) => r.currency === "KZT")).toEqual({
      currency: "KZT",
      min: 2_000_000,
      max: 2_000_000,
      count: 1,
    });
    expect(summary.ranges.find((r) => r.currency === "USD")).toEqual({
      currency: "USD",
      min: 20_000,
      max: 20_000,
      count: 1,
    });
  });

  it("reports the real min and max within one currency", () => {
    const rows: ProgramCostRow[] = [
      row({ tuition: { amount: 5_000, currency: "USD", confidence: "verified", source_id: "s1" } }),
      row({ tuition: { amount: 30_000, currency: "USD", confidence: "derived", source_id: "s2" } }),
      row({ tuition: { amount: 15_000, currency: "USD", confidence: "verified", source_id: "s3" } }),
    ];
    const summary = summarizeProgramCosts(rows);
    expect(summary.ranges).toEqual([{ currency: "USD", min: 5_000, max: 30_000, count: 3 }]);
  });

  it("counts a programme as fully funded on a state grant or a full scholarship, not a partial one", () => {
    const rows: ProgramCostRow[] = [
      row({ funding: ["state_grant"] }),
      row({ funding: ["full_scholarship"] }),
      row({ funding: ["partial"] }),
      row({ funding: ["none"] }),
      row({ funding: [] }),
    ];
    expect(summarizeProgramCosts(rows).fullyFundedCount).toBe(2);
  });

  it("splits priced vs unpriced without losing either from the total", () => {
    const rows: ProgramCostRow[] = [
      row({ tuition: { amount: 1, currency: "USD", confidence: "verified", source_id: "s1" } }),
      row({}),
      row({}),
    ];
    const summary = summarizeProgramCosts(rows);
    expect(summary.totalOpen).toBe(3);
    expect(summary.pricedCount).toBe(1);
    expect(summary.unpricedCount).toBe(2);
  });
});
