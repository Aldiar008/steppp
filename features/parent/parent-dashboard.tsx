"use client";

import { useMemo } from "react";

import { APP_CATALOG, CATALOG } from "@/data/catalog";
import { countryName } from "@/data/countries";
import {
  CLOSED_DOOR_MEANING,
  ConfidenceBadge,
  countdownLabel,
  DOOR_STATUS_CHIP,
  DOOR_STATUS_LABEL,
  fieldsLabel,
  NEXT_ACTION_REASON,
  plural,
} from "@/features/route/ui";
import { reachableActionIds } from "@/features/route/use-progress";
import type { ParentCareerSignal } from "@/lib/career/parent-signal";
import { buildParentComparison } from "@/lib/career/parent-signal";
import { FIELD_LABEL, type CareerState } from "@/lib/career/types";
import { todayIso } from "@/lib/date";
import { buildActionIndex, computeNextBestAction, computeRoute, getActiveDoors } from "@/lib/engine";
import type { ActionState } from "@/lib/state/app-store";
import type { Door, Program, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ParentCareerSignalPanel } from "./parent-career-signal-panel";
import { ParentNotesPanel } from "./parent-notes-panel";
import { ProgramsTable } from "./programs-table";

/**
 * One child's plan, read-only, computed fresh.
 *
 * Fresh matters: a door's status and countdown are a function of *today*, not
 * of whenever the student's browser last ran the engine. This calls the same
 * `computeRoute`/`computeNextBestAction`/`computeProgress`-family functions
 * the student's own screens call, on the profile read from `student_state`
 * and today's date read at render time.
 */
export function ParentDashboard({
  studentId,
  studentName,
  profile,
  completedActionIds,
  actionStates,
  career,
  parentSignal,
}: {
  studentId: string;
  studentName: string;
  profile: Profile;
  completedActionIds: readonly string[];
  actionStates: Readonly<Record<string, ActionState>>;
  career: CareerState;
  parentSignal: ParentCareerSignal | null;
}) {
  const today = useMemo(() => todayIso(), []);

  const parentComparison = useMemo(() => {
    if (parentSignal === null || career.result === null) return null;
    const leadField = career.result.items[0]?.field;
    if (leadField === undefined) return null;
    return buildParentComparison(parentSignal, leadField, career.evidence);
  }, [parentSignal, career.result, career.evidence]);

  const computed = useMemo(() => {
    const actionsById = buildActionIndex(CATALOG.actions);
    const completed = new Set(completedActionIds);
    const route = computeRoute(profile, CATALOG, today, completed);
    const nextAction = computeNextBestAction(route.doors, actionsById, completed, today);
    const needed = reachableActionIds(route.doors);

    const stepCounts = { done: 0, doing: 0, planned: 0, pending: 0 };
    for (const id of needed) {
      const status = actionStates[id]?.status ?? (completed.has(id) ? "done" : undefined);
      if (status === undefined) stepCounts.pending += 1;
      else stepCounts[status] += 1;
    }

    return { route, nextAction, actionsById, needed, stepCounts, completed };
  }, [profile, completedActionIds, actionStates, today]);

  const { route, nextAction, actionsById, needed, stepCounts } = computed;
  const activeDoors = getActiveDoors(route.doors);

  const programsById = useMemo(() => {
    const map = new Map<string, Program>();
    for (const program of APP_CATALOG.programs) map.set(program.id, program);
    return map;
  }, []);

  const doorOptions = useMemo(
    () => activeDoors.map((door) => ({ id: door.program_id, label: programsById.get(door.program_id)?.org ?? door.program_id })),
    [activeDoors, programsById],
  );
  const actionOptions = useMemo(
    () => [...needed].map((id) => ({ id, label: actionsById[id]?.title ?? id })).sort((a, b) => a.label.localeCompare(b.label, "ru")),
    [needed, actionsById],
  );

  const bindingDoor =
    nextAction === null ? undefined : route.doors.find((door) => door.next_critical_action_id === nextAction.action_id);
  const affectedNames = (nextAction?.affected_doors ?? [])
    .map((id) => programsById.get(id)?.org ?? id)
    .join(", ");

  const interestsLabel = profile.interests.length > 0 ? fieldsLabel(profile.interests) : "не указаны";
  const countriesLabel =
    profile.countries.length > 0 ? profile.countries.map((code) => countryName(code)).join(", ") : "не указаны";

  return (
    <>
      <header className="mb-8">
        <h1 className="display text-balance text-2xl font-semibold sm:text-[2rem]">
          План {studentName || "ребёнка"} — как он выглядит сегодня
        </h1>
        <p className="mt-2 max-w-[62ch] text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Даты, счётчики и статусы посчитаны только что, тем же движком, что видит{" "}
          {studentName || "ребёнок"} — из его собственных данных, а не по догадке.
        </p>
      </header>

      {/* 1. Overview: broad field, narrow profession, conflict signals. */}
      <section className="panel p-5 sm:p-6">
        <h2 className="text-sm font-medium">Куда и во что метит</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Интересы" value={interestsLabel} />
          <Row label="Страны" value={countriesLabel} />
          {profile.grade !== undefined && <Row label="Класс" value={String(profile.grade)} />}
        </dl>

        <div className="mt-4 border-t border-border pt-4">
          {career.result === null ? (
            <p className="text-sm text-muted-foreground">
              Ещё не проходил(а) «Найти профессию» — узкое направление пока не выбрано.
            </p>
          ) : (
            <>
              <h3 className="text-sm font-medium">Профориентация</h3>
              <ol className="mt-3 space-y-3">
                {career.result.items.map((item, index) => (
                  <li key={item.id}>
                    <span className="text-sm font-medium">
                      {index + 1}. {item.label}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{FIELD_LABEL[item.field]}</span>
                      {index === 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">ближе всего</span>
                      )}
                    </span>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.why}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">Что тяжело: {item.hard}</p>
                  </li>
                ))}
              </ol>

              {parentComparison !== null && (
                <div className="mt-4 panel-inset p-3">
                  <h4 className="text-sm font-medium">Стоит обсудить дома</h4>
                  <p className="mt-1 text-sm leading-relaxed">{parentComparison.note}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Это описание того, куда тянут два разных ответа — не оценка того, кто прав.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <ParentCareerSignalPanel studentId={studentId} initial={parentSignal} />

      {/* 2. Progress: doors and plan steps, from the exact same counters the
          student's own /doors and /roadmap use. */}
      <section className="panel mt-6 p-5 sm:p-6">
        <h2 className="text-sm font-medium">Прогресс</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Открыто" value={route.summary.open} />
          <Stat label="Закрывается" value={route.summary.closing_soon} />
          <Stat label="Закрыто" value={route.summary.closed} />
          <Stat label="Нет данных" value={route.summary.needs_data} />
        </dl>
        <p className="mt-4 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
          Из {needed.size} обязательных шагов по открытым путям: сделано {stepCounts.done}, в работе{" "}
          {stepCounts.doing}, запланировано {stepCounts.planned}, не начато {stepCounts.pending}.
        </p>
      </section>

      {/* 3. Nearest deadline and the real consequence of missing it. */}
      {nextAction !== null && (
        <section className="panel mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Ближайший обязательный шаг</h2>
              <p className="display mt-2 text-xl font-semibold sm:text-2xl">{nextAction.title}</p>
            </div>
            {bindingDoor !== undefined && <ConfidenceBadge confidence={bindingDoor.confidence} />}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {NEXT_ACTION_REASON[nextAction.reason_code]}
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Если не сделать вовремя, статус «Закрыт» получат{" "}
            {nextAction.affected_doors_count}{" "}
            {plural(nextAction.affected_doors_count, "путь", "пути", "путей")}
            {affectedNames !== "" && <>: {affectedNames}</>}. {CLOSED_DOOR_MEANING}
          </p>
        </section>
      )}

      {/* 4. Money and programs. */}
      <ProgramsTable doors={activeDoors} programsById={programsById} />

      {/* Every open door, for the parent who wants the full list rather than
          just the summary above. */}
      <section className="mt-8 border-t border-border pt-4">
        <h2 className="text-sm font-medium">Все открытые пути ({activeDoors.length})</h2>
        {activeDoors.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Открытых путей сейчас нет.</p>
        ) : (
          <ul className="mt-1 divide-y divide-border">
            {activeDoors.map((door) => (
              <ParentDoorRow key={door.program_id} door={door} program={programsById.get(door.program_id)} />
            ))}
          </ul>
        )}
      </section>

      {/* 6. Notes — the one write path, scoped and RLS-enforced. */}
      <ParentNotesPanel studentId={studentId} doorOptions={doorOptions} actionOptions={actionOptions} />

      <footer className="mt-8 border-t border-border pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Этот кабинет только для чтения — ни один экран здесь, включая заметки выше, не может
          изменить профиль ребёнка или отметки о сделанном. Это ограничение базы данных, а не только
          этого экрана.
        </p>
      </footer>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-inset p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ParentDoorRow({ door, program }: { door: Door; program: Program | undefined }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-medium leading-snug">{program?.org ?? door.program_id}</span>
          <ConfidenceBadge confidence={door.confidence} />
        </div>
        {program !== undefined && (
          <p className="text-xs text-muted-foreground">
            {program.city === undefined ? countryName(program.country) : `${program.city}, ${countryName(program.country)}`}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] leading-tight", DOOR_STATUS_CHIP[door.status])}>
          {DOOR_STATUS_LABEL[door.status]}
        </span>
        <p className="mt-1 text-xs text-muted-foreground">{countdownLabel(door)}</p>
      </div>
    </li>
  );
}
