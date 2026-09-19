"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr";

import { APP_CATALOG } from "@/data/catalog";
import { UniversityCrest } from "@/components/university-crest";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDateRu } from "@/lib/date";
import { countryName } from "@/data/countries";
import type { Confidence, Door, Program } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouteView } from "./use-route";
import {
  ConfidenceBadge,
  countdownLabel,
  DOOR_STATUS_LABEL,
  EmptyState,
  JourneyRail,
  LoadingState,
  money,
  NO_PROFILE,
  effortLabel,
  fieldsLabel,
} from "./ui";

const FUNDING_RU: Readonly<Record<string, string>> = {
  state_grant: "государственный грант",
  full_scholarship: "полная стипендия",
  partial: "частичное финансирование",
  none: "без финансирования",
};

interface Side {
  door: Door;
  program: Program;
}

/**
 * Two routes, side by side, on the axes a decision actually turns on.
 *
 * Not a table of university characteristics — ranking tables are how a product
 * ends up telling a sixteen-year-old which life to pick. These rows are the
 * trade-offs: what it costs, when it shuts, what you have to do first, what you
 * give up. The takeaway at the bottom states differences and never a winner.
 *
 * Mobile keeps the same rows and the same facts, stacked per metric rather than
 * squeezed into two desktop columns.
 */
export function CompareScreen() {
  const view = useRouteView();

  const sides = useMemo<Side[]>(() => {
    const out: Side[] = [];
    for (const id of view.compareIds) {
      const door = view.doors.find((item) => item.program_id === id);
      const program = APP_CATALOG.programs.find((item) => item.id === id);
      if (door !== undefined && program !== undefined) out.push({ door, program });
    }
    return out;
  }, [view.compareIds, view.doors]);

  if (!view.ready) return <LoadingState rows={1} />;
  if (view.profile === null) {
    return (
      <>
        <JourneyRail />
        <EmptyState {...NO_PROFILE} />
      </>
    );
  }

  if (sides.length < 2) {
    return (
      <>
        <JourneyRail />
        <PageHeader title="Пока нечего сравнивать" icon={ArrowsLeftRightIcon} />
        <EmptyState
          title={
            sides.length === 0 ? "Ничего не выбрано" : "Выбери ещё один путь для сравнения"
          }
          description="Сравнение показывает два пути по срокам, деньгам и обязательным шагам."
          action={{ href: "/doors", label: "К списку путей" }}
        />
      </>
    );
  }

  const [a, b] = sides as [Side, Side];

  const rows: { label: string; a: string; b: string; date?: boolean; badgeA?: Confidence; badgeB?: Confidence }[] = [
    {
      label: "Стоимость за год",
      a: priceLabel(a),
      b: priceLabel(b),
      badgeA: a.program.tuition_per_year?.confidence,
      badgeB: b.program.tuition_per_year?.confidence,
    },
    {
      label: "Финансирование",
      a: a.program.funding.map((item) => FUNDING_RU[item] ?? item).join(", "),
      b: b.program.funding.map((item) => FUNDING_RU[item] ?? item).join(", "),
    },
    {
      label: "Срок подачи",
      a: deadlineLabel(a),
      b: deadlineLabel(b),
      date: true,
    },
    {
      label: "Точка невозврата",
      a: a.door.point_of_no_return ? formatDateRu(a.door.point_of_no_return) : "не рассчитана",
      b: b.door.point_of_no_return ? formatDateRu(b.door.point_of_no_return) : "не рассчитана",
      date: true,
      badgeA: a.door.point_of_no_return !== undefined ? a.door.confidence : undefined,
      badgeB: b.door.point_of_no_return !== undefined ? b.door.confidence : undefined,
    },
    {
      label: "Сколько осталось",
      a: countdownLabel(a.door),
      b: countdownLabel(b.door),
    },
    {
      label: "Что сделать первым",
      a: bindingLabel(a, view.actionsById),
      b: bindingLabel(b, view.actionsById),
    },
    {
      label: "Необратимость",
      a: irreversibility(a.door),
      b: irreversibility(b.door),
    },
    {
      label: "Экзамены и язык",
      a: examsLabel(a.program),
      b: examsLabel(b.program),
    },
    {
      label: "Ещё не выполнено",
      a: `${a.door.unmatched_requirements.length} из ${a.program.requirements.length}`,
      b: `${b.door.unmatched_requirements.length} из ${b.program.requirements.length}`,
    },
    {
      label: "Направления",
      a: fieldsLabel(a.program.fields),
      b: fieldsLabel(b.program.fields),
    },
    {
      label: "Чего не будет в этом варианте",
      a: missingAgainst(a.program, b.program),
      b: missingAgainst(b.program, a.program),
    },
  ];

  return (
    <>
      <JourneyRail />

      <PageHeader
        title="Два пути рядом"
        icon={ArrowsLeftRightIcon}
        lede="Мы не выбираем за тебя и не считаем «лучший вуз». Ниже — различия, на которые опирается решение."
        back={{ href: "/doors", label: "К списку путей" }}
      />

      {/* A real comparison table on a wide screen: the metric names run down
          one column and the two programmes sit in equal columns beside them, so
          the eye compares values rather than hunting for which side is which.
          On a phone the same rows stack per metric.

          Таблица держится на линейках, а не на рамке: вертикальная линия между
          колонками разделяет два варианта и потому несёт смысл, а внешняя рамка
          вокруг всего не несёт никакого. Даты набраны дисплейной гарнитурой —
          как на всех остальных экранах, чтобы дата всегда выглядела датой.*/}
      <div className="card-surface overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-[minmax(10rem,1fr)_1.2fr_1.2fr]">
          <div className="hidden bg-card px-4 py-3 md:block" />
          {[a, b].map((side) => (
            <div key={side.program.id} className="flex items-start gap-2.5 bg-card px-4 py-3">
              <span className="size-8 shrink-0 overflow-hidden rounded-lg border border-border">
                <UniversityCrest seed={side.program.org} programId={side.program.id} compact />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-medium leading-snug">
                  <Link
                    href={`/doors/${side.program.id}`}
                    className="-my-2 inline-block py-2 underline-offset-4 hover:underline"
                  >
                    {side.program.org}
                  </Link>
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {side.program.city === undefined
                    ? countryName(side.program.country)
                    : `${side.program.city}, ${countryName(side.program.country)}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {DOOR_STATUS_LABEL[side.door.status]}
                </p>
              </div>
            </div>
          ))}

          {rows.map((row) => (
            <Fragment key={row.label}>
              <div className="col-span-2 bg-card px-4 pt-3 text-xs text-muted-foreground md:col-span-1 md:py-3">
                {row.label}
              </div>
              <div
                className={cn(
                  "bg-card px-4 pb-3 leading-snug md:py-3",
                  row.date === true ? "display text-base font-medium" : "text-sm",
                )}
              >
                {row.a === "" ? (
                  <span className="text-muted-foreground">не указано</span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {row.a}
                    {row.badgeA !== undefined && <ConfidenceBadge confidence={row.badgeA} />}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "bg-card px-4 pb-3 leading-snug md:py-3",
                  row.date === true ? "display text-base font-medium" : "text-sm",
                )}
              >
                {row.b === "" ? (
                  <span className="text-muted-foreground">не указано</span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {row.b}
                    {row.badgeB !== undefined && <ConfidenceBadge confidence={row.badgeB} />}
                  </span>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Стоимость — за год: длительность программ у нас не хранится, поэтому общую стоимость за
        всё обучение мы не считаем — это была бы оценка, а не факт.
      </p>

      {/* Единственная панель экрана — вывод, а не данные. Таблица показывает
          различия; здесь написано, какие из них решают. */}
      <section className="card-surface mt-6 p-5">
        <h2 className="text-sm font-medium">Коротко</h2>
        <ul className="mt-2 space-y-1">
          {takeaways(a, b).map((line) => (
            <li key={line} className="text-sm leading-snug">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" onClick={view.clearCompare}>
          Сбросить выбор
        </Button>
        <Button asChild>
          <Link href="/roadmap">Что делать дальше</Link>
        </Button>
      </div>
    </>
  );
}

/** The published submission deadline, or the fact that there is none. */
function deadlineLabel(side: Side): string {
  const deadline = side.program.application_deadline;
  return deadline === undefined ? "вуз не называет дату" : formatDateRu(deadline.date);
}

/** A price the university publishes, or the fact that it does not. */
function priceLabel(side: Side): string {
  const tuition = side.program.tuition_per_year;
  return tuition === undefined ? "вуз не публикует" : money(tuition.amount, tuition.currency);
}

function bindingLabel(side: Side, actionsById: Record<string, { title: string }>): string {
  const id = side.door.next_critical_action_id;
  if (id === undefined) return "нет рассчитанного шага";
  return actionsById[id]?.title ?? id;
}

/**
 * How little room is left before the first obligatory step has to start.
 *
 * Irreversibility here is not a judgement, it is the countdown the engine
 * already computed: fewer days means fewer possible orders of doing things.
 */
function irreversibility(door: Door): string {
  if (door.days_remaining === undefined) return "пока не рассчитана";
  if (door.days_remaining < 0) return "решение уже принято сроком";
  return `${door.days_remaining} дн. на манёвр`;
}

function examsLabel(program: Program): string {
  const exams = program.requirements.filter(
    (requirement) => requirement.kind === "exam" || requirement.kind === "language",
  );
  return exams.length === 0 ? "не требуются" : exams.map((item) => item.label).join(", ");
}

/** What the other side offers and this one does not. Facts, not preference. */
function missingAgainst(program: Program, other: Program): string {
  const funding = other.funding.filter((item) => !program.funding.includes(item));
  const fields = other.fields.filter((item) => !program.fields.includes(item));
  const parts: string[] = [];
  if (funding.length > 0) {
    parts.push(funding.map((item) => FUNDING_RU[item] ?? item).join(", "));
  }
  if (fields.length > 0) parts.push(fieldsLabel(fields));
  return parts.length === 0 ? "ничего из того, что есть у второго" : parts.join("; ");
}

/**
 * The differences, stated. Never "лучше" — the comparison ends with facts and
 * leaves the choice where it belongs.
 */
function takeaways(a: Side, b: Side): string[] {
  const lines: string[] = [];

  const aDate = a.door.point_of_no_return;
  const bDate = b.door.point_of_no_return;
  if (aDate !== undefined && bDate !== undefined && aDate !== bDate) {
    const earlier = aDate < bDate ? a : b;
    const later = aDate < bDate ? b : a;
    lines.push(
      `${earlier.program.org} требует решения раньше: ${formatDateRu(earlier.door.point_of_no_return ?? "")} против ${formatDateRu(later.door.point_of_no_return ?? "")}.`,
    );
  }

  const aCost = a.program.tuition_per_year;
  const bCost = b.program.tuition_per_year;
  if (aCost === undefined || bCost === undefined) {
    lines.push("Стоимость сравнить нельзя: хотя бы один вуз её не публикует.");
  } else if (aCost.currency === bCost.currency && aCost.amount !== bCost.amount) {
    const cheaper = aCost.amount < bCost.amount ? a : b;
    lines.push(
      `Дешевле за год: ${cheaper.program.org} — ${priceLabel(cheaper)}.`,
    );
  } else if (aCost.currency !== bCost.currency) {
    lines.push(
      "Стоимость указана в разных валютах — мы не переводим её по выдуманному курсу, сравни сам.",
    );
  }

  const aLeft = a.door.unmatched_requirements.length;
  const bLeft = b.door.unmatched_requirements.length;
  if (aLeft !== bLeft) {
    const fewer = aLeft < bLeft ? a : b;
    lines.push(
      `Меньше невыполненных требований у ${fewer.program.org}: ${Math.min(aLeft, bLeft)} против ${Math.max(aLeft, bLeft)}.`,
    );
  }

  const aEffort = effortOf(a);
  const bEffort = effortOf(b);
  if (aEffort !== null && bEffort !== null && aEffort !== bEffort) {
    lines.push(
      `Ближайший шаг короче у ${aEffort < bEffort ? a.program.org : b.program.org}: ${effortLabel(Math.min(aEffort, bEffort))}.`,
    );
  }

  if (lines.length === 0) lines.push("По рассчитанным осям различий нет.");
  return lines;
}

function effortOf(side: Side): number | null {
  const id = side.door.next_critical_action_id;
  if (id === undefined) return null;
  const action = APP_CATALOG.actions.find((item) => item.id === id);
  return action?.effort_minutes ?? null;
}
