import { cn } from "@/lib/utils";

/**
 * The two space marks the application is allowed to use.
 *
 * The product's picture of itself is a night sky: the landing opens on a moon,
 * every university carries a constellation, and the application now sits on a
 * star field. These two glyphs are what carries that language into the screens
 * themselves — and there are two of them on purpose. An interface where a
 * person reads the last day a university will accept them is not the place for
 * rockets and planets scattered down the page; one divider and one empty-state
 * mark is as much as the theme can spend before it starts competing with the
 * date it exists to frame.
 *
 * Both are decorative and marked `aria-hidden`. Nothing here ever carries
 * meaning a screen reader would miss.
 */

/** A four-pointed star. The one glyph that reads as "space" at any size. */
function sparkle(x: number, y: number, r: number): string {
  const waist = r * 0.24;
  return [
    `M${x} ${y - r}`,
    `Q${x + waist} ${y - waist} ${x + r} ${y}`,
    `Q${x + waist} ${y + waist} ${x} ${y + r}`,
    `Q${x - waist} ${y + waist} ${x - r} ${y}`,
    `Q${x - waist} ${y - waist} ${x} ${y - r}`,
    "Z",
  ].join("");
}

/**
 * A section divider: a hairline that thins out towards a star in the middle.
 *
 * Replaces a plain `border-t` where a screen genuinely changes subject. It is
 * the same rule, drawn — the line still does the separating, the star just says
 * which page you are on.
 */
export function StarRule({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-border-strong", className)} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current" />
      <svg viewBox="0 0 24 12" className="h-3 w-6 fill-current">
        <path d={sparkle(12, 6, 5)} />
        <path d={sparkle(3, 6, 1.6)} opacity="0.6" />
        <path d={sparkle(21, 6, 1.6)} opacity="0.6" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current" />
    </div>
  );
}

/**
 * The mark over an empty screen: a small constellation with nothing in it yet.
 *
 * An empty state is the one place in this product where a picture earns its
 * keep — there is no data to look at, and a bare sentence in the middle of a
 * black page reads like a failure rather than a starting point.
 */
export function ConstellationGlyph({ className }: { className?: string }) {
  const nodes = [
    [8, 30],
    [22, 14],
    [38, 24],
    [52, 9],
    [64, 27],
  ] as const;

  return (
    <svg
      viewBox="0 0 72 40"
      className={cn("h-10 w-[72px] text-muted-foreground", className)}
      aria-hidden
    >
      <polyline
        points={nodes.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      {nodes.map(([x, y], index) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={index === 2 ? 2.6 : 1.7}
          fill="currentColor"
          opacity={index === 2 ? 0.95 : 0.6}
        />
      ))}
      <path d={sparkle(46, 34, 3)} fill="currentColor" opacity="0.5" />
    </svg>
  );
}
