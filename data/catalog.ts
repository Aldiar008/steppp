/**
 * The catalogue the product runs on.
 *
 * Seventy-five universities in nineteen countries, imported from
 * `data/raw/universities_verified.json` by `scripts/import-universities.mjs`.
 * The raw file and the importer both ship here, so any date on any screen can
 * be traced back to the sentence a university published and the rule that read
 * it.
 *
 * What the provenance actually says, and why it is not uniform:
 *
 *   `verified`    the source wrote the whole date, year included
 *   `derived`     the source wrote a day and a month; the year follows from the
 *                 2027 intake cycle, and the product says so rather than
 *                 pretending the university named it
 *   `last_cycle`  the source published a window that has already closed, or
 *                 explicitly describes a previous cycle — real dates, wrong year
 *   (none)        no submission date could be read; the door reports
 *                 `needs_data` and shows the original sentence instead
 *
 * Tuition is absent almost everywhere because almost nobody publishes it, and
 * an absent price is a fact about the catalogue rather than a hole in it.
 *
 * To refresh after the raw file changes:
 *
 *   node scripts/import-universities.mjs
 *   node scripts/import-universities.mjs --explain mit   # how one was read
 */
import { SPECIALTIES } from "@/data/specialties";
import weights from "@/data/weights.json";
import {
  DEADLINE_ROUNDS,
  IMPORTED_ACTIONS,
  IMPORTED_PROGRAMS,
  IMPORTED_SOURCES,
} from "./catalog.generated";
import type { Catalog } from "@/lib/engine";
import type { ActionStep, Program, Source } from "@/lib/types";

export const PROGRAMS: Program[] = IMPORTED_PROGRAMS;
export const ACTIONS: ActionStep[] = IMPORTED_ACTIONS;
export const SOURCES: readonly Source[] = IMPORTED_SOURCES;

/** Earlier rounds — Early Action and the like — by programme id. */
export { DEADLINE_ROUNDS };

/**
 * How much of the catalogue stands on what.
 *
 * Counted here rather than written into a screen, so the sentence an applicant
 * reads about the data cannot drift away from the data. It is the honest
 * headline number: how many deadlines the source stated in full.
 */
export const CATALOG_PROVENANCE = PROGRAMS.reduce(
  (totals, program) => {
    const confidence = program.application_deadline?.confidence;
    if (confidence === undefined) totals.undated += 1;
    else totals[confidence] += 1;
    return totals;
  },
  { verified: 0, derived: 0, last_cycle: 0, demo: 0, undated: 0, total: PROGRAMS.length },
);

/** What the engine receives: programmes and steps, nothing else. */
export const CATALOG: Catalog = { programs: PROGRAMS, actions: ACTIONS };

/**
 * Everything static the application reads, behind one import.
 *
 * The engine only ever gets `programs` and `actions` — it has no business
 * knowing about labels or source metadata — while the screens resolve ids
 * through `sources` and `specialties` here rather than importing data files one
 * by one and drifting apart.
 */
export const APP_CATALOG = {
  programs: PROGRAMS,
  actions: ACTIONS,
  sources: SOURCES,
  specialties: SPECIALTIES,
  weights,
} as const;
