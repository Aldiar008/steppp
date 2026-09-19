"use client";

import { countryName } from "@/data/countries";
import { ConfidenceBadge, FUNDING_RU, money, plural } from "@/features/route/ui";
import { programCostRows, summarizeProgramCosts } from "@/lib/parent/program-costs";
import type { Door, Program } from "@/lib/types";

/**
 * Money and programs, as an actual small dashboard — a summary sentence over
 * a compact table, not a flat list of prices. The maths behind the summary
 * sentence lives in `lib/parent/program-costs.ts` and is tested there.
 */
export function ProgramsTable({
  doors,
  programsById,
}: {
  doors: readonly Door[];
  programsById: ReadonlyMap<string, Program>;
}) {
  const rows = programCostRows(doors, programsById);
  const summary = summarizeProgramCosts(rows);

  if (rows.length === 0) {
    return (
      <section className="mt-8 border-t border-border pt-4">
        <h2 className="text-sm font-medium">Деньги и программы</h2>
        <p className="mt-2 text-sm text-muted-foreground">Открытых путей пока нет.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 border-t border-border pt-4">
      <h2 className="text-sm font-medium">Деньги и программы</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {summary.fullyFundedCount} из {summary.totalOpen}{" "}
        {plural(
          summary.totalOpen,
          "открытый путь полностью финансируется",
          "открытых пути полностью финансируются",
          "открытых путей полностью финансируются",
        )}
        .
        {summary.ranges.map((range) => (
          <span key={range.currency}>
            {" "}
            {range.count} {plural(range.count, "вуз просит", "вуза просят", "вузов просят")} от{" "}
            {money(range.min, range.currency)} до {money(range.max, range.currency)} в год.
          </span>
        ))}
        {summary.unpricedCount > 0 && (
          <span>
            {" "}
            У {summary.unpricedCount} {plural(summary.unpricedCount, "вуза", "вузов", "вузов")} стоимость не
            опубликована.
          </span>
        )}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-normal">Университет</th>
              <th className="py-2 pr-4 font-normal">Страна</th>
              <th className="py-2 pr-4 font-normal">Финансирование</th>
              <th className="py-2 font-normal">Стоимость / год</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.programId}>
                <td className="py-2 pr-4">{row.org}</td>
                <td className="py-2 pr-4 text-muted-foreground">{countryName(row.country)}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {row.funding.length === 0
                    ? "не публикует"
                    : row.funding.map((item) => FUNDING_RU[item] ?? item).join(", ")}
                </td>
                <td className="py-2">
                  {row.tuition === undefined ? (
                    <span className="text-muted-foreground">не публикует</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      {money(row.tuition.amount, row.tuition.currency)}
                      <ConfidenceBadge confidence={row.tuition.confidence} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
