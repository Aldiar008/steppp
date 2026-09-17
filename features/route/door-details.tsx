"use client";

import Link from "next/link";
import { useMemo } from "react";

import { APP_CATALOG } from "@/data/catalog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { computePointOfNoReturn } from "@/lib/engine";
import { formatDateRu } from "@/lib/date";
import { countryName } from "@/data/countries";
import type { Requirement } from "@/lib/types";
import { useDoorExplanation } from "./use-ai-text";
import { useRouteView } from "./use-route";
import {
  ConfidenceBadge,
  countdownLabel,
  DOOR_STATUS_LABEL,
  effortLabel,
  EmptyState,
  fieldsLabel,
  LEVEL_RU,
  LoadingState,
  money,
  NO_PROFILE,
  NoDataNote,
  SourceLine,
} from "./ui";

const FUNDING_RU: Readonly<Record<string, string>> = {
  state_grant: "государственный грант",
  full_scholarship: "полная стипендия",
  partial: "частичное финансирование",
  none: "без финансирования",
};

/**
 * One route, and what decides whether it is still reachable.
 *
 * The page answers two different questions and keeps them apart: *what is this*
 * (programme, money, requirements) and *what closes it* (the chain, the binding
 * step, the last day to start). The second one is the reason the product
 * exists, so it is above the fold and never buried in a table.
 */
export function DoorDetailsScreen({ programId }: { programId: string }) {
  const view = useRouteView();

  const program = useMemo(
    () => APP_CATALOG.programs.find((item) => item.id === programId),
    [programId],
  );

  /**
   * The dated chain, recomputed from the same reverse planner the board used.
   * `Door` carries the step ids but not their dates, and a date shown here has
   * to be the engine's, not an approximation made on the page.
   */
  const schedule = useMemo(() => {
    if (program === undefined) return null;
    return computePointOfNoReturn(program, view.actionsById, view.today);
  }, [program, view.actionsById, view.today]);

  /**
   * Facts the explanation may use — the computed door, never the catalogue.
   * Requirement ids are resolved to their labels so the sentence can name them.
   */
  const explainRequest = useMemo(() => {
    const door = view.doors.find((item) => item.program_id === programId);
    if (program === undefined || door === undefined || view.profile === null) return null;

    const labelOf = (id: string): string =>
      program.requirements.find((requirement) => requirement.id === id)?.label ?? id;

    return {
      door: {
        program_id: door.program_id,
        program_name: program.name,
        org: program.org,
        country: program.country,
        status: door.status,
        ...(door.point_of_no_return === undefined
          ? {}
          : { point_of_no_return: door.point_of_no_return }),
        ...(door.days_remaining === undefined ? {} : { days_remaining: door.days_remaining }),
        ...(door.next_critical_action_id === undefined
          ? {}
          : {
              next_critical_action:
                view.actionsById[door.next_critical_action_id]?.title ??
                door.next_critical_action_id,
            }),
        matched_requirements: door.matched_requirements.map(labelOf),
        unmatched_requirements: door.unmatched_requirements.map(labelOf),
        reasons: door.explanation_facts.reasons,
        blockers: door.explanation_facts.blockers,
        confidence: door.confidence,
      },
      profile_summary: {
        interests: view.profile.interests,
        countries: view.profile.countries,
        languages: view.profile.languages.map((language) => language.code),
        ...(view.profile.constraints.needs_full_funding === undefined
          ? {}
          : { needs_full_funding: view.profile.constraints.needs_full_funding }),
      },
      tone: "friendly" as const,
    };
  }, [program, programId, view.doors, view.profile, view.actionsById]);

  const explanation = useDoorExplanation(explainRequest);

  if (!view.ready) return <LoadingState rows={2} />;
  if (program === undefined) {
    return (
      <EmptyState
        title="Такого пути нет в каталоге"
        description="Возможно, ссылка устарела."
        action={{ href: "/doors", label: "Ко всем путям" }}
      />
    );
  }
  if (view.profile === null) return <EmptyState {...NO_PROFILE} />;

  const door = view.doors.find((item) => item.program_id === programId);
  if (door === undefined || schedule === null) {
    return (
      <EmptyState
        title="Маршрут ещё не рассчитан"
        description="Открой список путей — он пересчитается из твоего профиля."
        action={{ href: "/doors", label: "К путям" }}
      />
    );
  }

  const requirementById = new Map<string, Requirement>(
    program.requirements.map((requirement) => [requirement.id, requirement]),
  );
  const blocking =
    door.next_critical_action_id === undefined
      ? undefined
      : view.actionsById[door.next_critical_action_id];

  return (
    <>
      <PageHeader
        title={program.org}
        lede={
          <>
            {program.city === undefined
              ? countryName(program.country)
              : `${program.city}, ${countryName(program.country)}`}
            <br />
            {LEVEL_RU[program.level]}: {fieldsLabel(program.fields)}
          </>
        }
        back={{ href: "/doors", label: "Ко всем путям" }}
      />

      {/* Дата первой, и она единственная в рамке: это единственный факт на
          странице, у которого есть срок годности. Всё остальное — запись о
          программе, и держится на линейках и заголовках. */}
      <section className="panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Точка невозврата</h2>
          <ConfidenceBadge confidence={door.confidence} />
        </div>
        <p className="display mt-1 text-3xl font-semibold sm:text-4xl">
          {door.point_of_no_return === undefined
            ? "Пока не рассчитана"
            : formatDateRu(door.point_of_no_return)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{countdownLabel(door)}</p>

        {blocking && (
          <div className="mt-3">
            <h3 className="text-xs text-muted-foreground">Почему эта дата</h3>
            <p className="mt-0.5 text-sm">
              Её определяет шаг: <span className="font-medium">{blocking.title}</span>. Всё, что
              идёт после него, уже не помещается между ним и дедлайном подачи.
            </p>
          </div>
        )}

        {door.status === "needs_data" && (
          <div className="mt-3">
            <NoDataNote>
              Пока недостаточно данных, чтобы честно рассчитать точку закрытия. Не хватает:{" "}
              {schedule.missing_data.join(", ")}. Мы не подставляем догадку вместо даты.
            </NoDataNote>
          </div>
        )}

        {door.status === "closed" && (
          <div className="mt-3 rounded-lg border border-border bg-muted p-3">
            <h3 className="text-sm font-medium">Что это не значит</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Это не значит, что в этот вуз нельзя поступить. Значит, что в этом цикле цепочку
              обязательных шагов уже физически не собрать к дедлайну. Следующий набор — отдельная
              история, и к нему можно готовиться с запасом.
            </p>
          </div>
        )}
      </section>

      {explanation !== null && (
        <section className="mt-6 border-t border-border pt-4">
          <h2 className="text-sm font-medium">Коротко</h2>
          <p className="mt-2 text-sm leading-relaxed">{explanation.value.text}</p>
          {explanation.fromModel && (
            <p className="mt-2 text-xs text-muted-foreground">
              Сформулировано из рассчитанных данных
            </p>
          )}
        </section>
      )}

      {/* Two columns from `lg` up. The left one is the route — the chain and
          why it fits; the right one is the record — requirements, money, where
          the data came from. */}
      <div className="mt-6 grid items-start gap-x-8 gap-y-6 lg:grid-cols-2">
      <div className="space-y-6">
      {/* Chain */}
      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Цепочка обязательных шагов</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {program.application_deadline === undefined
            ? "Дедлайн подачи в источнике не назван, поэтому цепочку не от чего отсчитывать."
            : `Считается назад от дедлайна подачи ${formatDateRu(program.application_deadline.date)}.`}
        </p>
        <ol className="mt-3 space-y-3">
          {schedule.chain.map((entry) => {
            const action = view.actionsById[entry.action_id];
            const done = view.completedActionIds.includes(entry.action_id);
            return (
              <li key={entry.action_id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="min-w-0">
                  <span className="block text-sm leading-snug">
                    {action?.title ?? entry.action_id}
                    {done && <span className="ml-2 text-xs text-muted-foreground">сделано</span>}
                  </span>
                  {action !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {effortLabel(action.effort_minutes)}
                      {action.duration_days !== undefined && action.duration_days > 0 &&
                        `, занимает ${action.duration_days} дн.`}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {entry.latest_start_date === undefined
                    ? "—"
                    : `начать до ${formatDateRu(entry.latest_start_date)}`}
                </span>
              </li>
            );
          })}
          {schedule.chain.length === 0 && (
            <li className="text-sm text-muted-foreground">Обязательных шагов в данных нет.</li>
          )}
        </ol>
      </section>

      {/* Fit */}
      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Почему подходит</h2>
        {door.explanation_facts.reasons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Совпадений по профилю пока нет — заполни разбор, чтобы их стало видно.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {door.explanation_facts.reasons.map((reason) => (
              <li key={reason} className="text-sm leading-snug">
                {reason}
              </li>
            ))}
          </ul>
        )}

        {door.explanation_facts.blockers.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-medium">Что мешает</h3>
            <ul className="mt-2 space-y-1">
              {door.explanation_facts.blockers.map((blocker) => (
                <li key={blocker} className="text-sm leading-snug text-muted-foreground">
                  {blocker}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      </div>

      <div className="space-y-6">
      {/* Requirements */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-medium">Уже выполнено</h2>
          <ul className="mt-2 space-y-1">
            {door.matched_requirements.length === 0 && (
              <li className="text-sm text-muted-foreground">Пока ничего</li>
            )}
            {door.matched_requirements.map((id) => (
              <li key={id} className="text-sm leading-snug">
                {requirementById.get(id)?.label ?? id}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-medium">Ещё нужно</h2>
          <ul className="mt-2 space-y-1">
            {door.unmatched_requirements.length === 0 && (
              <li className="text-sm text-muted-foreground">Ничего не осталось</li>
            )}
            {door.unmatched_requirements.map((id) => (
              <li key={id} className="text-sm leading-snug">
                {requirementById.get(id)?.label ?? id}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Money */}
      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Деньги</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Стоимость за год</dt>
            <dd className="tabular-nums">
              {program.tuition_per_year === undefined
                ? "вуз не публикует"
                : money(program.tuition_per_year.amount, program.tuition_per_year.currency)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Финансирование</dt>
            <dd>
              {program.funding.length === 0 ? (
                <span className="text-muted-foreground">вуз не публикует</span>
              ) : (
                program.funding.map((item) => FUNDING_RU[item] ?? item).join(", ")
              )}
            </dd>
          </div>
        </dl>
        {program.tuition_per_year !== undefined && (
          <div className="mt-3">
            <ConfidenceBadge confidence={program.tuition_per_year.confidence} />
          </div>
        )}
      </section>

      {/* Provenance */}
      <section className="border-t border-border pt-4">
        <h2 className="text-sm font-medium">Откуда данные</h2>
        <div className="mt-2 space-y-2">
          {program.application_deadline === undefined ? (
            <p className="text-xs text-muted-foreground">
              Дедлайн не сверен — источник не называет конкретную дату.
            </p>
          ) : (
            <SourceLine sourceId={program.application_deadline.source_id} />
          )}
          {program.official_url !== undefined && (
            <a
              href={program.official_url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-9 items-center text-xs underline underline-offset-2"
            >
              Страница приёмной комиссии
            </a>
          )}
        </div>
        {program.notes && <p className="mt-2 text-xs text-muted-foreground">{program.notes}</p>}
        <Button asChild variant="ghost" size="sm" className="mt-2 min-h-9 px-0">
          <Link href="/sources">Как мы считаем и что такое уровни доверия</Link>
        </Button>
      </section>

      </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/doors">Ко всем путям</Link>
        </Button>
        <Button
          variant={view.compareIds.includes(programId) ? "default" : "outline"}
          onClick={() => view.toggleCompare(programId)}
          aria-pressed={view.compareIds.includes(programId)}
        >
          {view.compareIds.includes(programId) ? "Выбрано для сравнения" : "Добавить к сравнению"}
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Статус пути: {DOOR_STATUS_LABEL[door.status]}. Соответствие профилю — {door.score} из 100;
        это оценка совпадения с твоими условиями, а не вероятность поступления.
      </p>
    </>
  );
}
