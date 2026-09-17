"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { findSource } from "@/data/sources";
import { specialtyLabel } from "@/data/specialties";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONFIDENCE_LABEL } from "@/lib/confidence";
import { formatDateRu, formatDaysRu } from "@/lib/date";
import type { Confidence, Door, DoorStatus, NextActionReason, Program } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The vocabulary of the application screens.
 *
 * Status wording, colour, countdown copy, confidence badges, source lines and
 * the shared empty/loading/error shells all live here, so a door cannot be
 * "Закрывается" in amber on one screen and red on another, and a demo date
 * cannot look verified anywhere.
 *
 * Tone rules, deliberately encoded rather than left to whoever writes the next
 * screen: the product never says "ты опоздал". A route closes; a person does
 * not fail. Red is a border and a small chip, never a page.
 */

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export const DOOR_STATUS_LABEL: Readonly<Record<DoorStatus, string>> = {
  open: "Открыт",
  closing_soon: "Закрывается",
  closed: "Закрыт",
  needs_data: "Нет данных",
};

export const DOOR_STATUS_CHIP: Readonly<Record<DoorStatus, string>> = {
  open: "bg-open-soft text-open-ink border-open/25",
  closing_soon: "bg-risk-soft text-risk-ink border-risk/30",
  closed: "bg-closed-soft text-closed-ink border-closed/25",
  needs_data: "bg-muted text-muted-foreground border-border",
};

export const DOOR_STATUS_BAR: Readonly<Record<DoorStatus, string>> = {
  open: "bg-open",
  closing_soon: "bg-risk",
  closed: "bg-closed",
  needs_data: "bg-border",
};

/**
 * The countdown, in words.
 *
 * The day itself still counts: somebody who acts today makes it, so zero days
 * is "последний день", not a closure. A closed route is stated as a fact about
 * the route — never as an accusation about the person.
 */
export function countdownLabel(door: Door): string {
  if (door.status === "needs_data") return "Срок пока нельзя рассчитать честно";
  if (door.status === "closed") return "Этот путь уже закрыт";
  if (door.days_remaining === undefined) return "Срок пока нельзя рассчитать честно";
  if (door.days_remaining === 0) return "Последний день сегодня";
  return `Закрывается через ${formatDaysRu(door.days_remaining)}`;
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                  */
/* -------------------------------------------------------------------------- */

const CONFIDENCE_CHIP: Readonly<Record<Confidence, string>> = {
  verified: "border-open/25 bg-open-soft text-open-ink",
  derived: "border-risk/30 bg-risk-soft text-risk-ink",
  last_cycle: "border-risk/30 bg-risk-soft text-risk-ink",
  demo: "border-border bg-muted text-muted-foreground",
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-tight",
        CONFIDENCE_CHIP[confidence],
        className,
      )}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}

/**
 * The level of study, spelled out.
 *
 * Every route in the catalogue is a bachelor's degree today, which is exactly
 * why the card says so: an applicant should not have to assume what kind of
 * place they are looking at, and the day a master's programme appears the card
 * will be right without being touched.
 */
export const LEVEL_RU: Readonly<Record<Program["level"], string>> = {
  bachelor: "Бакалавриат",
};

/** Three-letter months, for labels too narrow to hold a word. */
export const SHORT_MONTHS_RU: readonly string[] = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

/** A source, resolved from its id. Ids are never shown to an applicant. */
export function SourceLine({ sourceId }: { sourceId: string }) {
  const source = findSource(sourceId);
  if (source === undefined) {
    return (
      <p className="text-xs text-muted-foreground">
        Источник не указан — эту запись ещё никто не сверял.
      </p>
    );
  }

  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      <span className="text-foreground">{source.title}</span>
      {", "}
      {source.publisher}
      {source.accessed_at !== undefined && `. Проверено ${formatDateRu(source.accessed_at)}`}
      {source.url !== undefined && (
        <>
          {". "}
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2 hover:text-foreground"
          >
            открыть источник
          </a>
        </>
      )}
      {source.note !== undefined && <span className="block mt-0.5">{source.note}</span>}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen states                                                               */
/* -------------------------------------------------------------------------- */

/** Skeletons, never a blank screen and never a zero that looks like a result. */
export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загружаем твой маршрут</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="space-y-3 pt-2" aria-hidden>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Every empty state names the one thing that would fill it. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button asChild className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}

/**
 * Something broke. The applicant's computed data is still theirs, so the copy
 * says so; no stack trace, no provider name, nothing they cannot act on.
 */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="panel px-5 py-8 text-center" role="alert">
      <h2 className="text-base font-medium">Что-то не загрузилось</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Твои рассчитанные данные сохранены. Попробуй открыть экран ещё раз.
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Попробовать снова
        </Button>
      )}
    </div>
  );
}

/**
 * Whether the browser thinks it has a network.
 *
 * Starts optimistic so the server-rendered markup and the first client render
 * agree; the listeners correct it immediately if they disagree.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

/**
 * Offline is a degradation, not a failure.
 *
 * The board, the plan and the next step are computed on this device from data
 * that shipped with the page, so losing the network costs nothing that matters.
 * The banner says exactly that instead of implying the product is broken.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <p
      role="status"
      className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground"
    >
      Сети нет. Маршрут, план и следующий шаг считаются у тебя на устройстве — всё это работает
      дальше. Обновятся только данные каталога, когда связь вернётся.
    </p>
  );
}

/** Not an error: we genuinely do not have enough to answer honestly. */
export function NoDataNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export const NO_PROFILE = {
  title: "Сначала собери профиль",
  description: "Пара минут вопросов — и мы построим маршрут из твоих данных, а не из догадок.",
  action: { href: "/start", label: "Пройти интервью" },
} as const;

/* -------------------------------------------------------------------------- */
/* Journey                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Where the applicant is in one continuous journey.
 *
 * The landing is not a step: the journey starts when there is a profile to
 * reason about. Steps ahead are shown as available rather than locked, because
 * a teenager exploring a product should not meet a padlock.
 */
export const JOURNEY: readonly { href: string; label: string }[] = [
  { href: "/start", label: "Профиль" },
  { href: "/diagnostics", label: "Разбор" },
  { href: "/doors", label: "Пути" },
  { href: "/compare", label: "Сравнение" },
  { href: "/roadmap", label: "План" },
  { href: "/next-action", label: "Шаг" },
];

export function JourneyRail({ done = [] }: { done?: readonly string[] }) {
  const pathname = usePathname();
  const currentIndex = JOURNEY.findIndex(
    (step) => pathname === step.href || pathname.startsWith(`${step.href}/`),
  );

  return (
    <nav aria-label="Твой путь" className="mb-5 -mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1 px-1">
        {JOURNEY.map((step, index) => {
          const current = index === currentIndex;
          const complete = done.includes(step.href) || (currentIndex >= 0 && index < currentIndex);
          return (
            <li key={step.href} className="flex items-center gap-1">
              <Link
                href={step.href}
                aria-current={current ? "step" : undefined}
                className={cn(
                  // 32px minimum: a step in the journey is a tap target, and a
                  // thumb is not a mouse pointer.
                  "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs transition-colors",
                  current
                    ? "border-foreground bg-foreground text-background"
                    : complete
                      ? "border-border bg-accent text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {step.label}
              </Link>
              {index < JOURNEY.length - 1 && (
                <span aria-hidden className="h-px w-3 bg-border" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Small shared bits                                                           */
/* -------------------------------------------------------------------------- */

export function fieldsLabel(fields: readonly string[]): string {
  return fields.map(specialtyLabel).join(", ");
}

export function money(amount: number, currency: string): string {
  return `${amount.toLocaleString("ru-RU")} ${currency === "KZT" ? "₸" : currency}`;
}

export function effortLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.round(minutes / 60);
  return `${hours} ${plural(hours, "час", "часа", "часов")}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/**
 * Why the engine picked this step over the next one.
 *
 * `reason_code` is the rule that won in `compareCandidates`, so each sentence
 * below is a plain reading of a decision already made — not a rationalisation
 * written afterwards. Showing a deadline without saying why it is the one that
 * matters leaves a person with a number and nothing to do about it.
 */
export const NEXT_ACTION_REASON: Readonly<Record<NextActionReason, string>> = {
  critical_for_multiple_doors:
    "Этот шаг определяет дату закрытия сразу у нескольких путей: сдвинется он — сдвинутся они.",
  nearest_deadline: "Из всех обязательных шагов этот перестаёт быть возможным первым.",
  holds_most_doors: "Этот шаг держит больше путей, чем любой другой в плане.",
  lowest_effort: "По срокам он равен другим, но занимает меньше всего времени.",
};

export function doorsHeldLabel(count: number): string {
  return `Удерживает ${count} ${plural(count, "путь", "пути", "путей")}`;
}
