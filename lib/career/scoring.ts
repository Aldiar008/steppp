import { FIELD_PROFILES } from "./fields";
import { SPECIALIZATIONS_BY_FIELD } from "./specializations/index";
import {
  AXIS_IDS,
  FACET_IDS,
  FIELD_IDS,
  type Axes,
  type EvidenceEntry,
  type Facets,
  type FieldId,
  type TraitVector,
  zeroVector,
} from "./types";

/**
 * Part 5 — stage 1 scoring, and the shared similarity function stage 3a's
 * widening also uses. Everything here is a pure function over a vector and a
 * list of evidence: no network call, no randomness, no wall-clock read. Given
 * the same answers twice, it returns the same result twice (§11.2 test #7).
 */

export interface ShiftInput {
  dimension: string;
  amount: number;
  quote: string;
  question_id: string;
}

/** Step 1–2: fold shifts into a vector, clamped to the document's own ranges. */
export function applyShifts(vector: TraitVector, shifts: readonly ShiftInput[]): TraitVector {
  const facets: Facets = { ...vector.facets };
  const axes: Axes = { ...vector.axes };

  for (const shift of shifts) {
    if ((FACET_IDS as readonly string[]).includes(shift.dimension)) {
      const id = shift.dimension as keyof Facets;
      facets[id] = clamp(facets[id] + shift.amount, 0, 100);
    } else if ((AXIS_IDS as readonly string[]).includes(shift.dimension)) {
      const id = shift.dimension as keyof Axes;
      axes[id] = clamp(axes[id] + shift.amount, -100, 100);
    }
    // An unrecognised dimension (should never happen — every producer of
    // ShiftInput is validated against FACET_IDS/AXIS_IDS before this runs)
    // is silently ignored rather than thrown: a scoring engine must never
    // crash a student's interview over a malformed upstream value.
  }

  return { facets, axes };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function evidenceFromShifts(shifts: readonly ShiftInput[]): EvidenceEntry[] {
  return shifts.map((shift) => ({
    dimension: shift.dimension,
    shift: shift.amount,
    quote: shift.quote,
    question_id: shift.question_id,
  }));
}

/* -------------------------------------------------------------------------- */
/* Field scoring                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Similarity of a student's vector to a field's (partial) profile, 0–100.
 *
 * Only the dimensions a field profile actually names are compared — the
 * document's own "поля, полностью заблокированные... выбывают", "считается
 * близость профиля ученика к профилю поля" leaves the exact formula to the
 * engineer; this is a normalized-distance similarity (facets scaled by their
 * 0–100 range, axes by their −100…+100 range) so that no single dimension or
 * field profile with more/fewer named dimensions is unfairly favoured.
 */
export function fieldSimilarity(vector: TraitVector, field: FieldId): number {
  const profile = FIELD_PROFILES[field];
  const dims = [...Object.entries(profile.facets), ...Object.entries(profile.axes)];
  if (dims.length === 0) return 0;

  let totalNormDist = 0;
  for (const [dimension, target] of Object.entries(profile.facets)) {
    const value = vector.facets[dimension as keyof Facets];
    totalNormDist += Math.abs(value - (target ?? 0)) / 100;
  }
  for (const [dimension, target] of Object.entries(profile.axes)) {
    const value = vector.axes[dimension as keyof Axes];
    totalNormDist += Math.abs(value - (target ?? 0)) / 200;
  }

  const avgNormDist = totalNormDist / dims.length;
  return 100 * (1 - avgNormDist);
}

export interface FieldBonusMap {
  [field: string]: number;
}

/** Every field's score: similarity plus any direct field bonuses collected along the way (§4, Q3's `SEC +15`). */
export function scoreFields(vector: TraitVector, bonuses: FieldBonusMap = {}): Record<FieldId, number> {
  const scores = {} as Record<FieldId, number>;
  for (const field of FIELD_IDS) {
    scores[field] = fieldSimilarity(vector, field) + (bonuses[field] ?? 0);
  }
  return scores;
}

/** A field is eligible only if at least one of its specializations survives the veto set. */
export function eligibleFields(vetoedIds: ReadonlySet<string>): readonly FieldId[] {
  return FIELD_IDS.filter((field) => SPECIALIZATIONS_BY_FIELD[field].some((spec) => !vetoedIds.has(spec.id)));
}

/* -------------------------------------------------------------------------- */
/* Candidate selection — §5 step 4–5                                         */
/* -------------------------------------------------------------------------- */

export interface FieldCandidateResult {
  ranked: readonly { field: FieldId; score: number }[];
  /** Fields within 15% of the leader, 1–3 of them under normal conditions. */
  candidates: readonly FieldId[];
  /** True when more than three fields tied within the threshold — the caller should ask Q11 then Q12. */
  needsDisambiguation: boolean;
  confidence: number;
}

const LEADER_MARGIN = 0.15;
const CONFIDENCE_THRESHOLD = 0.35;

export function selectFieldCandidates(
  vector: TraitVector,
  vetoedIds: ReadonlySet<string>,
  bonuses: FieldBonusMap = {},
): FieldCandidateResult {
  const eligible = eligibleFields(vetoedIds);
  const scores = scoreFields(vector, bonuses);
  const ranked = eligible.map((field) => ({ field, score: scores[field] })).sort((a, b) => b.score - a.score);

  const leader = ranked[0];
  if (leader === undefined) {
    return { ranked, candidates: [], needsDisambiguation: false, confidence: 0 };
  }

  const threshold = leader.score * (1 - LEADER_MARGIN);
  const withinMargin = ranked.filter((entry) => entry.score >= threshold);

  const needsDisambiguation = withinMargin.length > 3;
  const candidates = needsDisambiguation
    ? withinMargin.slice(0, 3).map((entry) => entry.field)
    : withinMargin.map((entry) => entry.field);

  const second = ranked[1];
  const confidence =
    second === undefined || leader.score === 0 ? 1 : Math.max(0, (leader.score - second.score) / leader.score);

  return { ranked, candidates, needsDisambiguation, confidence };
}

export function isConfident(confidence: number): boolean {
  return confidence > CONFIDENCE_THRESHOLD;
}

export function createEmptyVector(): TraitVector {
  return zeroVector();
}
