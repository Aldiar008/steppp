import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import type { StatTone } from "./stat-tile";
import { StatTile } from "./stat-tile";

/**
 * One catalogue entry, OnePrep-style: a logo-or-initials square, a name and a
 * secondary line, and a right-aligned pair of stats. The whole card is one
 * link (a "stretched link" over the card, per the usual accessible pattern
 * for a card with its own interactive corner button) so a tap anywhere on it
 * opens the detail page; `topRightSlot` sits above that link in its own
 * stacking context so a bookmark/compare toggle inside the card doesn't also
 * navigate.
 *
 * The avatar is each university's real favicon, fetched from its own primary
 * domain (`avatarDomain`) — not a crest nobody verified, just the mark the
 * university's own site already serves. A domain with nothing to serve, or
 * a program with no domain on record, falls back to the initials square
 * rather than a broken image or an invented one.
 */
export function EntityCard({
  href,
  avatarSeed,
  avatarDomain,
  title,
  subtitle,
  accentTone = "neutral",
  stats,
  topRightSlot,
  children,
  className,
}: {
  href: string;
  avatarSeed: string;
  avatarDomain?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accentTone?: StatTone;
  stats?: readonly { label: string; value: React.ReactNode; tone?: StatTone }[];
  topRightSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        // `min-w-0`: this card is a grid/flex item in every caller, and
        // without it a grid track refuses to shrink below its content's
        // natural width — the exact bug that overflowed the viewport on a
        // narrow phone despite every line inside already using `truncate`/
        // `line-clamp` (those only work once a width is actually imposed).
        "card-surface lane relative flex min-w-0 flex-col gap-3 p-4 sm:p-5",
        accentTone !== "neutral" && `lane-${accentTone}`,
        className,
      )}
    >
      <Link href={href} className="absolute inset-0 z-0 rounded-2xl" aria-label={typeof title === "string" ? title : undefined}>
        <span className="sr-only">Открыть</span>
      </Link>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={avatarSeed} shape="square" size={52} logoDomain={avatarDomain} />
          <div className="min-w-0 pt-0.5">
            {/* Two lines, not a one-line ellipsis: the stats column beside it
                takes real width on purpose (this product's countdown has to
                read at least as prominently as an "Acceptance Rate" would),
                which leaves too little room for a one-line name to survive
                without clipping to two or three characters. */}
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">{title}</h3>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-3">
          {/* Stacked, not side by side — the reference's own two stats stack
              in one right-aligned column (Acceptance Rate above Median SAT),
              and stacking is also what actually leaves the name room to
              breathe instead of being squeezed by two stats sitting shoulder
              to shoulder. */}
          {stats && stats.length > 0 && (
            <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
              {stats.map((stat) => (
                <StatTile key={stat.label} {...stat} align="right" size="sm" />
              ))}
            </div>
          )}
          {topRightSlot && (
            <div className="relative z-20 pointer-events-auto">{topRightSlot}</div>
          )}
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="relative z-10 flex items-start gap-5 sm:hidden">
          {stats.map((stat) => (
            <StatTile key={stat.label} {...stat} size="sm" />
          ))}
        </div>
      )}

      {children && <div className="relative z-10 pointer-events-none">{children}</div>}
    </article>
  );
}
