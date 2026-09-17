import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";
import { STATUS_BAR } from "./status";
import type { DoorStatus } from "@/types/domain";

/**
 * The product metaphor, drawn.
 *
 * A doorway with a leaf sliding across it. The leaf covers more of the opening
 * as the point of no return approaches, so a wall of these reads as "how much
 * room do I still have" before a single word is read. The aperture is derived
 * from real days, never from taste.
 */
const HORIZON_DAYS = 270;

export function apertureFor(status: DoorStatus, daysLeft: number | null): number {
  if (status === "blocked" || status === "closed") return 0;
  if (daysLeft === null) return 1; // nothing left to do on this route
  return Math.max(0.08, Math.min(1, daysLeft / HORIZON_DAYS));
}

export function DoorGlyph({
  status,
  daysLeft,
  size = "md",
  className,
}: {
  status: DoorStatus;
  daysLeft: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const aperture = apertureFor(status, daysLeft);
  const closedFraction = Math.round((1 - aperture) * 100);
  const shut = status === "closed" || status === "blocked";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border-2 border-border-strong bg-background",
        size === "sm" ? "h-10 w-7" : "h-14 w-10",
        className,
      )}
      aria-hidden
    >
      {/* the leaf */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 transition-[width] duration-500 ease-[var(--ease-out-quint)]",
          STATUS_BAR[status],
          shut ? "opacity-45" : "opacity-85",
        )}
        style={{ width: `${closedFraction}%` }}
      />
      {/* hinge side, so the glyph reads as a door rather than a progress bar */}
      <div className="absolute inset-y-1.5 left-1 w-px bg-border-strong" />
      {status === "blocked" && (
        <LockSimpleIcon
          weight="fill"
          className="absolute inset-0 m-auto size-4 text-closed-ink"
        />
      )}
    </div>
  );
}
