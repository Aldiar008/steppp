"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { closuresByMonth, MonthBarChart } from "@/components/app/distribution-chart";
import { StatTile } from "@/components/app/stat-tile";
import { formatDateRu, formatDaysRu } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useProgress } from "./use-progress";
import type { RouteView } from "./use-route";

/**
 * The board's instrument panel: OnePrep-style summary tiles + a real
 * histogram, instead of the previous single hairline-divided bar. The
 * numbers are unchanged — `route.summary` and the same month-bucketing this
 * file used to do inline (now shared via `components/app/distribution-chart`
 * so the door-detail page and this dashboard cannot compute two different
 * groupings of the same dates).
 *
 * None of these numbers is a score or a chance of admission: those do not
 * exist here. They count what is still reachable and what is already gone.
 */
export function RouteDashboard({ view }: { view: RouteView }) {
  const summary = view.route?.summary;
  const progress = useProgress(view);

  const months = useMemo(() => closuresByMonth(view.doors), [view.doors]);

  if (summary === undefined) return null;

  const active = summary.open + summary.closing_soon;

  return (
    <section className="card-surface overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          {/* h2, not h1: `DoorsScreen` now renders its own `PageHeader` h1
              ("Пути") above this dashboard — a page gets exactly one h1. */}
          <h2 className="display text-3xl font-semibold sm:text-[2.5rem] sm:leading-[1.1]">
            Открыто <span className="text-open">{active}</span> из {summary.total}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {summary.nearest?.point_of_no_return !== undefined ? (
              <>
                Ближайший срок — {formatDateRu(summary.nearest.point_of_no_return)}
                {summary.nearest.days_remaining !== undefined && (
                  <>
                    , это через{" "}
                    <span className="font-medium text-foreground">
                      {formatDaysRu(summary.nearest.days_remaining)}
                    </span>
                  </>
                )}
                . Список идёт по срочности, а не по рейтингу.
              </>
            ) : (
              "Список идёт по срочности, а не по рейтингу."
            )}
          </p>
        </div>

        <Button asChild size="lg" className="min-h-10">
          <Link href="/next-action">Что делать сейчас</Link>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
        <StatTile label="Открыто" value={summary.open} tone="open" />
        <StatTile label="Закрывается" value={summary.closing_soon} tone="risk" />
        <StatTile label="Нельзя рассчитать" value={summary.needs_data} tone="neutral" />
        <StatTile label="Уже закрыто" value={summary.closed} tone="closed" />
      </div>

      {months.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <MonthBarChart months={months} />
        </div>
      )}

      {progress.total > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-4 text-sm">
          <CheckCircleIcon
            className={cn("size-4", progress.done > 0 ? "text-open" : "text-muted-foreground")}
            weight={progress.done > 0 ? "fill" : "regular"}
            aria-hidden
          />
          <span className="text-muted-foreground">Шагов закрыто</span>
          <span className="num font-medium">
            {progress.done} из {progress.total}
          </span>
          <Link
            href="/roadmap"
            className="ml-auto inline-flex min-h-9 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Весь план
          </Link>
        </div>
      )}
    </section>
  );
}
