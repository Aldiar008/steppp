import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StatTone } from "./stat-tile";

const TONE_INDICATOR_CLASS: Readonly<Record<StatTone, string>> = {
  open: "[&>[data-slot=progress-indicator]]:bg-open",
  risk: "[&>[data-slot=progress-indicator]]:bg-risk",
  critical: "[&>[data-slot=progress-indicator]]:bg-critical",
  closed: "[&>[data-slot=progress-indicator]]:bg-closed",
  neutral: "[&>[data-slot=progress-indicator]]:bg-primary",
};

/**
 * A labelled row with a bar and a percentage — the OnePrep "Yield Rate ▬▬░░
 * 13%" shape. `percent` must already be a real computed share (0-100); this
 * component draws it, it never invents one.
 */
export function ProgressBar({
  label,
  percent,
  valueLabel,
  tone = "neutral",
  className,
}: {
  label: React.ReactNode;
  percent: number;
  valueLabel?: React.ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("flex items-center gap-4 py-2.5", className)}>
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{label}</span>
      <Progress value={clamped} className={cn("h-1.5 w-24 shrink-0 sm:w-32", TONE_INDICATOR_CLASS[tone])} />
      <span className="num w-12 shrink-0 text-right text-sm font-semibold">
        {valueLabel ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
