"use client";

import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/ssr";

import { EntityCard } from "@/components/app/entity-card";
import type { StatTone } from "@/components/app/stat-tile";
import { countryName } from "@/data/countries";
import { DOMAIN_BY_ID } from "@/data/geo.generated";
import { formatDateRu, formatDaysRu } from "@/lib/date";
import type { ActionStep, Door, Program } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ConfidenceBadge,
  DOOR_STATUS_CHIP,
  DOOR_STATUS_LABEL,
  fieldsLabel,
  LEVEL_RU,
} from "./ui";

/**
 * One door, one card — OnePrep's browse-card shape, carrying this product's
 * own differentiator instead of an acceptance rate: the point of no return
 * and the confidence behind it are the right-column stats, not a footnote.
 *
 * `EntityCard`'s avatar is the university's own real favicon
 * (`DOMAIN_BY_ID`, the same domain the coverage map's logos use) — the
 * initials square underneath it is what shows for the handful of domains
 * that don't serve one.
 */
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
  // Read off the engine's own status rather than re-deriving "closing soon"
  // from a second copy of its threshold — a card cannot then disagree with
  // the chip six pixels below it about the same door.
  const urgent = door.status === "closing_soon";
  const accentTone: StatTone = urgent ? "critical" : door.status === "open" ? "open" : "closed";
  const blocking =
    door.next_critical_action_id === undefined
      ? undefined
      : actionsById[door.next_critical_action_id];

  return (
    <EntityCard
      href={`/doors/${door.program_id}`}
      avatarSeed={program.org}
      avatarDomain={DOMAIN_BY_ID[program.id]}
      title={program.org}
      subtitle={
        program.city === undefined
          ? countryName(program.country)
          : `${program.city}, ${countryName(program.country)}`
      }
      accentTone={accentTone}
      stats={[
        {
          label: "Точка невозврата",
          value: door.point_of_no_return === undefined ? "без даты" : formatDateRu(door.point_of_no_return),
          tone: accentTone,
        },
        { label: "Осталось", value: remainingLabel(door), tone: accentTone },
      ]}
      topRightSlot={
        onCompare && (
          <button
            type="button"
            onClick={() => onCompare(door.program_id)}
            aria-pressed={selected}
            aria-label={selected ? "Убрать из сравнения" : "Добавить к сравнению"}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            <BookmarkSimpleIcon className="size-4" weight={selected ? "fill" : "regular"} aria-hidden />
          </button>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] leading-tight",
            DOOR_STATUS_CHIP[door.status],
          )}
        >
          {DOOR_STATUS_LABEL[door.status]}
        </span>
        <ConfidenceBadge confidence={door.confidence} />
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-snug text-muted-foreground">
        {LEVEL_RU[program.level]}: {fieldsLabel(program.fields)}
      </p>

      {blocking !== undefined && (
        <p className="mt-1.5 line-clamp-1 text-sm leading-snug text-muted-foreground">
          Дату определяет: <span className="text-foreground">{blocking.title}</span>
        </p>
      )}

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
    </EntityCard>
  );
}

/** The short form of `countdownLabel` for a stat value, not a sentence. */
function remainingLabel(door: Door): string {
  if (door.status === "needs_data") return "нет данных";
  if (door.status === "closed") return "закрыт";
  if (door.days_remaining === undefined) return "—";
  if (door.days_remaining === 0) return "сегодня";
  return formatDaysRu(door.days_remaining);
}
