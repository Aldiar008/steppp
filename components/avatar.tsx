"use client";

import { cn } from "@/lib/utils";

/**
 * Initials in a lit disc, from whatever identity is on hand.
 *
 * The hue comes from the name/email itself — the same person is the same
 * colour every time, on every device, without storing anything. Replaces the
 * old `ProfileSlot`-keyed avatar now that identity comes from Supabase Auth
 * rather than a locally typed name.
 */
export function Avatar({
  name,
  email,
  size = 40,
  shape = "circle",
}: {
  name?: string;
  email?: string;
  size?: number;
  /** `square` is for entities (universities), which have no "identity" to
   *  render as a person-disc — a rounded square reads as a logo placeholder
   *  instead. Same hue/initials engine either way. */
  shape?: "circle" | "square";
}) {
  const seed = (name?.trim() || email?.trim() || "?").toLocaleLowerCase("ru");
  const hue = hueOf(seed);

  return (
    <span
      aria-hidden
      className={cn(
        "avatar grid shrink-0 place-items-center border font-semibold",
        shape === "circle" ? "rounded-full" : "rounded-xl",
      )}
      style={
        {
          width: size,
          height: size,
          fontSize: size * 0.36,
          "--avatar-hue": hue,
        } as React.CSSProperties
      }
    >
      {initialsOf(name, email)}
    </span>
  );
}

export function initialsOf(name?: string, email?: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length > 0) {
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    const both = `${first}${second}`.toLocaleUpperCase("ru");
    if (both.length > 0) return both;
  }
  const fromEmail = email?.trim().slice(0, 1);
  return fromEmail ? fromEmail.toLocaleUpperCase("ru") : "?";
}

function hueOf(seed: string): number {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) total += seed.charCodeAt(index) * (index + 1);
  return total % 360;
}
