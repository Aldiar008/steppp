/**
 * Where the catalogue's facts come from.
 *
 * Every `source_id` in the data resolves here, and the product shows the result
 * rather than the id: an applicant deciding what to do in November deserves to
 * see who said the deadline is the twentieth.
 *
 * The list is generated from the dataset — one record per university plus the
 * nine shared references (UCAS, ЕНТ, the grant rules, SAT dates) — and one
 * entry that is not a source at all: `estimate`, which covers how long a step
 * takes. That is our judgement, not anybody's publication, and it is labelled
 * as such so it can never be mistaken for a checked fact.
 */
import type { Source } from "@/lib/types";
import { IMPORTED_SOURCES } from "./catalog.generated";

export const SOURCES: readonly Source[] = IMPORTED_SOURCES;

/** The record behind a `source_id`, or nothing when the id is unknown. */
export function findSource(sourceId: string): Source | undefined {
  return SOURCES.find((source) => source.id === sourceId);
}
