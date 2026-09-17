"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { APP_CATALOG, CATALOG, CATALOG_PROVENANCE } from "@/data/catalog";
import { LEVERAGE_CANDIDATES } from "@/data/leverage-candidates";
import { Button } from "@/components/ui/button";
import { computeLeverage, getTopLeverage } from "@/lib/engine";
import type { ActionStep, Door, Program } from "@/lib/types";
import { RouteDashboard } from "./dashboard";
import { DiffOverlay } from "./diff-overlay";
import { DoorCard } from "./door-card";
import { QuickEdit } from "./quick-edit";
import { useRouteView } from "./use-route";
import {
  doorsHeldLabel,
  EmptyState,
  JourneyRail,
  LoadingState,
  NO_PROFILE,
  NoDataNote,
  OfflineBanner,
  effortLabel,
  plural,
} from "./ui";

/**
 * The board: every route, ordered by how soon it stops being reachable.
 *
 * Not by prestige, not by score. A modest programme shutting in nine days sits
 * above a famous one shutting in seven months, because only the first one can
 * be lost this week — and the applicant is the one who decides which matters.
 *
 * Every number on this screen comes from the engine. There is no count, date or
 * label written into the markup.
 */
/** How many routes fit on a screen before it stops being readable. */
const VISIBLE_DOORS = 6;

export function DoorsScreen() {
  const view = useRouteView();
  const [expanded, setExpanded] = useState(false);

  const programsById = useMemo(() => {
    const index = new Map<string, Program>();
    for (const program of APP_CATALOG.programs) index.set(program.id, program);
    return index;
  }, []);

  /**
   * What one change would buy, computed from the same catalogue. Only changes
   * that add routes without costing others are offered.
   */
  const leverage = useMemo(() => {
    if (view.profile === null) return [];
    return getTopLeverage(
      computeLeverage(view.profile, CATALOG, LEVERAGE_CANDIDATES, view.today),
    );
  }, [view.profile, view.today]);

  if (!view.ready) return <LoadingState />;
  if (view.profile === null || view.route === null) {
    return (
      <>
        <JourneyRail />
        <EmptyState {...NO_PROFILE} />
      </>
    );
  }

  const summary = view.route.summary;

  /*
   * Seventy-five universities is a catalogue, not a screen. The board is sorted
   * by urgency, so the first few are the ones that can be lost this month —
   * those are shown, and everything else is grouped by *why* it is not in that
   * list. A wall of cards and a list of what matters are different products.
   */
  const reachable = view.doors.filter(
    (door) =>
      (door.status === "open" || door.status === "closing_soon") &&
      door.explanation_facts.blockers.length === 0,
  );
  const blocked = view.doors.filter(
    (door) =>
      (door.status === "open" || door.status === "closing_soon") &&
      door.explanation_facts.blockers.length > 0,
  );
  const undated = view.doors.filter((door) => door.status === "needs_data");
  const closed = view.doors.filter((door) => door.status === "closed");
  const shown = expanded ? reachable : reachable.slice(0, VISIBLE_DOORS);

  return (
    <>
      <JourneyRail />
      <OfflineBanner />

      <RouteDashboard view={view} />

      {/* Two columns from `xl` up: the board is the page, and the things that
          act on it sit beside it instead of pushing it below the fold. */}
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-9">
          {/* Строки идут вплотную, разделённые линейкой: это одна таблица
              сроков, а не шесть отдельных объектов, лежащих рядом. Заголовок
              колонки называет дату один раз вместо шестидесяти одного. */}
          <BoardHeader />
          <div>
            {shown.map((door) => {
              const program = programsById.get(door.program_id);
              if (program === undefined) return null;
              return (
                <DoorCard
                  key={door.program_id}
                  door={door}
                  program={program}
                  actionsById={view.actionsById}
                  selected={view.compareIds.includes(door.program_id)}
                  onCompare={view.toggleCompare}
                />
              );
            })}
          </div>

          {reachable.length > VISIBLE_DOORS && (
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded
                ? "Свернуть"
                : `Показать ещё ${reachable.length - VISIBLE_DOORS} ${plural(
                    reachable.length - VISIBLE_DOORS,
                    "путь",
                    "пути",
                    "путей",
                  )}`}
            </Button>
          )}
        </div>

        <aside className="min-w-0 space-y-4 xl:col-span-3">
          <div className="xl:sticky xl:top-6 xl:space-y-4">
            {summary.needs_data > 0 && (
              <NoDataNote>
                По {summary.needs_data}{" "}
                {plural(summary.needs_data, "пути", "путям", "путям")} пока недостаточно данных,
                чтобы честно рассчитать точку закрытия. Мы не подставляем догадку вместо даты.
              </NoDataNote>
            )}

            {/* Правая колонка — инструменты, а не содержание. Заголовок и
                линейка отделяют их друг от друга; рамка вокруг каждого
                уравняла бы их с доской слева, ради которой открыт экран. */}
            {leverage.length > 0 && (
              <section className="border-t border-border pt-4">
                <h2 className="text-sm font-medium">Что откроет больше путей</h2>
                <ul className="mt-3 space-y-2.5">
                  {leverage.map((item) => (
                    <li key={item.id}>
                      <span className="block text-sm leading-snug">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        +{item.doors_gained} {plural(item.doors_gained, "путь", "пути", "путей")},{" "}
                        {effortLabel(item.effort_minutes)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Посчитано перебором: профиль с этим изменением прогоняется через тот же движок.
                </p>
              </section>
            )}

            <QuickEdit profile={view.profile} onAnswer={view.editAnswer} />
          </div>
        </aside>
      </div>

      {/* Everything not in the list above, grouped by the reason it is not. */}
      <div className="mt-8 border-t border-border">
      <Group
        title={`Не проходишь по условиям: ${blocked.length}`}
        hint="Эти пути открыты по срокам, но требуют того, чего в профиле нет. Посмотри, чего именно."
        doors={blocked}
        programsById={programsById}
        actionsById={view.actionsById}
      />
      <Group
        title={`Нельзя рассчитать: ${undated.length}`}
        hint="Вуз не публикует конкретную дату подачи. Мы не подставляем догадку — внутри есть его формулировка и ссылка."
        doors={undated}
        programsById={programsById}
        actionsById={view.actionsById}
      />
      <Group
        title={`Уже закрыто: ${closed.length}`}
        hint="Это не значит, что туда нельзя поступить. Значит, что по срокам этого цикла путь уже не собрать."
        doors={closed}
        programsById={programsById}
        actionsById={view.actionsById}
      />
      </div>

      {view.compareIds.length > 0 && (
        <div
          className="sticky bottom-20 z-20 mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/95 p-3 backdrop-blur md:bottom-4"
          role="status"
        >
          <span className="text-sm">
            Выбрано {view.compareIds.length} из 2
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="min-h-9" onClick={view.clearCompare}>
              Сбросить
            </Button>
            <Button asChild size="sm" className="min-h-9" disabled={view.compareIds.length < 2}>
              <Link href="/compare">Сравнить</Link>
            </Button>
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        {CATALOG_PROVENANCE.total} вузов из официальных источников. У{" "}
        {CATALOG_PROVENANCE.verified} дата подтверждена полностью, у остальных год выведен по
        циклу поступления или не публикуется — каждая карточка говорит это о себе.{" "}
        <Link href="/sources" className="underline underline-offset-2">
          Источники и методика
        </Link>
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        {doorsHeldLabel(view.nextAction?.affected_doors_count ?? 0)} — ближайший шаг на{" "}
        <Link href="/next-action" className="underline underline-offset-2">
          отдельном экране
        </Link>
        .
      </p>

      {view.pendingChange && (
        <DiffOverlay
          edit={view.pendingChange.edit}
          diff={view.pendingChange.diff}
          onClose={view.acknowledgeChange}
        />
      )}
    </>
  );
}

/**
 * Шапка колонок доски.
 *
 * Дата на широком экране названа один раз, а не в каждой из шестидесяти одной
 * строки: именно этим таблица отличается от стопки карточек. На узком экране
 * колонок нет, поэтому шапки нет тоже — там подпись стоит внутри строки.
 */
function BoardHeader() {
  return (
    <div className="hidden border-b border-border pb-2 pl-4 text-xs text-muted-foreground sm:grid sm:grid-cols-[11.5rem_minmax(0,1fr)_auto]">
      <span>Точка невозврата</span>
      <span>Куда</span>
      <span className="sm:w-32" />
    </div>
  );
}

/**
 * A fold for routes that are not the answer right now.
 *
 * Closed on arrival and counted in its own heading, so the applicant can see
 * that forty-one routes exist without being made to scroll past them. A native
 * disclosure keeps it keyboard-reachable for free.
 */
function Group({
  title,
  hint,
  doors,
  programsById,
  actionsById,
}: {
  title: string;
  hint: string;
  doors: readonly Door[];
  programsById: Map<string, Program>;
  actionsById: Readonly<Record<string, ActionStep>>;
}) {
  if (doors.length === 0) return null;

  return (
    <details className="border-b border-border">
      <summary className="cursor-pointer list-none py-3 text-sm font-medium">
        {title}
        <span className="ml-2 text-xs font-normal text-muted-foreground">развернуть</span>
      </summary>
      <div className="pb-4">
        <p className="mb-3 max-w-[62ch] text-xs leading-relaxed text-muted-foreground">{hint}</p>
        <BoardHeader />
        <div>
          {doors.map((door) => {
            const program = programsById.get(door.program_id);
            if (program === undefined) return null;
            return (
              <DoorCard
                key={door.program_id}
                door={door}
                program={program}
                actionsById={actionsById}
              />
            );
          })}
        </div>
      </div>
    </details>
  );
}
