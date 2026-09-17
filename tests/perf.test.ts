import { describe, expect, it } from "vitest";

import { CATALOG } from "@/data/catalog";
import { DEMO_PROFILE } from "@/data/demo-profile";
import { LEVERAGE_CANDIDATES } from "@/data/leverage-candidates";
import { computeLeverage, computeRoute, selectNextQuestion } from "@/lib/engine";
import { todayIso } from "@/lib/date";

/**
 * The board is computed on the applicant's phone on every edit, so its cost is
 * a product decision rather than a detail. Seventy-five programmes is the real
 * catalogue; these bounds are generous enough not to flake on a slow machine
 * and tight enough to catch an accidental quadratic.
 */
const TODAY = todayIso();

describe("cost of a full catalogue", () => {
  it("computes the board well under a frame", () => {
    const started = performance.now();
    const route = computeRoute(DEMO_PROFILE, CATALOG, TODAY);
    const ms = performance.now() - started;

    expect(route.doors).toHaveLength(CATALOG.programs.length);
    console.log(`  computeRoute (${CATALOG.programs.length} программ): ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(250);
  });

  it("picks the next question fast enough to feel instant", () => {
    // An empty profile is the expensive case: every question is still a
    // candidate, and each candidate answer costs a full board.
    const blank = { interests: [], countries: [], languages: [], exams: [], constraints: {} };
    const started = performance.now();
    const selection = selectNextQuestion(blank, CATALOG, [], TODAY);
    const ms = performance.now() - started;

    console.log(`  selectNextQuestion: ${ms.toFixed(1)}ms (вопрос: ${selection?.question_id})`);
    expect(ms).toBeLessThan(3_000);
  });

  it("prices every leverage candidate in one go", () => {
    const started = performance.now();
    const leverage = computeLeverage(DEMO_PROFILE, CATALOG, LEVERAGE_CANDIDATES, TODAY);
    const ms = performance.now() - started;

    console.log(`  computeLeverage (${LEVERAGE_CANDIDATES.length} изменений): ${ms.toFixed(1)}ms`);
    expect(leverage).toHaveLength(LEVERAGE_CANDIDATES.length);
    expect(ms).toBeLessThan(2_000);
  });
});
