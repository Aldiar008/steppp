"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { formatDateRu, formatDaysRu, formatMonthRu, monthKey } from "@/lib/date";
import { SHORT_MONTHS_RU } from "./ui";
import type { Door } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProgress } from "./use-progress";
import type { RouteView } from "./use-route";

/**
 * The board's instrument panel.
 *
 * One headline, four counts, one timeline — and not a single number written
 * into this file. Everything is read off the engine's own summary or counted
 * from the doors it produced, so the dashboard cannot drift away from the list
 * underneath it. When the two disagree, the screen is lying, and the whole
 * product is a claim about dates.
 *
 * None of these numbers is a score or a chance of admission: those do not exist
 * here. They count what is still reachable and what is already gone.
 */
export function RouteDashboard({ view }: { view: RouteView }) {
  const summary = view.route?.summary;
  const progress = useProgress(view);

  const months = useMemo(() => closuresByMonth(view.doors), [view.doors]);

  if (summary === undefined) return null;

  const active = summary.open + summary.closing_soon;

  return (
    <section className="panel panel-hero overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="display text-3xl font-semibold sm:text-[2.5rem] sm:leading-[1.1]">
            Открыто <span className="text-open">{active}</span> из {summary.total}
          </h1>
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

        {/* Кольцо, показывавшее ту же долю, что и заголовок, убрано: оно
            повторяло «61 из 75» в трёх сантиметрах от самого «61 из 75» —
            украшение, а не второй факт. И стрелки в подписи кнопки нет: кнопка
            называет действие, а не рисует его. */}
        <Button asChild size="lg" className="min-h-10">
          <Link href="/next-action">Что делать сейчас</Link>
        </Button>
      </div>

      {/* Одна полоса, разделённая волосяными линиями, вместо четырёх одинаковых
          плашек. Это четыре грани одного числа из заголовка, а не четыре
          самостоятельных объекта, и рамка вокруг каждого говорила обратное. */}
      <dl className="mt-6 grid grid-cols-2 border-t border-border sm:grid-cols-4">
        <Tile label="Открыто" value={summary.open} tone="open" />
        <Tile label="Закрывается" value={summary.closing_soon} tone="risk" />
        <Tile label="Нельзя рассчитать" value={summary.needs_data} tone="muted" />
        <Tile label="Уже закрыто" value={summary.closed} tone="closed" />
      </dl>

      {months.length > 0 && <Timeline months={months} />}

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

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

const TONE: Readonly<Record<string, string>> = {
  open: "text-open",
  risk: "text-risk",
  closed: "text-closed-ink",
  muted: "text-muted-foreground",
};

function Tile({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONE }) {
  return (
    <div className="border-b border-border py-3 pr-4 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:pl-4 sm:first:pl-0">
      <dt className="text-xs leading-tight text-muted-foreground">{label}</dt>
      <dd className={cn("display mt-1 text-2xl font-semibold leading-none", TONE[tone])}>{value}</dd>
    </div>
  );
}

/** Reachable routes, grouped by the month they stop being reachable. */
function closuresByMonth(doors: readonly Door[]): { key: string; count: number }[] {
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

/** "2026-09" → "сен". At eleven columns on a 390px screen, that is all that fits. */
function shortMonth(key: string): string {
  return SHORT_MONTHS_RU[Number(key.split("-")[1]) - 1] ?? "";
}

/**
 * When the doors close, as a shape.
 *
 * A list of seventy-five dates is unreadable; the same dates as bars answer the
 * question a person actually has — "is this spread out, or is it all one
 * month?" The tallest bar is the month that decides the year.
 */
function yearChanged(months: { key: string }[], index: number): boolean {
  if (index === 0) return true;
  return months[index]?.key.slice(0, 4) !== months[index - 1]?.key.slice(0, 4);
}

function Timeline({ months }: { months: { key: string; count: number }[] }) {
  const peak = Math.max(...months.map((month) => month.count));

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs text-muted-foreground">Когда закрываются</p>
      <ol className="flex items-end gap-1 overflow-x-auto pb-1">
        {months.map((month, index) => (
          <li key={month.key} className="flex min-w-0 flex-1 shrink-0 flex-col items-center gap-1.5">
            <span className="num text-[11px] leading-none text-muted-foreground">{month.count}</span>
            <span
              className="spark w-full"
              // The first month is the one at risk right now; the rest are lead time.
              style={
                {
                  height: `${Math.max(6, Math.round((month.count / peak) * 44))}px`,
                  "--bar": index === 0 ? "var(--risk)" : "var(--open)",
                } as React.CSSProperties
              }
              aria-hidden
            />
            <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
              {shortMonth(month.key)}
            </span>
            {/* The year appears once, where it changes — a label under every
                bar would not fit, and repeating it says nothing new. */}
            <span className="h-3 w-full truncate text-center text-[9px] leading-tight text-muted-foreground/70">
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
