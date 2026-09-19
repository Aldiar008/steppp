/**
 * Real photographs of universities, when there are any.
 *
 * There are none yet, and the empty object below is the honest state of it.
 * Nobody on this team has photographed these campuses, and a product whose
 * whole argument is "we only show what we can source" cannot hotlink seventy-five
 * images it neither owns nor licensed and call them the university's. So every
 * university is drawn instead — see `components/university-crest.tsx` — and the
 * drawing says what it is.
 *
 * ── Adding a real photo ────────────────────────────────────────────────────
 *
 *   1. put the file in `public/universities/`, e.g. `public/universities/mit.jpg`
 *   2. add a line here:  mit: { src: "/universities/mit.jpg", credit: "…", … }
 *
 * The crest disappears for that university everywhere at once — the card, the
 * map plaque and the detail page all read this table first. `credit` is not
 * optional: a photograph on this page carries the name of whoever took it and
 * the licence it is used under, in the caption, where a reader can see it.
 * Landscape, at least 1200px wide; the frames it lands in are all 16:10 or
 * wider.
 */

export interface UniversityPhoto {
  /** Path under `public/`, e.g. `/universities/mit.jpg`. */
  src: string;
  /** Who took it, and under what licence. Shown in the caption. */
  credit: string;
  /** Described for anyone who cannot see it. */
  alt: string;
}

export const UNIVERSITY_PHOTOS: Readonly<Record<string, UniversityPhoto>> = {};

export function photoOf(programId: string): UniversityPhoto | undefined {
  return UNIVERSITY_PHOTOS[programId];
}
