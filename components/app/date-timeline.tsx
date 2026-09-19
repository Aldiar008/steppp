import type { ScheduleChainEntry } from "@/lib/engine";
import { formatDateRu } from "@/lib/date";
import type { ActionStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import { effortLabel } from "@/features/route/ui";

/**
 * A single door's obligatory steps, as a real date sequence — this product's
 * equivalent of OnePrep's "Scores" bell curve. There is no distribution to
 * draw for one programme; what this page actually has is a chain of dates
 * building up to one point of no return, so that is what gets a real chart.
 *
 * `entries` must already be `schedule.chain` from `computePointOfNoReturn`
 * (earliest latest-start first) — this component only draws it, it does not
 * recompute or reorder anything.
 */
export function ActionTimeline({
  entries,
  actionsById,
  completedActionIds,
  pointOfNoReturn,
  className,
}: {
  entries: readonly ScheduleChainEntry[];
  actionsById: Readonly<Record<string, ActionStep>>;
  completedActionIds: readonly string[];
  pointOfNoReturn?: string;
  className?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Обязательных шагов в данных нет.</p>;
  }

  return (
    <ol className={cn("relative space-y-5 border-l border-border pl-5", className)}>
      {entries.map((entry) => {
        const action = actionsById[entry.action_id];
        const done = completedActionIds.includes(entry.action_id);
        return (
          <li key={entry.action_id} className="relative">
            <span
              className={cn(
                "absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-background",
                done ? "bg-open" : "bg-border",
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="min-w-0 text-sm leading-snug">
                {action?.title ?? entry.action_id}
                {done && <span className="ml-2 text-xs text-muted-foreground">сделано</span>}
              </span>
              <span className="num shrink-0 text-sm font-medium">
                {entry.latest_start_date === undefined ? "—" : formatDateRu(entry.latest_start_date)}
              </span>
            </div>
            {action !== undefined && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {effortLabel(action.effort_minutes)}
                {action.duration_days !== undefined &&
                  action.duration_days > 0 &&
                  `, занимает ${action.duration_days} дн.`}
              </p>
            )}
          </li>
        );
      })}

      {pointOfNoReturn !== undefined && (
        <li className="relative">
          <span
            className="absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-background bg-critical"
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-medium text-critical-ink">
              Итог цепочки — последний день начать
            </span>
            <span className="num shrink-0 text-sm font-semibold text-critical-ink">
              {formatDateRu(pointOfNoReturn)}
            </span>
          </div>
        </li>
      )}
    </ol>
  );
}
