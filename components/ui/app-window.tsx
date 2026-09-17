"use client";

import { cn } from "@/lib/utils";

/**
 * A macOS-style window frame.
 *
 * Exists so a product screenshot reads as a product rather than as a picture:
 * the traffic lights and the address row tell the eye "this is an application"
 * before a single pixel of content is parsed.
 *
 * The three dots are decorative and marked `aria-hidden`. They are not buttons,
 * so they are not rendered as buttons: a screen reader announcing "close,
 * minimise, maximise" on a landing-page illustration would be a lie.
 */
export interface AppWindowProps {
  /** Shown in the title bar, e.g. a route. */
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const LIGHTS = [
  { color: "#ff5f57", ring: "#e0443e" },
  { color: "#febc2e", ring: "#dea123" },
  { color: "#28c840", ring: "#1aab29" },
] as const;

export function AppWindow({ title, children, className }: AppWindowProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0f]",
        "shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-white/[0.035] px-3.5 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5" aria-hidden>
          {LIGHTS.map((light) => (
            <span
              key={light.color}
              className="size-3 rounded-full"
              style={{ backgroundColor: light.color, boxShadow: `inset 0 0 0 0.5px ${light.ring}` }}
            />
          ))}
        </div>

        {title && (
          <div className="mx-auto flex min-w-0 max-w-[60%] items-center gap-1.5 rounded-md bg-black/40 px-2.5 py-1">
            <span className="truncate font-mono text-[11px] leading-none text-zinc-500">
              {title}
            </span>
          </div>
        )}

        {/* Balances the lights so the address sits optically centred. */}
        <span className="w-[42px] shrink-0" aria-hidden />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
