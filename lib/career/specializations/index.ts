import type { FieldId, LocalAxisValue, Specialization } from "../types";
import { ART_SPECIALIZATIONS } from "./art";
import { BIZ_SPECIALIZATIONS } from "./biz";
import { EDU_SPECIALIZATIONS } from "./edu";
import { ENG_SPECIALIZATIONS } from "./eng";
import { ENV_SPECIALIZATIONS } from "./env";
import { IT_SPECIALIZATIONS } from "./it";
import { LAW_SPECIALIZATIONS } from "./law";
import { MED_SPECIALIZATIONS } from "./med";
import { SCI_SPECIALIZATIONS } from "./sci";
import { SEC_SPECIALIZATIONS } from "./sec";
import { TRD_SPECIALIZATIONS } from "./trd";

export const SPECIALIZATIONS_BY_FIELD: Readonly<Record<FieldId, readonly Specialization[]>> = {
  ENG: ENG_SPECIALIZATIONS,
  IT: IT_SPECIALIZATIONS,
  SCI: SCI_SPECIALIZATIONS,
  MED: MED_SPECIALIZATIONS,
  BIZ: BIZ_SPECIALIZATIONS,
  LAW: LAW_SPECIALIZATIONS,
  ART: ART_SPECIALIZATIONS,
  EDU: EDU_SPECIALIZATIONS,
  ENV: ENV_SPECIALIZATIONS,
  TRD: TRD_SPECIALIZATIONS,
  SEC: SEC_SPECIALIZATIONS,
};

export const ALL_SPECIALIZATIONS: readonly Specialization[] = Object.values(SPECIALIZATIONS_BY_FIELD).flat();

const BY_ID = new Map<string, Specialization>(ALL_SPECIALIZATIONS.map((spec) => [spec.id, spec]));

export function findSpecialization(id: string): Specialization | undefined {
  return BY_ID.get(id);
}

export function specializationsOf(field: FieldId): readonly Specialization[] {
  return SPECIALIZATIONS_BY_FIELD[field];
}

/**
 * §6.1's "делит список примерно пополам" and §7.1's "отличаются от отвергнутой
 * по одной локальной оси" both need a notion of distance between two
 * specializations in the same field. The document's local-axis cells mix two
 * kinds of value — an ordinal arrow token (`↑↑ ↑ ~ ↓ ↓↓`, sometimes with a
 * category prefix like "движение ↑") and a bare category name ("город",
 * "человек") — and never states a numeric scale for the category kind, so
 * this does not invent one. Two cells are compared by:
 *   - if both parse as pure or prefixed arrow tokens, the arrow's ordinal
 *     position (↓↓=-2 ↓=-1 ~=0 ↑=1 ↑↑=2) — a standard 5-point reading of the
 *     document's own notation, nothing added;
 *   - otherwise, exact string equality (0 = same category, 1 = different).
 * The per-axis distance is normalized to 0..1 either way, so no axis
 * dominates just because it happens to be arrow-coded.
 */
const ARROW_ORDER: Readonly<Record<string, number>> = { "↓↓": -2, "↓": -1, "~": 0, "↑": 1, "↑↑": 2 };

function arrowOf(value: LocalAxisValue): number | null {
  const trimmed = value.trim();
  // Bare arrow, or an arrow suffix after a word ("движение ↑↑", "выск. ↑").
  const match = /(↓↓|↑↑|↓|↑|~)$/.exec(trimmed);
  if (match === undefined || match === null) return null;
  const token = match[1] ?? match[0];
  return ARROW_ORDER[token] ?? null;
}

function axisDistance(a: LocalAxisValue, b: LocalAxisValue): number {
  if (a === b) return 0;
  const arrowA = arrowOf(a);
  const arrowB = arrowOf(b);
  if (arrowA !== null && arrowB !== null) return Math.abs(arrowA - arrowB) / 4;
  return 1;
}

/** How many of the shared local axes differ, and by how much (0 = identical). */
export function localAxisDistance(a: Specialization, b: Specialization): number {
  const keys = new Set([...Object.keys(a.localAxes), ...Object.keys(b.localAxes)]);
  let total = 0;
  let count = 0;
  for (const key of keys) {
    const valueA = a.localAxes[key];
    const valueB = b.localAxes[key];
    if (valueA === undefined || valueB === undefined) continue;
    total += axisDistance(valueA, valueB);
    count += 1;
  }
  return count === 0 ? 1 : total / count;
}

/** Specializations in the same field as `rejected`, nearest first, excluding it and any in `exclude`. */
export function nearestInField(
  rejected: Specialization,
  exclude: ReadonlySet<string> = new Set(),
): readonly Specialization[] {
  return specializationsOf(rejected.field)
    .filter((spec) => spec.id !== rejected.id && !exclude.has(spec.id))
    .map((spec) => ({ spec, distance: localAxisDistance(rejected, spec) }))
    .sort((a, b) => a.distance - b.distance)
    .map((entry) => entry.spec);
}
