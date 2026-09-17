"use client";

import Link from "next/link";
import { useState } from "react";

import { APP_CATALOG } from "@/data/catalog";
import { countryName } from "@/data/countries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDateRu } from "@/lib/date";
import { cn } from "@/lib/utils";
import { ActionStatusControl } from "./action-status";
import { useRouteView } from "./use-route";
import {
  EmptyState,
  JourneyRail,
  LoadingState,
  NEXT_ACTION_REASON,
  NO_PROFILE,
  effortLabel,
  plural,
} from "./ui";

/**
 * One action. Not a list.
 *
 * The list already exists — it is the roadmap. This screen exists because at
 * eleven at night in November nobody needs a list, they need the next move and
 * a reason to believe it is the right one. That reason is the number of routes
 * it holds open, which the engine can name programme by programme.
 *
 * There is exactly one primary button on the page.
 */
/** Enough names to believe the number, few enough to stay a list. */
const VISIBLE_DOORS = 8;

export function NextActionScreen() {
  const view = useRouteView();
  const [allDoors, setAllDoors] = useState(false);

  if (!view.ready) return <LoadingState rows={1} />;
  if (view.profile === null || view.route === null) {
    return (
      <>
        <JourneyRail />
        <EmptyState {...NO_PROFILE} />
      </>
    );
  }

  const next = view.nextAction;
  if (next === null) {
    return (
      <>
        <JourneyRail />
        <PageHeader title="Сейчас нет обязательного шага" />
        <EmptyState
          title="Обязательного следующего шага нет"
          description="Либо всё, что можно было начать, уже отмечено, либо по открытым путям не хватает данных для расчёта."
          action={{ href: "/doors", label: "Посмотреть пути" }}
        />
      </>
    );
  }

  const total = view.route.summary.open + view.route.summary.closing_soon;
  const urgent = next.days_remaining !== undefined && next.days_remaining <= 14;
  const shownDoors = allDoors ? next.affected_doors : next.affected_doors.slice(0, VISIBLE_DOORS);

  return (
    <>
      <JourneyRail />

      <PageHeader title={next.title} />

      {/* Единственная панель экрана, и в ней единственное, ради чего экран
          открыт: до какого дня этот шаг ещё имеет смысл. Четыре равных плитки
          раньше говорили, что «сколько займёт» и «когда крайний срок» — факты
          одного веса. Это не так: тридцать минут можно найти всегда, а день
          вернуть нельзя. Остальные два факта остались, но шёпотом. */}
      <section className="panel grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10">
        <div>
        <p className="text-sm text-muted-foreground">Начать не позже</p>
        <p
          className={cn(
            "display mt-1 text-3xl font-semibold leading-none sm:text-[2.5rem]",
            urgent && "text-critical-ink",
          )}
        >
          {next.due_date === undefined ? "срок не рассчитан" : formatDateRu(next.due_date)}
        </p>
        {next.days_remaining !== undefined && (
          <p className={cn("mt-2 text-base", urgent ? "font-medium text-critical-ink" : "text-muted-foreground")}>
            осталось {next.days_remaining}{" "}
            {plural(next.days_remaining, "день", "дня", "дней")}
          </p>
        )}

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Сколько займёт</dt>
            <dd className="font-medium">
              {next.effort_minutes === undefined
                ? "нет данных"
                : effortLabel(next.effort_minutes)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Удерживает путей</dt>
            <dd className="num font-medium">
              {next.affected_doors_count} из {total}
            </dd>
          </div>
        </dl>
        </div>

        {/* Дата и причина, по которой она такая, стоят рядом: срок без
            обоснования — это угроза, а не помощь. */}
        <div className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <h2 className="text-sm text-muted-foreground">Почему именно этот шаг</h2>
          <p className="mt-2 text-base leading-relaxed">{NEXT_ACTION_REASON[next.reason_code]}</p>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-x-8 gap-y-6 xl:grid-cols-12">
        <section className="border-t border-border pt-4 xl:col-span-7">
          <div>
            <h2 className="text-sm font-medium">Что с этим шагом</h2>
            <ActionStatusControl
              state={view.actionStates[next.action_id]}
              onSet={(status, date) => view.setActionStatus(next.action_id, status, date)}
              onClear={() => view.clearActionStatus(next.action_id)}
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Это твоя пометка о состоянии. Сроки самих программ от неё не меняются.
            </p>
          </div>
        </section>

        {/* The routes it holds, named but folded: twenty-seven universities are
            evidence for the number above, not the subject of the screen. */}
        <section className="border-t border-border pt-4 xl:col-span-5">
          <h2 className="text-sm font-medium">
            Удерживает {next.affected_doors_count}{" "}
            {plural(next.affected_doors_count, "путь", "пути", "путей")}
          </h2>
          <ul className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-1">
            {shownDoors.map((programId: string) => {
              const program = APP_CATALOG.programs.find((item) => item.id === programId);
              return (
                <li key={programId} className="truncate text-sm leading-snug">
                  <Link href={`/doors/${programId}`} className="underline-offset-4 hover:underline">
                    {program?.org ?? programId}
                  </Link>
                  {program && (
                    <span className="text-muted-foreground">, {countryName(program.country)}</span>
                  )}
                </li>
              );
            })}
          </ul>

          {next.affected_doors.length > VISIBLE_DOORS && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 min-h-9"
              onClick={() => setAllDoors((current) => !current)}
            >
              {allDoors
                ? "Свернуть"
                : `Показать ещё ${next.affected_doors.length - VISIBLE_DOORS}`}
            </Button>
          )}
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/roadmap">Весь план</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/doors">К путям</Link>
        </Button>
      </div>
    </>
  );
}

