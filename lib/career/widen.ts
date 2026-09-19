import { FIELD_ADJACENCY } from "./fields";
import { findSpecialization, nearestInField, specializationsOf } from "./specializations/index";
import type { CareerWidenState, FieldId, Specialization } from "./types";

/**
 * Part 7 — stage 3a, "это не про меня". Fully deterministic: no LLM call
 * anywhere in this file. Everything the student already said stays in place;
 * only the search radius changes, per §7's own framing ("не перезапуск").
 *
 * State shape lives in `types.ts` (`CareerWidenState`) since it is persisted
 * alongside the rest of the interview — this file only holds the pure
 * transitions over it.
 */

export type WidenState = CareerWidenState;

export function createWidenState(): WidenState {
  return { round: 0, phase: null, rejected: [] };
}

export function recordRejection(state: WidenState, id: string, round: 1 | 2 | 3, reason?: string): WidenState {
  return { ...state, rejected: [...state.rejected, { id, round, reason }] };
}

/** §7.4 — three rounds, then a hard handoff to stage 3b. */
export function shouldEscalateToStage3b(state: WidenState): boolean {
  return state.round >= 3;
}

function rejectedIds(state: WidenState): ReadonlySet<string> {
  return new Set(state.rejected.map((entry) => entry.id));
}

/* -------------------------------------------------------------------------- */
/* Round 1 — widen within the field                                          */
/* -------------------------------------------------------------------------- */

/** §7.1 — up to three same-field neighbours, nearest first, excluding anything already shown or rejected. */
export function widenRound1(rejectedSpecId: string, state: WidenState): readonly Specialization[] {
  const rejected = findSpecialization(rejectedSpecId);
  if (rejected === undefined) return [];
  return nearestInField(rejected, rejectedIds(state)).slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* Round 2 — one clarifying question                                          */
/* -------------------------------------------------------------------------- */

export const WIDEN_CLARIFYING_QUESTION =
  "Что именно не то? Чем занимаются, где это происходит, или сколько лет учиться?";

export type WidenClarificationBranch = "what" | "where" | "how_long";

/**
 * §7.2's explicit substitution examples — "часто это настоящая причина".
 * Extensible, like the AVERSIONS veto map: only the pairs the document
 * actually names are here, never an invented general rule about training
 * length (there is no per-specialization years-of-study number in the
 * document to generalise from).
 */
const TRAINING_LENGTH_SUBSTITUTIONS: Readonly<Record<string, string>> = {
  ENG_MECH: "TRD_CNC",
  MED_GP: "MED_NURS",
};

export function widenRound2(
  branch: WidenClarificationBranch,
  rejectedSpecId: string,
  state: WidenState,
): readonly Specialization[] {
  const rejected = findSpecialization(rejectedSpecId);
  if (rejected === undefined) return [];
  const excluded = rejectedIds(state);

  if (branch === "how_long") {
    const substituteId = TRAINING_LENGTH_SUBSTITUTIONS[rejectedSpecId];
    const substitute = substituteId === undefined ? undefined : findSpecialization(substituteId);
    if (substitute !== undefined && !excluded.has(substitute.id)) return [substitute];
    // No documented substitution for this specific specialization — fall
    // back to the same-field neighbours rather than inventing one.
    return nearestInField(rejected, excluded).slice(0, 3);
  }

  // "чем занимаются" and "где происходит" both stay within the field — the
  // document does not give a second, separate distance metric per branch, so
  // both draw on the same same-field ranking, one tier further out than
  // round 1 already offered (round 1 = closest 3; this = the next 3).
  return nearestInField(rejected, excluded).slice(3, 6);
}

/* -------------------------------------------------------------------------- */
/* Round 3 — adjacent fields                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One representative specialization per neighbouring field, per §7.3's
 * adjacency table. Where a neighbouring field has a specialization whose own
 * "Что отличает" text names the origin field as a bridge (e.g. "мост в
 * ENG_MECH"), that one is picked — a real signal already in the document —
 * otherwise the field's first-listed specialization stands in.
 */
/* -------------------------------------------------------------------------- */
/* Orchestration — round transitions the hook drives                          */
/* -------------------------------------------------------------------------- */

/**
 * The student rejected whatever is currently shown (the interview's leading
 * result the first time, or the current round's list afterwards). Advances
 * the round/phase per §7's own structure: round 1 is a list, round 2 is one
 * clarifying question followed by its own list, round 3 is one more list —
 * then §7.4's cap hands off to stage 3b.
 */
export function rejectCurrentAndAdvance(state: WidenState, rejectedId: string, originField: FieldId): WidenState {
  if (state.round === 0) {
    return {
      ...recordRejection(state, rejectedId, 1),
      round: 1,
      phase: "list",
      lastRejectedId: rejectedId,
      originField,
    };
  }
  if (state.round === 1) {
    return { ...recordRejection(state, rejectedId, 1), round: 2, phase: "clarify", lastRejectedId: rejectedId };
  }
  if (state.round === 2) {
    return { ...recordRejection(state, rejectedId, 2), round: 3, phase: "list", lastRejectedId: rejectedId };
  }
  return { ...recordRejection(state, rejectedId, 3), round: 3, phase: "list", lastRejectedId: rejectedId };
}

export function answerClarify(state: WidenState, branch: WidenClarificationBranch): WidenState {
  return { ...state, phase: "list", clarifyBranch: branch };
}

/** The alternatives the student should see right now, given `state.phase`/`state.round`. */
export function currentWidenOptions(state: WidenState): readonly Specialization[] {
  if (state.phase !== "list" || state.lastRejectedId === undefined) return [];
  if (state.round === 1) return widenRound1(state.lastRejectedId, state);
  if (state.round === 2) {
    return state.clarifyBranch === undefined ? [] : widenRound2(state.clarifyBranch, state.lastRejectedId, state);
  }
  if (state.round === 3) {
    return state.originField === undefined ? [] : widenRound3(state.originField, state);
  }
  return [];
}

export function widenRound3(originField: FieldId, state: WidenState): readonly Specialization[] {
  const excluded = rejectedIds(state);
  const neighbors = FIELD_ADJACENCY[originField].slice(0, 3);

  return neighbors
    .map((field) => {
      const specs = specializationsOf(field).filter((spec) => !excluded.has(spec.id));
      if (specs.length === 0) return null;
      const bridge = specs.find((spec) => spec.differentiator.includes(originField));
      return bridge ?? specs[0] ?? null;
    })
    .filter((spec): spec is Specialization => spec !== null);
}
