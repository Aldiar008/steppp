"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Initials in a lit disc, from whatever identity is on hand — or, given
 * `logoDomain`, that entity's own real favicon instead.
 *
 * The hue comes from the name/email itself — the same person is the same
 * colour every time, on every device, without storing anything. Replaces the
 * old `ProfileSlot`-keyed avatar now that identity comes from Supabase Auth
 * rather than a locally typed name.
 *
 * The initials render underneath the image unconditionally, not just on
 * error: they are the base layer, and a loaded favicon merely covers them.
 * That is what keeps a failed or still-loading logo from ever reading as a
 * broken image — there was never a moment with nothing drawn there.
 */
export function Avatar({
  name,
  email,
  size = 40,
  shape = "circle",
  logoDomain,
}: {
  name?: string;
  email?: string;
  size?: number;
  /** `square` is for entities (universities), which have no "identity" to
   *  render as a person-disc — a rounded square reads as a logo placeholder
   *  instead. Same hue/initials engine either way. */
  shape?: "circle" | "square";
  /**
   * The entity's own primary domain, e.g. `"mit.edu"` — its live favicon is
   * fetched and shown in place of the initials once it loads. Only ever
   * meaningful for `shape="square"`: a person has no domain to show a logo
   * for. Never invented from a name; absent means this entity's real domain
   * isn't on hand, and the initials stand as the honest rendering.
   */
  logoDomain?: string;
}) {
  const seed = (name?.trim() || email?.trim() || "?").toLocaleLowerCase("ru");
  const hue = hueOf(seed);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = logoDomain !== undefined && !logoFailed;

  return (
    <span
      aria-hidden
      className={cn(
        "avatar relative grid shrink-0 place-items-center overflow-hidden border font-semibold",
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
      {showLogo && (
        <img
          src={faviconUrl(logoDomain)}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      )}
    </span>
  );
}

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
}

const SKIP_WORDS = new Set(["of", "the", "and", "für", "de", "di", "im", "am", "им"]);

export function initialsOf(name?: string, email?: string): string {
  const words = name
    ?.trim()
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLocaleLowerCase("ru")));
  if (words !== undefined && words.length > 0) {
    const first = words[0]?.[0] ?? "";
    const second = words[1]?.[0] ?? "";
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
