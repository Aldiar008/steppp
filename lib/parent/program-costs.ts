/**
 * The pure half of the parent dashboard's money table.
 *
 * Kept apart from `features/parent/programs-table.tsx` (the React shell) for
 * the same reason `lib/engine` is kept apart from its screens: the summary
 * sentence — the range per currency, how many programmes are fully funded —
 * is a real computation with real edge cases (an empty list, mixed
 * currencies, no price published anywhere), and it should be testable
 * without mounting a table.
 */
import type { Currency, Door, Funding, Program, TuitionFact } from "@/lib/types";

/** One priced row, exactly what the table needs. */
export interface ProgramCostRow {
  programId: string;
  org: string;
  country: string;
  funding: readonly Funding[];
  tuition?: TuitionFact;
}

export interface CurrencyRange {
  currency: Currency;
  min: number;
  max: number;
  count: number;
}

export interface ProgramCostSummary {
  totalOpen: number;
  pricedCount: number;
  unpricedCount: number;
  fullyFundedCount: number;
  /**
   * One entry per currency actually present, most-represented first. Ranges
   * across currencies are never combined — the product doesn't convert
   * currency without a rate, and a merged "range" would quietly pretend it
   * did.
   */
  ranges: CurrencyRange[];
}

const FULLY_FUNDED: ReadonlySet<Funding> = new Set(["state_grant", "full_scholarship"]);

export function summarizeProgramCosts(rows: readonly ProgramCostRow[]): ProgramCostSummary {
  const byCurrency = new Map<Currency, number[]>();
  let pricedCount = 0;

  for (const row of rows) {
    if (row.tuition === undefined) continue;
    pricedCount += 1;
    const amounts = byCurrency.get(row.tuition.currency) ?? [];
    amounts.push(row.tuition.amount);
    byCurrency.set(row.tuition.currency, amounts);
  }

  const ranges = [...byCurrency.entries()]
    .map(([currency, amounts]) => ({
      currency,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      count: amounts.length,
    }))
    .sort((a, b) => b.count - a.count);

  const fullyFundedCount = rows.filter((row) => row.funding.some((item) => FULLY_FUNDED.has(item))).length;

  return {
    totalOpen: rows.length,
    pricedCount,
    unpricedCount: rows.length - pricedCount,
    fullyFundedCount,
    ranges,
  };
}

export function programCostRows(doors: readonly Door[], programsById: ReadonlyMap<string, Program>): ProgramCostRow[] {
  const rows: ProgramCostRow[] = [];
  for (const door of doors) {
    const program = programsById.get(door.program_id);
    if (program === undefined) continue;
    rows.push({
      programId: program.id,
      org: program.org,
      country: program.country,
      funding: program.funding,
      tuition: program.tuition_per_year,
    });
  }
  return rows;
}
