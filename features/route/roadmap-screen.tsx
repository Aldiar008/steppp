"use client";

import Link from "next/link";
import { useMemo } from "react";


import { APP_CATALOG } from "@/data/catalog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDateRu, formatMonthRu, monthKey } from "@/lib/date";
import { computePointOfNoReturn, getActiveDoors } from "@/lib/engine";
import type { ActionStep, Iso } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionStatusControl } from "./action-status";
import { useRouteView } from "./use-route";
import {
  doorsHeldLabel,
  effortLabel,
  EmptyState,
  JourneyRail,
  LoadingState,
  NO_PROFILE,
} from "./ui";

interface PlannedAction {
  action: ActionStep;
  /** Last day this step can still be started, across every route that needs it. */
  latest_start: Iso;
  /** Programme ids this step holds open. */
  doors: string[];
  depends_on: string[];
}

/**
 * The plan, by month.
 *
 * Built entirely from the reverse planner: each step's month is the month of
 * the last day it can still be started, taken from the tightest route that
 * needs it. Nothing here is scheduled by preference, and no month is assigned
 * by hand — an invented month is an invented deadline.
 */
export function RoadmapScreen() {
  const view = useRouteView();

  const months = useMemo(() => {
    if (view.route === null) return [];

    const active = getActiveDoors(view.doors);
    const planned = new Map<string, PlannedAction>();

    for (const door of active) {
      const program = APP_CATALOG.programs.find((item) => item.id === door.program_id);
      if (program === undefined) continue;

      // The same reverse planner the board used, for the per-step dates the
      // Door itself does not carry.
      const schedule = computePointOfNoReturn(program, view.actionsById, view.today);

      for (const entry of schedule.chain) {
        const action = view.actionsById[entry.action_id];
        if (action === undefined || entry.latest_start_date === undefined) continue;

        const existing = planned.get(entry.action_id);
        if (existing === undefined) {
          planned.set(entry.action_id, {
            action,
            latest_start: entry.latest_start_date,
            doors: [door.program_id],
            depends_on: action.depends_on,
          });
          continue;
        }
        if (entry.latest_start_date < existing.latest_start) {
          existing.latest_start = entry.latest_start_date;
        }
        if (!existing.doors.includes(door.program_id)) existing.doors.push(door.program_id);
      }
    }

    const groups = new Map<string, PlannedAction[]>();
    for (const item of [...planned.values()].sort(byDateThenId)) {
      const key = monthKey(item.latest_start);
      const bucket = groups.get(key);
      if (bucket === undefined) groups.set(key, [item]);
      else bucket.push(item);
    }

    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [view.route, view.doors, view.actionsById, view.today]);

  if (!view.ready) return <LoadingState rows={2} />;
  if (view.profile === null || view.route === null) {
    return (
      <>
        <JourneyRail />
        <EmptyState {...NO_PROFILE} />
      </>
    );
  }

  const total = months.reduce((sum, [, items]) => sum + items.length, 0);
  const done = months.reduce(
    (sum, [, items]) =>
      sum + items.filter((item) => view.completedActionIds.includes(item.action.id)).length,
    0,
  );

  return (
    <>
      <JourneyRail />

      <PageHeader
        title={total === 0 ? "Шагов пока нет" : `Сделано ${done} из ${total}`}
        lede="Каждый шаг стоит в том месяце, когда его ещё можно начать, — это считает движок, а не редактор."
        actions={
          <Button asChild variant="outline" size="sm" className="min-h-9">
            <Link href="/next-action">Ближайший шаг</Link>
          </Button>
        }
      />

      {/* The one bar in the product that fills up. Everything else counts what
          is being lost; this counts what has been done. */}
      {total > 0 && (
        <div
          className="mb-6 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Выполненные шаги"
        >
          <div
            className="h-full rounded-full bg-open transition-[width] duration-500"
            style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
          />
        </div>
      )}

      {months.length === 0 ? (
        <EmptyState
          title="Обязательных шагов не нашлось"
          description="Либо все пути уже закрыты, либо по ним не хватает данных для расчёта."
          action={{ href: "/doors", label: "Посмотреть пути" }}
        />
      ) : (
        <div className="space-y-6">
          {months.map(([key, items]) => (
            <section key={key}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium capitalize">
                <span className="size-1.5 rounded-full bg-open" aria-hidden />
                {formatMonthRu(key)}
              </h2>
              <ul className="ml-[3px] space-y-2 border-l border-border pl-4">
                {items.map((item) => {
                  const complete = view.completedActionIds.includes(item.action.id);
                  return (
                    <li
                      key={item.action.id}
                      className={cn(
                        "relative border-b border-border py-3 last:border-b-0",
                        complete && "opacity-70",
                      )}
                    >
                      {/* The node on the spine. Filled once the step is done. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[21px] top-4 size-2 rounded-full border-2 bg-background",
                          complete
                            ? "border-open bg-open"
                            : "border-border-strong bg-background",
                        )}
                      />
                      {/* A row: what and when on the left, what you mean to do
                          about it on the right. The card used to be mostly
                          empty space between the two. */}
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                        <div className="min-w-0 lg:flex-1">
                          <h3
                            className={cn(
                              "text-sm font-medium leading-snug",
                              complete && "line-through",
                            )}
                          >
                            {item.action.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {effortLabel(item.action.effort_minutes)}.{" "}
                            {doorsHeldLabel(item.doors.length)}
                            {item.depends_on.length > 0 && (
                              <>. Сначала: {dependencyTitles(item, view.actionsById)}</>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:shrink-0 lg:flex-col lg:items-end lg:gap-1">
                          <span className="text-sm text-muted-foreground">
                            начать до{" "}
                            <span className="display font-medium text-foreground">
                              {formatDateRu(item.latest_start)}
                            </span>
                          </span>
                          <ActionStatusControl
                            className="mt-0"
                            state={view.actionStates[item.action.id]}
                            onSet={(status, date) =>
                              view.setActionStatus(item.action.id, status, date)
                            }
                            onClear={() => view.clearActionStatus(item.action.id)}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        «Планирую», «Делаю» и «Сделано» — твои пометки о состоянии, а не подтверждение из вуза. Сроки от них
        не сдвигаются.
      </p>
    </>
  );
}

function dependencyTitles(
  item: PlannedAction,
  actionsById: Record<string, ActionStep>,
): string {
  return item.depends_on.map((id) => actionsById[id]?.title ?? id).join(", ");
}

function byDateThenId(a: PlannedAction, b: PlannedAction): number {
  if (a.latest_start !== b.latest_start) return a.latest_start < b.latest_start ? -1 : 1;
  return a.action.id < b.action.id ? -1 : 1;
}
