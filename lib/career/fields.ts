import { AXIS_IDS, FACET_IDS, FIELD_IDS, type AxisId, type FacetId, type FieldId } from "./types";

/**
 * Part 2's field profiles, quantified.
 *
 * The document gives each field's profile qualitatively — "`O_MATTER` выс.,
 * `O_DATA` средн." — and leaves the numeric encoding to the engineer building
 * the scoring engine (this is the one place in the whole module where a
 * qualitative document cell becomes a number; every other file transcribes
 * the document's own numbers or symbols directly).
 *
 * The scheme, applied uniformly across all 11 fields:
 *   "выс."  (high)   → 75   (facets are 0–100; a field that leans hard on a
 *                             facet without claiming exclusivity)
 *   "средн." (medium) → 50
 * Axes are copied as literally stated in the document ("A_PREC +60" → 60);
 * a field's profile only lists the facets/axes it actually names, and
 * `scoring.ts` only ever compares a student's vector against the dimensions
 * a field profile specifies — an unlisted dimension does not silently count
 * as "should be zero" for that field.
 */
const HIGH = 75;
const MED = 50;

export interface FieldProfile {
  facets: Partial<Record<FacetId, number>>;
  axes: Partial<Record<AxisId, number>>;
}

export const FIELD_PROFILES: Readonly<Record<FieldId, FieldProfile>> = {
  ENG: { facets: { O_MATTER: HIGH, O_DATA: MED }, axes: { A_ABS: -20, A_PREC: 60, A_NEW: 30 } },
  IT: { facets: { O_DATA: HIGH, O_SYSTEM: MED }, axes: { A_ABS: 60, A_PHYS: -70, A_NEW: 40 } },
  SCI: { facets: { O_DATA: HIGH, O_LIFE: MED, O_MATTER: MED }, axes: { A_ABS: 80, A_HORIZON: 70, A_SOC: -40 } },
  MED: { facets: { O_PEOPLE: HIGH, O_LIFE: HIGH }, axes: { A_PREC: 80, A_SOC: 50, A_SCALE: -40 } },
  BIZ: { facets: { O_SYSTEM: HIGH, O_DATA: MED }, axes: { A_INFL: 50, A_RISK: 30, A_SCALE: 40 } },
  LAW: { facets: { O_SYSTEM: HIGH, O_PEOPLE: MED }, axes: { A_PREC: 70, A_INFL: 60, A_SCALE: 60 } },
  ART: { facets: { O_IMAGE: HIGH }, axes: { A_NEW: 80, A_PREC: -30, A_RISK: 40 } },
  EDU: { facets: { O_PEOPLE: HIGH }, axes: { A_SOC: 70, A_SCALE: -50, A_HORIZON: 50 } },
  ENV: { facets: { O_LIFE: HIGH, O_MATTER: MED }, axes: { A_PHYS: 50, A_HORIZON: 60 } },
  TRD: { facets: { O_MATTER: HIGH }, axes: { A_ABS: -80, A_PHYS: 80, A_HORIZON: -60 } },
  SEC: { facets: { O_PEOPLE: MED, O_MATTER: MED }, axes: { A_PHYS: 70, A_RISK: 60, A_PREC: 50 } },
};

/**
 * §7.3's adjacency table. "Ближайшие соседи" as listed, in the document's own
 * order (nearest first) — used by both stage 3a round 3 and stage 3b's
 * system prompt context.
 */
export const FIELD_ADJACENCY: Readonly<Record<FieldId, readonly FieldId[]>> = {
  ENG: ["TRD", "IT", "SCI"],
  IT: ["SCI", "ENG", "BIZ"],
  SCI: ["IT", "MED", "ENV"],
  MED: ["SCI", "EDU", "SEC"],
  BIZ: ["LAW", "IT", "ART"],
  LAW: ["BIZ", "EDU", "ART"],
  // "`ART`↔`ENG` через дизайн" in the document's own row — encoded as ENG,
  // not a fourth field, since design is the bridge, not a separate neighbor.
  ART: ["IT", "ENG", "EDU"],
  EDU: ["MED", "LAW", "ART"],
  ENV: ["SCI", "ENG", "TRD"],
  TRD: ["ENG", "SEC", "ENV"],
  SEC: ["TRD", "MED", "EDU"],
};

export function isFieldId(value: string): value is FieldId {
  return (FIELD_IDS as readonly string[]).includes(value);
}

export function isAxisId(value: string): value is AxisId {
  return (AXIS_IDS as readonly string[]).includes(value);
}

export function isFacetId(value: string): value is FacetId {
  return (FACET_IDS as readonly string[]).includes(value);
}
