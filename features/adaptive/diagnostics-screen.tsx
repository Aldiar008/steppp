"use client";

import Link from "next/link";
import { useState } from "react";
import { StethoscopeIcon } from "@phosphor-icons/react/dist/ssr";

import { languageName } from "@/data/languages";
import { countryName } from "@/data/countries";
import { QUESTION_CATALOG } from "@/data/questions";
import { specialtyLabel } from "@/data/specialties";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getReachableDoors,
  isProfileFieldKnown,
  unknownProfileFields,
  type QuestionDefinition,
} from "@/lib/engine";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DiffOverlay } from "@/features/route/diff-overlay";
import { FIELD_LABEL, money, OfflineBanner } from "@/features/route/ui";
import { useRouteView } from "@/features/route/use-route";
import { useAdaptiveInterview } from "./use-adaptive-interview";

/**
 * The diagnosis: what we know about you, and what we do not.
 *
 * Three blocks the applicant can check against their own life — strengths,
 * constraints, goal — and a fourth that is unusual for a product to show at
 * all: the list of things nobody has told us. A gap named out loud is worth
 * more than a confident summary built on a guess, and every gap here is one tap
 * away from being filled.
 *
 * Nothing on this screen is inferred. Each line is a field the applicant
 * entered, or a blocker the engine computed from the catalogue.
 */

export function DiagnosticsScreen() {
  const interview = useAdaptiveInterview();
  // Edits go through the shared path, so changing a field here produces exactly
  // the same recalculation — and the same "что изменилось" — as anywhere else.
  const view = useRouteView();
  const [editing, setEditing] = useState<string | null>(null);

  if (interview.phase === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const profile = interview.profile;
  if (profile === null) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <PageHeader
          title="Разбора пока нет"
          icon={StethoscopeIcon}
          lede="Сначала пройди короткое интервью."
        />
        <Button asChild>
          <Link href="/start">Пройти интервью</Link>
        </Button>
      </div>
    );
  }

  const doors = interview.route?.doors ?? [];
  const reachable = getReachableDoors(doors);
  // The same sentence repeated for forty programmes is not eleven facts, it is
  // one fact with a count. Grouped by its opening clause, biggest group first.
  const blockers = groupBlockers(doors.flatMap((door) => door.explanation_facts.blockers));
  const unknown = unknownProfileFields(profile);

  return (
    <div className="w-full">
      <OfflineBanner />
      <PageHeader
        title="Что мы про тебя знаем"
        icon={StethoscopeIcon}
        lede="Всё это ты сказал сам. Любую строку можно поправить — маршрут пересчитается сразу."
        back={{ href: "/start", label: "К интервью" }}
      />

      {/* This is about interests and constraints, not yet about a specific
          field to study in — the natural place to point at the module that
          answers that second question. */}
      <Link
        href="/profession"
        className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-border-strong"
      >
        <span>
          <span className="block text-sm font-medium">Ещё не знаешь, какая специальность твоя?</span>
          <span className="block text-xs text-muted-foreground">
            Короткое интервью «Найти профессию» сузит направления до нескольких конкретных
          </span>
        </span>
        <span aria-hidden className="text-sm text-muted-foreground">
          →
        </span>
      </Link>

      <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Block title="Цель">
          <Fact label="Направления" value={listOrNothing(profile.interests.map(specialtyLabel))} />
          <Fact label="Страны" value={listOrNothing(profile.countries.map((code) => countryName(code)))} />
          {doors.length > 0 && (
            <li className="pt-1">
              <StatTile
                label="Вариантов открыто"
                value={`${reachable.length} из ${doors.length}`}
                tone="open"
              />
            </li>
          )}
        </Block>

        <Block title="Сильные стороны">
          <Fact
            label="Языки"
            value={listOrNothing(
              profile.languages.map((item) =>
                item.level ? `${languageName(item.code)} (${item.level})` : languageName(item.code),
              ),
            )}
          />
          <Fact
            label="Экзамены"
            value={listOrNothing(
              profile.exams.map((exam) =>
                exam.score === undefined
                  ? `${examName(exam.id)}: ${examStatusRu(exam.status)}`
                  : `${examName(exam.id)}: ${exam.score}`,
              ),
            )}
          />
          <Fact label="Класс" value={profile.grade === undefined ? null : String(profile.grade)} />
        </Block>

        <Block title="Ограничения">
          <Fact
            label="Бюджет на год"
            value={
              profile.budget_per_year === undefined
                ? null
                : money(profile.budget_per_year.amount, profile.budget_per_year.currency)
            }
          />
          <Fact
            label="Нужен полный грант"
            value={yesNo(profile.constraints.needs_full_funding)}
          />
          <Fact label="Готов уехать" value={yesNo(profile.constraints.can_relocate)} />
          {blockers.length > 0 && (
            <li className="pt-2">
              <p className="text-xs text-muted-foreground">Что сейчас закрывает варианты:</p>
              <ul className="mt-1 space-y-1">
                {blockers.map((blocker) => (
                  <li key={blocker.text} className="text-sm leading-snug">
                    — {blocker.text}
                    {blocker.count > 1 && (
                      <span className="text-muted-foreground">, {blocker.count} путей</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </Block>

        <Block title="Чего мы про тебя не знаем">
          {unknown.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Ничего — все поля, которые влияют на маршрут, заполнены.
            </li>
          ) : (
            unknown.map((field) => (
              <li key={field} className="text-sm">
                <span className="text-muted-foreground">{FIELD_LABEL[field]}</span>
                <span className="ml-2 text-muted-foreground/70">не указано</span>
              </li>
            ))
          )}
        </Block>
      </div>

      {/* Editing is the same question the interview would have asked, so an edit
          and an answer can never mean two different things. */}
      <section className="card-surface p-4">
        <h2 className="text-sm font-medium">Поправить ответ</h2>
        <div className="mt-2 divide-y divide-border">
          {QUESTION_CATALOG.map((question) => (
            <QuestionEditor
              key={question.id}
              question={question}
              profile={profile}
              open={editing === question.id}
              onToggle={() => setEditing((current) => (current === question.id ? null : question.id))}
              onAnswer={(value) => {
                view.editAnswer(question.id, value);
                setEditing(null);
              }}
            />
          ))}
        </div>
      </section>

      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Сроки — из официальных страниц вузов, каждый с пометкой о том, насколько он подтверждён.
        Профиль сохраняется в твоём аккаунте, и открыть его можно с другого устройства.
      </p>

      {view.pendingChange && (
        <DiffOverlay
          edit={view.pendingChange.edit}
          diff={view.pendingChange.diff}
          onClose={view.acknowledgeChange}
        />
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  profile,
  open,
  onToggle,
  onAnswer,
}: {
  question: QuestionDefinition;
  profile: Profile;
  open: boolean;
  onToggle: () => void;
  onAnswer: (value: unknown) => void;
}) {
  const known = isProfileFieldKnown(profile, question.field);
  return (
    // Двенадцать вопросов — это список, а не двенадцать объектов: линейка
    // отделяет их друг от друга дешевле, чем рамка вокруг каждого.
    <div className={cn("transition-colors", open && "bg-muted/50")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-snug">{question.title}</span>
          <span className={cn("text-xs", known ? "text-open-ink" : "text-muted-foreground")}>
            {known ? "ответ есть" : "пока не указано"}
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
        >
          {open ? "Свернуть" : "Изменить"}
        </span>
      </button>

      {open && (
        <div className="flex flex-wrap gap-2 px-1 pb-4">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(question.type === "multi" ? [option.value] : option.value)}
              className={cn(
                "rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors",
                "hover:border-border-strong hover:bg-accent hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-surface p-4">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm", value === null && "text-muted-foreground/70")}>
        {value ?? "не указано"}
      </span>
    </li>
  );
}

/** Exam ids as they are written on the certificate. */
const EXAM_NAMES: Readonly<Record<string, string>> = {
  ent: "ЕНТ",
  ielts: "IELTS",
  toefl: "TOEFL",
  sat: "SAT",
  duolingo: "Duolingo",
};

function examName(id: string): string {
  return EXAM_NAMES[id] ?? id.toUpperCase();
}

function listOrNothing(values: readonly string[]): string | null {
  return values.length === 0 ? null : values.join(", ");
}

function yesNo(value: boolean | undefined): string | null {
  if (value === undefined) return null;
  return value ? "да" : "нет";
}

function examStatusRu(status: string): string {
  if (status === "taken" || status === "completed") return "сдан";
  if (status === "registered") return "запись есть";
  return "в планах";
}

/**
 * Blockers as facts rather than as a list of repetitions.
 *
 * Forty closed routes produce forty "срок упущен" lines that differ only by a
 * date. Grouping by the clause before the colon turns that wall into one line
 * with a number, which is what the applicant actually needs to know.
 */
function groupBlockers(lines: readonly string[]): { text: string; count: number }[] {
  const groups = new Map<string, { text: string; count: number }>();

  for (const line of lines) {
    const head = line.split(":")[0]?.trim() ?? line;
    // Technical field paths are for the catalogue, not for a person.
    const text = /[a-z_]+\.[a-z_]+/.test(line) ? head : line;
    const existing = groups.get(head);
    if (existing === undefined) groups.set(head, { text, count: 1 });
    else existing.count += 1;
  }

  return [...groups.values()].sort((a, b) => b.count - a.count);
}
