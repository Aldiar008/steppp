import { cn } from "@/lib/utils";

/**
 * Label above, number below — the one shape every stat in this redesign
 * shares, from the four board counts to a single door's countdown to "holds
 * N of M" on `/next-action`. A shared component instead of four hand-rolled
 * layouts is what keeps them from drifting into four different type scales.
 *
 * `tone` only ever comes from the engine's own status/confidence vocabulary
 * (open/risk/critical/closed) — never a decorative colour choice made here.
 */
export type StatTone = "open" | "risk" | "critical" | "closed" | "neutral";

const TONE_VALUE_CLASS: Readonly<Record<StatTone, string>> = {
  open: "text-open-ink",
  risk: "text-risk-ink",
  critical: "text-critical-ink",
  closed: "text-closed-ink",
  neutral: "text-foreground",
};

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  size = "md",
  align = "left",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right", className)}>
      <p className="text-xs leading-tight text-muted-foreground">{label}</p>
      <p
        className={cn(
          "display num mt-0.5 font-semibold leading-tight",
          size === "sm" && "text-base",
          size === "md" && "text-xl",
          size === "lg" && "text-3xl",
          TONE_VALUE_CLASS[tone],
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * A row of `StatTile`s as one card, divided by hairlines rather than four
 * separate bordered boxes — reused from the board's original "one bar, four
 * facets" reasoning (see `dashboard.tsx`), just given real visual separation
 * between facets instead of near-invisible ones, per the OnePrep-style
 * summary tiles this screen asked for.
 */
export function StatTileRow({
  items,
  className,
}: {
  items: readonly { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: StatTone }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-surface grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="p-4">
          <StatTile {...item} />
        </div>
      ))}
    </div>
  );
}
