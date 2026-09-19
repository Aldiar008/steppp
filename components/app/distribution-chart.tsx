import { formatMonthRu, monthKey } from "@/lib/date";
import type { Door } from "@/lib/types";
import { SHORT_MONTHS_RU } from "@/features/route/ui";

export interface MonthBucket {
  key: string;
  count: number;
}

/**
 * Reachable routes, grouped by the month they stop being reachable.
 *
 * Lifted verbatim out of `features/route/dashboard.tsx`'s old inline
 * `closuresByMonth` — the bucketing is the real distinguishing data this
 * screen has instead of OnePrep's score bell-curve, so the logic is shared,
 * not re-derived, between wherever it is drawn.
 */
export function closuresByMonth(doors: readonly Door[]): MonthBucket[] {
  const counts = new Map<string, number>();

  for (const door of doors) {
    if (door.status !== "open" && door.status !== "closing_soon") continue;
    if (door.explanation_facts.blockers.length > 0) continue;
    if (door.point_of_no_return === undefined) continue;
    const key = monthKey(door.point_of_no_return);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

function shortMonth(key: string): string {
  return SHORT_MONTHS_RU[Number(key.split("-")[1]) - 1] ?? "";
}

function yearChanged(months: readonly MonthBucket[], index: number): boolean {
  if (index === 0) return true;
  return months[index]?.key.slice(0, 4) !== months[index - 1]?.key.slice(0, 4);
}

/**
 * When the doors close, as a shape — this product's actual equivalent of
 * OnePrep's score distribution. There is no bell curve to draw here (no
 * program in this catalogue has a score to distribute); a real histogram of
 * upcoming closing months is the honest chart for the data this product
 * actually has.
 */
export function MonthBarChart({
  months,
  title = "Когда закрываются",
  barHeight = 72,
}: {
  months: readonly MonthBucket[];
  title?: string;
  barHeight?: number;
}) {
  if (months.length === 0) return null;
  const peak = Math.max(...months.map((month) => month.count));

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-muted-foreground">{title}</p>
      <ol className="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {months.map((month, index) => (
          <li key={month.key} className="flex min-w-0 flex-1 shrink-0 flex-col items-center gap-1.5">
            <span className="num text-xs font-medium leading-none">{month.count}</span>
            <span
              className="spark w-full min-w-[10px]"
              style={
                {
                  height: `${Math.max(8, Math.round((month.count / peak) * barHeight))}px`,
                  "--bar": index === 0 ? "var(--risk)" : "var(--open)",
                } as React.CSSProperties
              }
              aria-hidden
            />
            <span className="w-full truncate text-center text-[11px] leading-tight text-muted-foreground">
              {shortMonth(month.key)}
            </span>
            <span className="h-3 w-full truncate text-center text-[10px] leading-tight text-muted-foreground/70">
              {yearChanged(months, index) ? month.key.slice(0, 4) : ""}
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        {months.map((month) => `${formatMonthRu(month.key)}: ${month.count}`).join(", ")}
      </p>
    </div>
  );
}
