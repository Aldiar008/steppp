"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { countryName } from "@/data/countries";
import { formatDateRu } from "@/lib/date";
import type { ActionStep, Door, DoorStatus, Program } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ConfidenceBadge,
  countdownLabel,
  DOOR_STATUS_CHIP,
  DOOR_STATUS_LABEL,
  fieldsLabel,
  LEVEL_RU,
} from "./ui";

/**
 * One door, one row — and the date comes first.
 *
 * The board is sorted by the day each route stops being reachable, so that day
 * is the sort key, and a sort key belongs in the leading column. When the name
 * led instead, sixty-one dates ran down the middle of the page in a ragged
 * column nobody could compare: the list was ordered by something the reader
 * could not see. Now the eye goes down one column of dates in order, and the
 * name answers the second question, not the first.
 *
 * It is a row with a rule under it, not a card. Sixty-one identical bordered
 * boxes, each with the same radius and the same shadow, say that every route
 * matters exactly as much as every other one — which is the opposite of what
 * this screen is for. The hierarchy lives in one panel at the top; everything
 * below it is a list.
 *
 * The status colour is a three-pixel edge on the left border. Down the column
 * the edges line up into one readable band of urgency, and the eye finds the
 * amber one without reading a word.
 *
 * A date never appears on its own. "24 сентября" is a threat; "её определяет
 * регистрация на SAT" is something a person can act on, and the difference
 * between those two lines is most of this product.
 */
const LANE: Readonly<Record<DoorStatus, string>> = {
  open: "lane-open",
  closing_soon: "lane-risk",
  closed: "lane-closed",
  needs_data: "lane-closed",
};

export function DoorCard({
  door,
  program,
  actionsById,
  selected = false,
  onCompare,
}: {
  door: Door;
  program: Program;
  actionsById: Readonly<Record<string, ActionStep>>;
  selected?: boolean;
  onCompare?: (programId: string) => void;
}) {
  const reasons = door.explanation_facts.reasons.slice(0, 2);
  const blockers = door.explanation_facts.blockers.slice(0, 2);
  const critical = door.days_remaining !== undefined && door.days_remaining <= 14;
  const urgent = critical && door.status !== "closed";
  const blocking =
    door.next_critical_action_id === undefined
      ? undefined
      : actionsById[door.next_critical_action_id];

  return (
    <article
      className={cn(
        "lane relative gap-x-5 border-b border-border py-4 pl-4 pr-1 transition-colors",
        // Колонка ровно такой ширины, чтобы самая длинная дата («24 сентября
        // 2026») стояла в одну строку. Перенос здесь ломает единственное, ради
        // чего колонка вынесена вперёд, — возможность прочесть её одним взглядом.
        "sm:grid sm:grid-cols-[11.5rem_minmax(0,1fr)_auto] sm:items-start",
        urgent ? "lane-critical" : LANE[door.status],
        selected && "bg-open-soft/40",
        door.status === "closed" && "opacity-70",
      )}
    >
      {/* Когда закрывается. Единственная колонка, которую читают сверху вниз.

          Подпись «Точка невозврата» обязана быть — голая дата читается как срок
          подачи, а это разные дни, и вся разница между ними и есть продукт. На
          широком экране её один раз несёт заголовок колонки над списком, на
          узком колонок нет, поэтому подпись стоит в самой строке. */}
      <div>
        <p className="text-xs text-muted-foreground sm:hidden">Точка невозврата</p>
        <p
          className={cn(
            "display text-lg font-semibold leading-tight",
            urgent && "text-critical-ink",
          )}
        >
          {door.point_of_no_return === undefined
            ? "без даты"
            : formatDateRu(door.point_of_no_return)}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm leading-tight text-muted-foreground",
            door.status === "closing_soon" && "text-risk-ink",
            urgent && "font-medium text-critical-ink",
          )}
        >
          {countdownLabel(door)}
        </p>
      </div>

      {/* Кто и что. */}
      <div className="mt-2 min-w-0 sm:mt-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-base font-medium leading-snug">
            <Link
              href={`/doors/${door.program_id}`}
              className="-my-1.5 inline-block py-1.5 underline-offset-4 hover:underline"
            >
              {program.org}
            </Link>
          </h3>
          <ConfidenceBadge confidence={door.confidence} />
        </div>

        <p className="text-sm text-muted-foreground">
          {program.city === undefined
            ? countryName(program.country)
            : `${program.city}, ${countryName(program.country)}`}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
          {LEVEL_RU[program.level]}: {fieldsLabel(program.fields)}
        </p>

        {blocking !== undefined && (
          <p className="mt-1.5 line-clamp-1 text-sm leading-snug text-muted-foreground">
            Дату определяет: <span className="text-foreground">{blocking.title}</span>
          </p>
        )}

        {/* Почему подходит — не больше двух строк; остальное на странице пути. */}
        {reasons.length > 0 && (
          <ul className="mt-2 space-y-1">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2 text-sm leading-snug">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-open" aria-hidden />
                <span className="line-clamp-1">{reason}</span>
              </li>
            ))}
          </ul>
        )}
        {blockers.length > 0 && (
          <ul className="mt-2 space-y-1">
            {blockers.map((blocker) => (
              <li key={blocker} className="flex gap-2 text-sm leading-snug text-muted-foreground">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-closed" aria-hidden />
                <span className="line-clamp-1">{blocker}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Статус и два действия. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:w-32 sm:flex-col sm:items-stretch">
        <span
          className={cn(
            "rounded-full border px-2 py-1 text-center text-[11px] leading-tight",
            DOOR_STATUS_CHIP[door.status],
          )}
        >
          {DOOR_STATUS_LABEL[door.status]}
        </span>

        <Button asChild variant="ghost" size="sm" className="min-h-9 sm:w-full">
          <Link href={`/doors/${door.program_id}`}>Подробнее</Link>
        </Button>
        {onCompare && (
          <Button
            variant={selected ? "default" : "ghost"}
            size="sm"
            className="min-h-9 sm:w-full"
            onClick={() => onCompare(door.program_id)}
            aria-pressed={selected}
          >
            {selected ? "Выбрано" : "Сравнить"}
          </Button>
        )}
      </div>
    </article>
  );
}
