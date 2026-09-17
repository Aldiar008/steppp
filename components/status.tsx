import type { DoorStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * The status vocabulary, in one place.
 *
 * Colour in this product means exactly one thing: how close a route is to
 * closing. Any component that needs to express urgency reads it from here, so
 * a green badge can never mean something different on another screen.
 */
export const STATUS_LABEL: Record<DoorStatus, string> = {
  open: "Открыт",
  at_risk: "Закрывается",
  critical: "Последний момент",
  closed: "Закрыт",
  blocked: "Недоступен",
};

export const STATUS_HINT: Record<DoorStatus, string> = {
  open: "Времени пока достаточно",
  at_risk: "До точки невозврата меньше полутора месяцев",
  critical: "До точки невозврата меньше двух недель",
  closed: "Точка невозврата пройдена",
  blocked: "Не подходит по условиям профиля",
};

/** Tailwind classes per status. Soft background, readable ink, matching border. */
export const STATUS_CHIP: Record<DoorStatus, string> = {
  open: "bg-open-soft text-open-ink border-open/25",
  at_risk: "bg-risk-soft text-risk-ink border-risk/30",
  critical: "bg-critical-soft text-critical-ink border-critical/30",
  closed: "bg-closed-soft text-closed-ink border-closed/25",
  blocked: "bg-closed-soft text-closed-ink border-closed/25",
};

export const STATUS_BAR: Record<DoorStatus, string> = {
  open: "bg-open",
  at_risk: "bg-risk",
  critical: "bg-critical",
  closed: "bg-closed",
  blocked: "bg-closed",
};

export const STATUS_INK: Record<DoorStatus, string> = {
  open: "text-open-ink",
  at_risk: "text-risk-ink",
  critical: "text-critical-ink",
  closed: "text-closed-ink",
  blocked: "text-closed-ink",
};

export function StatusChip({
  status,
  className,
  children,
}: {
  status: DoorStatus;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_CHIP[status],
        className,
      )}
    >
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
