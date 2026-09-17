/**
 * Which question is worth asking next.
 *
 * A form asks everything. This asks the few things whose answer would actually
 * move the board — and then stops, out loud, when nothing left would. That is
 * the difference between an applicant filling in thirty fields and an applicant
 * getting an answer in four minutes.
 *
 *     for each unanswered question
 *       for each value the answer could take
 *         apply it to a copy of the profile
 *         recompute the whole route
 *         compare the two boards
 *     → the question whose answers differ most wins
 *     → if the best one changes almost nothing, stop asking
 *
 * The measuring is done by the engine that already exists: `computeRoute` for
 * the counterfactual board, `diffDoorSets` for the comparison. Nothing here
 * re-implements matching, scheduling or diffing, and nothing here is a model —
 * a language model may one day phrase the chosen question, but choosing it is
 * arithmetic over doors.
 *
 * Pure throughout: `today` is an argument, the profile is never mutated, and
 * the same inputs always select the same question.
 */
import { QUESTION_CATALOG } from "@/data/questions";
import type { Cost, Currency, Door, Iso, Profile, ProfileExam, ProfileLanguage } from "@/lib/types";
import { diffDoorSets } from "./diff";
import { isDoorReachable } from "./door-state";
import {
  applyProfileChange,
  isProfileFieldKnown,
  type ProfileChange,
  type ProfileField,
} from "./profile-patch";
import { computeRoute, type Catalog } from "./route";
import { isIsoDate } from "./schedule";

/* -------------------------------------------------------------------------- */
/* Question model                                                              */
/* -------------------------------------------------------------------------- */

export interface QuestionOption<T> {
  /** Stable id used by the UI and stored as the given answer. */
  value: string;
  label: string;
  hint?: string;
  /** The profile value this option stands for. */
  to: T;
}

/**
 * A range the applicant answers with their own number.
 *
 * Fixed options are fine for "нужен ли грант" and useless for IELTS: a band is
 * a scale from 1 to 9 in half-steps, and a product that offers "6 или выше"
 * either throws away the difference between 6.5 and 8.0 or forces a person to
 * lie about their own certificate. Anything measured gets a scale.
 *
 * `default` is only where the control starts — it is never written to the
 * profile, because the applicant not touching a slider is not an answer.
 */
export interface QuestionScale {
  min: number;
  max: number;
  step: number;
  /** Shown beside the number: "баллов", "₸". */
  unit?: string;
  default: number;
}

interface QuestionBase {
  id: string;
  title: string;
  hint?: string;
  type: "single" | "multi" | "boolean" | "scale";
  /**
   * Present when the answer is a number the applicant sets themselves. The
   * options, if any, stay as quick answers beside it ("ещё не сдавал").
   */
  scale?: QuestionScale;
  /**
   * Authored tie-break weight. Used only when two questions move the board by
   * exactly the same amount — never added to the measured influence, so an
   * opinion can never outrank a measurement.
   */
  importance?: number;
}

/**
 * A question, typed by the profile field it fills.
 *
 * The union mirrors `ProfileChange`, so a question can only ever write a field
 * the engine knows how to apply, and the options can only carry values of the
 * right shape. `candidate_values` is not stored: it *is* the options' targets,
 * and `candidateValuesOf` derives it, so the two cannot drift apart.
 */
export type QuestionDefinition = QuestionBase &
  (
    | { field: "interests"; options: readonly QuestionOption<string>[] }
    | { field: "countries"; options: readonly QuestionOption<string>[] }
    | { field: "languages"; options: readonly QuestionOption<ProfileLanguage>[] }
    /** `exam_id` names the exam a scale answer belongs to, e.g. "ielts". */
    | { field: "exams"; exam_id?: string; options: readonly QuestionOption<ProfileExam>[] }
    /** `currency` is the currency a scale answer is counted in. */
    | { field: "budget_per_year"; currency?: Currency; options: readonly QuestionOption<Cost>[] }
    | { field: "grade"; options: readonly QuestionOption<number>[] }
    | { field: "constraints.can_relocate"; options: readonly QuestionOption<boolean>[] }
    | { field: "constraints.needs_full_funding"; options: readonly QuestionOption<boolean>[] }
    | {
        field: "constraints.max_tuition_per_year";
        currency?: Currency;
        options: readonly QuestionOption<Cost>[];
      }
  );

/** The profile values the selector tries when measuring a question. */
export function candidateValuesOf(question: QuestionDefinition): readonly unknown[] {
  return trialsOf(question).map((change) => change.to);
}

/**
 * Every answer the selector tries when it measures a question.
 *
 * Fixed options become one trial each. A scale becomes three — its ends and its
 * middle — because measuring the influence of a range means asking what changes
 * between a low answer and a high one, and nine separate IELTS bands would cost
 * nine route computations to learn the same thing.
 */
export function trialsOf(question: QuestionDefinition): ProfileChange[] {
  const trials: ProfileChange[] = [];

  for (const option of question.options) {
    const change = changeFor(question, [option.value]);
    if (change !== null) trials.push(change);
  }

  const scale = question.scale;
  if (scale !== undefined) {
    const middle = roundToStep(scale.min + (scale.max - scale.min) / 2, scale);
    for (const value of [scale.min, middle, scale.max]) {
      const change = numericChangeFor(question, value);
      if (change !== null) trials.push(change);
    }
  }

  return trials;
}

/** Keeps a sampled point on the scale's own grid: 5.5, not 5.4999. */
function roundToStep(value: number, scale: QuestionScale): number {
  const steps = Math.round((value - scale.min) / scale.step);
  return Number((scale.min + steps * scale.step).toFixed(2));
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How many questions the interview may ask at most, answered and skipped
 * together. Five to seven is what the product promises; seven is the ceiling
 * that keeps the promise true even when every question turns out to matter.
 */
export const MAX_ADAPTIVE_QUESTIONS = 7;

/**
 * How much a question has to move the board to be worth asking.
 *
 * Two points is one reordering of two doors, or a quarter of one door becoming
 * reachable. Below that the applicant would answer and see the same screen,
 * which is a question that costs attention and returns nothing.
 */
export const QUESTION_INFLUENCE_THRESHOLD = 2;

/**
 * What counts as the board moving, and by how much.
 *
 * Reachability and status are what the applicant can act on: a door they can
 * now enter, a door that shut, a door nobody can date any more. Ordering is
 * weaker but real — the board is read top to bottom, and a different order is a
 * different set of decisions.
 *
 * A match score that moves without changing the order is deliberately worth
 * nothing here. The screen would read identically, and asking another question
 * to produce an identical screen is exactly what this module exists to prevent.
 */
export const INFLUENCE_WEIGHTS = {
  reachability: 4,
  status: 4,
  ordering: 1,
} as const;

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

export interface QuestionSelection {
  question_id: string;
  /** Weighted count of how far the board moves. A ranking key, not a score. */
  influence_score: number;
  /** Programme ids that move under at least one possible answer. */
  affected_program_ids: string[];
  /**
   * Structured codes, never prose: `"reachable:pl-pjatk-cs"`,
   * `"unreachable:kz-nu-cs"`, `"status:closed:us-liberal-arts"`,
   * `"order:kz-aitu-cs"`. The phrasing layer is somebody else's problem.
   */
  strongest_changes: string[];
  /** How many unanswered questions were still in play, including this one. */
  remaining_candidate_questions: number;
}

export interface SelectorOptions {
  /** Excluded exactly like answered ones, so a skip is never re-offered. */
  skippedQuestionIds?: readonly string[];
  /** Defaults to the authored catalogue; tests and future locales pass their own. */
  questions?: readonly QuestionDefinition[];
}

/**
 * The next question, or `null` when the interview should stop.
 *
 * `null` means one of three honest things, and the caller can tell which by
 * looking at what it passed in: the ceiling was reached, every question has
 * been asked or already has an answer in the profile, or the best remaining
 * question would not change what the applicant sees.
 */
export function selectNextQuestion(
  profile: Profile,
  catalog: Catalog,
  answeredQuestionIds: readonly string[],
  today: Iso,
  options: SelectorOptions = {},
): QuestionSelection | null {
  if (!isIsoDate(today)) {
    throw new Error(`selectNextQuestion: "today" is not an ISO date: ${String(today)}`);
  }

  const questions = options.questions ?? QUESTION_CATALOG;
  const skipped = options.skippedQuestionIds ?? [];

  // The ceiling counts every question put in front of the applicant, answered
  // or waved away: both cost attention.
  const asked = new Set([...answeredQuestionIds, ...skipped]);
  if (asked.size >= MAX_ADAPTIVE_QUESTIONS) return null;

  const candidates = questions.filter(
    (question) => !asked.has(question.id) && !isProfileFieldKnown(profile, question.field),
  );
  if (candidates.length === 0) return null;

  const baseline = computeRoute(profile, catalog, today).doors;

  const measured = candidates.map((question) => measure(question, profile, catalog, today, baseline));

  // Most movement first; the authored weight breaks a tie between questions
  // that move the board equally, and the id breaks everything else.
  measured.sort((a, b) => {
    if (a.influence_score !== b.influence_score) return b.influence_score - a.influence_score;
    if (a.importance !== b.importance) return b.importance - a.importance;
    return a.question_id < b.question_id ? -1 : a.question_id > b.question_id ? 1 : 0;
  });

  const best = measured[0];
  if (best === undefined) return null;
  if (best.influence_score < QUESTION_INFLUENCE_THRESHOLD) return null;

  return {
    question_id: best.question_id,
    influence_score: best.influence_score,
    affected_program_ids: best.affected_program_ids,
    strongest_changes: best.strongest_changes,
    remaining_candidate_questions: candidates.length,
  };
}

interface Measured extends QuestionSelection {
  importance: number;
}

/**
 * One question, measured by trying every answer it offers.
 *
 * The influence is the *largest* movement any single answer would cause: a
 * question is worth asking if at least one of its answers changes the board,
 * even when the others would not.
 */
function measure(
  question: QuestionDefinition,
  profile: Profile,
  catalog: Catalog,
  today: Iso,
  baseline: readonly Door[],
): Measured {
  let bestScore = 0;
  let bestChanges: string[] = [];
  const affected = new Set<string>();

  for (const change of trialsOf(question)) {
    const hypothetical = computeRoute(applyProfileChange(profile, change), catalog, today).doors;
    const movement = compareBoards(baseline, hypothetical);

    for (const id of movement.affected) affected.add(id);
    if (movement.score > bestScore) {
      bestScore = movement.score;
      bestChanges = movement.changes;
    }
  }

  return {
    question_id: question.id,
    influence_score: bestScore,
    affected_program_ids: [...affected].sort(compareIds),
    strongest_changes: bestChanges,
    remaining_candidate_questions: 0,
    importance: question.importance ?? 0,
  };
}

interface Movement {
  score: number;
  affected: string[];
  changes: string[];
}

/**
 * How far one board moved from another, in facts the applicant would notice.
 *
 * Status transitions come from the diff engine. Reachability is checked here
 * because it is the only kind of movement a *profile* change can cause: a
 * deadline is a property of the programme, but a blocker is a property of the
 * applicant, and clearing one is what an answer does.
 */
function compareBoards(before: readonly Door[], after: readonly Door[]): Movement {
  const diff = diffDoorSets(before, after);
  const affected = new Set<string>();
  const changes: { code: string; weight: number }[] = [];
  const note = (code: string, weight: number, programId: string): void => {
    changes.push({ code, weight });
    affected.add(programId);
  };

  for (const id of diff.opened) note(`status:opened:${id}`, INFLUENCE_WEIGHTS.status, id);
  for (const id of diff.closed) note(`status:closed:${id}`, INFLUENCE_WEIGHTS.status, id);
  for (const id of [...diff.became_data_missing, ...diff.became_data_available]) {
    note(`status:data:${id}`, INFLUENCE_WEIGHTS.status, id);
  }

  const reachableBefore = reachableIds(before);
  const reachableAfter = reachableIds(after);
  for (const id of reachableAfter) {
    if (!reachableBefore.has(id)) note(`reachable:${id}`, INFLUENCE_WEIGHTS.reachability, id);
  }
  for (const id of reachableBefore) {
    if (!reachableAfter.has(id)) note(`unreachable:${id}`, INFLUENCE_WEIGHTS.reachability, id);
  }

  // The board is read top to bottom, so a different order is a different set of
  // decisions even when every door survives.
  const positionsBefore = new Map(before.map((door, index) => [door.program_id, index]));
  after.forEach((door, index) => {
    const was = positionsBefore.get(door.program_id);
    if (was === undefined || was === index) return;
    note(`order:${door.program_id}`, INFLUENCE_WEIGHTS.ordering, door.program_id);
  });

  const score = changes.reduce((total, change) => total + change.weight, 0);

  // Strongest first, so a caller that shows only the first few shows the ones
  // that matter; the code breaks ties, so the list never shuffles between runs.
  const ordered = [...changes]
    .sort((a, b) => (a.weight !== b.weight ? b.weight - a.weight : compareIds(a.code, b.code)))
    .map((change) => change.code);

  return { score, affected: [...affected].sort(compareIds), changes: ordered };
}

function reachableIds(doors: readonly Door[]): Set<string> {
  return new Set(doors.filter(isDoorReachable).map((door) => door.program_id));
}

/* -------------------------------------------------------------------------- */
/* Answers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The profile as it would be with this answer in it.
 *
 * `value` is whatever the UI produced — an option id, or a list of them for a
 * multi-select. Anything the question does not offer is not applied: an answer
 * the engine cannot make sense of leaves the profile exactly as it was rather
 * than writing a shape the rest of the engine would trip over later. The
 * original profile is never mutated.
 */
export function applyInterviewAnswer(
  profile: Profile,
  question: QuestionDefinition,
  value: unknown,
): Profile {
  // A number is the applicant's own value on a scale — a band, a score, a sum
  // they typed themselves rather than one of our buckets.
  const change =
    typeof value === "number"
      ? numericChangeFor(question, value)
      : changeFor(question, normalizeAnswer(value));
  if (change === null) return profile;
  return applyProfileChange(profile, change);
}

/**
 * A number the applicant chose, as a change to their profile.
 *
 * Only fields that are genuinely measured accept one, and each needs the piece
 * of context the number alone does not carry: which exam the score belongs to,
 * which currency the sum is in. Without that context the answer is dropped
 * rather than guessed at — a score with no exam is not a fact.
 */
function numericChangeFor(question: QuestionDefinition, value: number): ProfileChange | null {
  if (!Number.isFinite(value)) return null;

  const scale = question.scale;
  if (scale !== undefined && (value < scale.min || value > scale.max)) return null;

  switch (question.field) {
    case "exams": {
      if (question.exam_id === undefined) return null;
      return { field: "exams", to: { id: question.exam_id, score: value, status: "taken" } };
    }
    case "budget_per_year": {
      if (question.currency === undefined) return null;
      return { field: "budget_per_year", to: { amount: value, currency: question.currency } };
    }
    case "constraints.max_tuition_per_year": {
      if (question.currency === undefined) return null;
      return {
        field: "constraints.max_tuition_per_year",
        to: { amount: value, currency: question.currency },
      };
    }
    case "grade":
      return { field: "grade", to: Math.round(value) };
    default:
      return null;
  }
}

/** An answer as a list of option ids, whatever the UI handed over. */
function normalizeAnswer(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "boolean") return [value ? "yes" : "no"];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

/**
 * The typed change a set of chosen options stands for, or `null`.
 *
 * Multi-select fields collect every chosen option into one list; the others
 * take the first recognised option and ignore the rest, because a single-choice
 * question cannot mean two things at once.
 */
function changeFor(question: QuestionDefinition, chosen: readonly string[]): ProfileChange | null {
  if (chosen.length === 0) return null;

  switch (question.field) {
    case "interests":
    case "countries": {
      const values = question.options
        .filter((option) => chosen.includes(option.value))
        .map((option) => option.to);
      if (values.length === 0) return null;
      return { field: question.field, to: values };
    }
    case "languages": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined ? null : { field: "languages", to: option.to };
    }
    case "exams": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined ? null : { field: "exams", to: option.to };
    }
    case "budget_per_year": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined ? null : { field: "budget_per_year", to: option.to };
    }
    case "constraints.max_tuition_per_year": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined
        ? null
        : { field: "constraints.max_tuition_per_year", to: option.to };
    }
    case "grade": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined ? null : { field: "grade", to: option.to };
    }
    case "constraints.can_relocate": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined ? null : { field: "constraints.can_relocate", to: option.to };
    }
    case "constraints.needs_full_funding": {
      const option = question.options.find((item) => chosen.includes(item.value));
      return option === undefined
        ? null
        : { field: "constraints.needs_full_funding", to: option.to };
    }
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Catalogue access                                                            */
/* -------------------------------------------------------------------------- */

export function findQuestion(
  questionId: string,
  questions: readonly QuestionDefinition[] = QUESTION_CATALOG,
): QuestionDefinition | undefined {
  return questions.find((question) => question.id === questionId);
}

/** Fields the interview could still fill, in catalogue order. */
export function unknownProfileFields(
  profile: Profile,
  questions: readonly QuestionDefinition[] = QUESTION_CATALOG,
): ProfileField[] {
  const fields: ProfileField[] = [];
  for (const question of questions) {
    if (isProfileFieldKnown(profile, question.field)) continue;
    if (!fields.includes(question.field)) fields.push(question.field);
  }
  return fields;
}

function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
