import { cn } from "@/lib/utils";

/**
 * The mark: a doorway with a step in it, which is the whole product in one
 * glyph. Ported in spirit from the prototype mascot, redrawn so it carries
 * meaning rather than decoration.
 */
export function StepwiseMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Stepwise"
      className={cn("shrink-0", className)}
    >
      <rect
        x="3.25"
        y="2.25"
        width="17.5"
        height="19.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7.5 17.25h3.25v-4h3.25v-4h3.25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <StepwiseMark size={22} />
      <span className="text-[15px] font-semibold tracking-tight">Stepwise</span>
    </span>
  );
}
