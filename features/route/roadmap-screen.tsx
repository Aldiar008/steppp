"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PathIcon } from "@phosphor-icons/react/dist/ssr";

import { APP_CATALOG } from "@/data/catalog";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { InviteParentDialog } from "@/features/parent/invite-parent-dialog";
import { formatDateRu, formatMonthRu, monthKey } from "@/lib/date";
import { computePointOfNoReturn, getActiveDoors } from "@/lib/engine";
import type { ActionStep, Confidence, Iso } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionStatusControl } from "./action-status";
import { useRouteView } from "./use-route";
import {
  ConfidenceBadge,
  doorsHeldLabel,
  effortLabel,
  EmptyState,
  JourneyRail,
  LoadingState,
  NO_PROFILE,
  weakestConfidence,
} from "./ui";

interface PlannedAction {
  action: ActionStep;
  /** Last day this step can still be started, across every route that needs it. */
  latest_start: Iso;
  /** Programme ids this step holds open. */
  doors: string[];
  depends_on: string[];
  /** The least-certain confidence among the doors this step holds open. */
  confidence?: Confidence;
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
    const activeDoorsById = new Map(active.map((door) => [door.program_id, door]));
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

    // Confidence is set once the full set of doors behind each step is known:
    // the weakest fact among them, the same way a single door's own
    // confidence is the weakest fact it rests on (`lib/engine/match.ts`).
    for (const item of planned.values()) {
      const confidences = item.doors
        .map((id) => activeDoorsById.get(id)?.confidence)
        .filter((value): value is Confidence => value !== undefined);
      item.confidence = weakestConfidence(confidences);
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
        icon={PathIcon}
        lede="Каждый шаг стоит в том месяце, когда его ещё можно начать, — это считает движок, а не редактор."
        actions={
          <>
            <InviteParentDialog />
            <Button asChild variant="outline" size="sm" className="min-h-9">
              <Link href="/next-action">Ближайший шаг</Link>
            </Button>
          </>
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
              <ul className="ml-[3px] space-y-3 border-l border-border pl-4">
                {items.map((item) => {
                  const complete = view.completedActionIds.includes(item.action.id);
                  const state = view.actionStates[item.action.id];
                  // Overdue by the engine's own deadline cannot happen here — a
                  // step on a route still shown is, by construction, one whose
                  // latest start has not passed (see lib/engine/schedule.ts).
                  // What can genuinely lapse is the applicant's own plan: a
                  // date they picked for themselves, now behind "today", for a
                  // step they never started.
                  const overdue =
                    !complete &&
                    state?.status === "planned" &&
                    state.planned_date !== undefined &&
                    state.planned_date < view.today;
                  return (
                    <li key={item.action.id} className="relative">
                      {/* The node on the spine. Filled once the step is done,
                          amber while the applicant's own plan for it has lapsed. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[21px] top-6 size-2 rounded-full border-2 bg-background",
                          complete
                            ? "border-open bg-open"
                            : overdue
                              ? "border-critical bg-critical"
                              : "border-border-strong bg-background",
                        )}
                      />
                      {/* A row inside a real card: what and when on the left,
                          what you mean to do about it on the right. */}
                      <div className={cn("card-surface p-4", complete && "opacity-70")}>
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
                            {item.confidence !== undefined && (
                              <ConfidenceBadge confidence={item.confidence} className="mt-2" />
                            )}
                            {overdue && (
                              <p className="mt-2 text-xs font-medium text-critical-ink" role="status">
                                Просрочено: ты планировал(а) начать{" "}
                                {state?.planned_date !== undefined ? formatDateRu(state.planned_date) : ""}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:shrink-0 lg:items-end lg:gap-2">
                            <StatTile
                              label="Начать до"
                              value={formatDateRu(item.latest_start)}
                              tone={overdue ? "critical" : complete ? "open" : "neutral"}
                              size="sm"
                              align="right"
                            />
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
