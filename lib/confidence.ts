import type { Confidence } from "./types";

/**
 * What each level of provenance is called on screen.
 *
 * It lives in a plain module rather than next to the badge that renders it,
 * because the badge is a client component and the sources page is a server one.
 * A server component importing a value out of a `"use client"` module gets a
 * client reference, not the object — so `CONFIDENCE_LABEL.verified` silently
 * came out as nothing on the one page whose whole job is naming provenance.
 */
export const CONFIDENCE_LABEL: Readonly<Record<Confidence, string>> = {
  verified: "Подтверждено источником",
  derived: "Год выведен из цикла",
  last_cycle: "По прошлому циклу",
  demo: "Демо-данные",
};
