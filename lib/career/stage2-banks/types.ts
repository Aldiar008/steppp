import type { FieldId } from "../types";

/**
 * One entry from a §6.2 bank. `groupA`/`groupB` encode the row's own
 * "разделяет: X vs Y" column structurally, so the offline selector in
 * `stage2.ts` can actually simulate how a question would split the current
 * candidate list instead of guessing:
 *   - `groupB: "rest"` — the document wrote "vs все остальные" / "vs весь
 *     остальной <FIELD>": every specialization in the field not in `groupA`.
 *   - `groupB: string[]` — the document named both sides explicitly; any
 *     candidate not mentioned on either side is simply not addressed by this
 *     question (neither bucket), matching the document's own text rather
 *     than forcing every candidate into one of two sides.
 */
export interface Stage2Question {
  id: string;
  field: FieldId;
  prompt: string;
  /** Local axis id(s) this question is tagged to in the document. */
  axes: readonly string[];
  groupA: readonly string[];
  groupB: readonly string[] | "rest";
}
