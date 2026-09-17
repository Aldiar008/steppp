/**
 * Stepwise core domain model.
 *
 * The unit of the product is a *door*: an admission route that is still open
 * and has an expiry date. Everything here exists to answer three questions
 * honestly — what is still open, when does it stop being physically reachable,
 * and what has to happen now to keep it reachable.
 *
 * Two rules are encoded in the shapes below:
 *
 * 1. A date is never a bare string. It is a `DateFact`, so every day the
 *    product shows can be traced back to a source and a confidence level.
 *    No field here may ever hold a model-produced date.
 * 2. `Door.score` is a *match* score. It is not a probability, not an
 *    admission chance and not a likelihood, and nothing may rename it so.
 *
 * Field naming follows the data layer (snake_case), because these records are
 * authored as catalogue data and carry `source_id` back to the crawl.
 *
 * Note for later stages: `types/domain.ts` holds the first-generation model
 * behind the current screens. This module is the model the new engine builds
 * on; the two are kept apart deliberately and share only `Iso`.
 */
import type { Iso } from "@/types/domain";

/** Calendar date, always "YYYY-MM-DD". Never a locale-formatted string. */
export type { Iso };

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How much a fact can be trusted.
 *
 * `verified` — a source states it and a human wrote down where.
 * `derived` — computed from a verified fact by a rule the product publishes.
 *   The catalogue's commonest case: a university states "1 ноября" without a
 *   year, and the year follows from which intake is being planned. The day and
 *   month are the source's; the year is ours, and saying so is the difference
 *   between a fact and a plausible number.
 * `last_cycle` — taken from the previous intake, plausible but not confirmed.
 * `demo` — seed data for development. The UI has to say so.
 */
export type Confidence = "verified" | "derived" | "last_cycle" | "demo";

/** A date that knows where it came from. */
export interface DateFact {
  date: Iso;
  confidence: Confidence;
  source_id: string;
  /** When the source was last checked. */
  checked_at: Iso;
}

export type Currency = "KZT" | "USD" | "EUR";

/**
 * Where a fact came from, resolvable from any `source_id`.
 *
 * `url` and `accessed_at` are optional because they are *earned*: a record only
 * carries them once a human has opened the page and written down what they saw.
 * A demo record has neither, and the product says so rather than linking
 * somewhere plausible. An invented URL is worse than no URL — it looks checked.
 */
export interface Source {
  id: string;
  title: string;
  publisher: string;
  url?: string;
  /** The day a human last opened it. Absent means nobody has. */
  accessed_at?: Iso;
  confidence: Confidence;
  note?: string;
}

export interface Cost {
  amount: number;
  currency: Currency;
}

/* -------------------------------------------------------------------------- */
/* Requirements                                                                */
/* -------------------------------------------------------------------------- */

export type RequirementKind =
  | "exam"
  | "language"
  | "document"
  | "academic"
  | "profile"
  | "other";

/** One condition a programme places on an applicant. */
export interface Requirement {
  id: string;
  kind: RequirementKind;
  label: string;
  /** Threshold or expected value, e.g. 6.5 for IELTS, true for a document. */
  value?: string | number | boolean;
  required: boolean;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export type ActionKind =
  | "exam_registration"
  | "exam"
  | "language_test"
  | "document"
  | "application"
  | "preparation";

/**
 * One physical move on the way to an application, and the unit reverse
 * planning walks over.
 *
 * `hard_deadline` is the last date the step itself may be finished.
 * `duration_days` is the time that has to be reserved for the step *before*
 * whatever comes next can start, so the last day it can still be started is
 * `latest_finish - duration_days`.
 *
 * `duration_days` is optional in the type only to express *unknown*. An
 * instantaneous step must declare `duration_days: 0` explicitly — the engine
 * never reads a missing duration as zero, it reports `needs_data`.
 *
 * `depends_on` lists steps that must be finished before this one starts.
 * `unlocks` is the same edge read forwards, and is what later stages use to
 * explain what a single action buys.
 */
export interface ActionStep {
  id: string;
  title: string;
  kind: ActionKind;

  hard_deadline?: DateFact;
  duration_days?: number;
  depends_on: string[];

  effort_minutes: number;

  cost?: Cost;

  unlocks: string[];

  source_id: string;
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

export type ExamStatus = "planned" | "registered" | "taken" | "completed";

export interface ProfileLanguage {
  /** ISO 639-1 where one exists, e.g. "kk", "ru", "en". */
  code: string;
  /** CEFR band or test band as written on the certificate. */
  level?: string;
  score?: number;
}

export interface ProfileExam {
  /** Matches the `ActionStep.id` / `Requirement.id` of the exam it refers to. */
  id: string;
  score?: number;
  status: ExamStatus;
}

export interface ProfileConstraints {
  can_relocate?: boolean;
  needs_full_funding?: boolean;
  max_tuition_per_year?: Cost;
}

/** What the applicant told us. Everything optional here is genuinely unknown. */
export interface Profile {
  grade?: number;
  age?: number;

  interests: string[];

  /** Country codes or names the applicant is aiming at. */
  countries: string[];

  budget_per_year?: Cost;

  languages: ProfileLanguage[];

  exams: ProfileExam[];

  constraints: ProfileConstraints;
}

/* -------------------------------------------------------------------------- */
/* Programme                                                                   */
/* -------------------------------------------------------------------------- */

export type Funding = "state_grant" | "full_scholarship" | "partial" | "none";

/** A price that carries its own provenance, like every other fact. */
export interface TuitionFact {
  amount: number;
  currency: Currency;
  confidence: Confidence;
  source_id: string;
}

export interface Program {
  id: string;
  name: string;
  org: string;
  country: string;
  /** Where it physically is. Shown, never reasoned about. */
  city?: string;
  level: "bachelor";

  fields: string[];

  language: string[];

  /**
   * Absent when the university does not publish a figure.
   *
   * Most of them do not, and an absent price is a fact about the catalogue
   * rather than a hole in it: the engine reports that it cannot compare rather
   * than comparing against a number somebody made up.
   */
  tuition_per_year?: TuitionFact;

  funding: Funding[];

  requirements: Requirement[];

  /** Ids of the obligatory steps, in the order a human would read them. */
  action_chain: string[];

  /**
   * Absent when no submission deadline could be read from the source.
   *
   * Some universities publish "dates differ by programme" and nothing else.
   * The door then has no point of no return and says so — `needs_data` is the
   * honest answer, and it is better than a date nobody can stand behind.
   */
  application_deadline?: DateFact;

  /** The page a person can open to check any of this. */
  official_url?: string;

  /**
   * How well the record as a whole is sourced.
   *
   * A door rests on several facts, and this is the one that covers the record
   * itself — used when a programme has no dated fact of its own to be judged
   * by. Absent means nobody vouched for it: `demo`.
   */
  confidence?: Confidence;

  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* Door                                                                        */
/* -------------------------------------------------------------------------- */

export type DoorStatus = "open" | "closing_soon" | "closed" | "needs_data";

/**
 * A programme plus what the engine worked out about it.
 *
 * `point_of_no_return` is the last day the applicant can still start the
 * binding step and physically make the deadline. It is absent — never guessed —
 * when the data does not support computing it.
 */
export interface Door {
  program_id: string;

  status: DoorStatus;

  point_of_no_return?: Iso;

  days_remaining?: number;

  next_critical_action_id?: string;

  action_chain: string[];

  matched_requirements: string[];
  unmatched_requirements: string[];

  /**
   * How well the profile matches the programme's stated requirements.
   * A match score — not a probability, chance or likelihood of admission.
   */
  score: number;

  /** The weakest confidence among the facts this door was computed from. */
  confidence: Confidence;

  /** Plain, already-known facts the explanation layer may phrase. */
  explanation_facts: {
    reasons: string[];
    blockers: string[];
  };
}

/* -------------------------------------------------------------------------- */
/* Forward-looking shapes                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A point of no return that moved between two engine runs.
 *
 * `delta_days` is present only when both dates exist and are real calendar
 * dates; positive means the last day to act moved later. A date that appeared
 * or disappeared has no delta, because there is nothing to subtract.
 */
export interface DeadlineImpact {
  program_id: string;
  old_date?: Iso;
  new_date?: Iso;
  delta_days?: number;
}

/**
 * One change to the profile, priced by what it buys per minute of effort.
 *
 * Every number here is the difference between two full engine runs — the route
 * as it stands and the route with this one change applied. Nothing is
 * estimated, nothing is a probability, and a door only counts once the engine
 * can show it standing open on the counterfactual board.
 */
export interface Leverage {
  id: string;
  title: string;
  changed_field: string;
  old_value: unknown;
  new_value: unknown;

  /** Doors reachable after the change that were not reachable before. */
  doors_gained: number;
  /** Doors that were reachable before and still are. */
  doors_retained: number;
  /** `doors_gained` minus what the change costs. Negative when it costs more. */
  doors_delta: number;

  /** The programme ids behind `doors_gained`. */
  reopened_doors: string[];
  /** Doors that were reachable before the change and are not after it. */
  lost_doors: string[];

  effort_minutes: number;
  /** Calendar time the change itself needs, when the data states one. */
  preparation_days?: number;

  /**
   * `doors_gained` per minute of effort, or `0` when effort cannot be divided
   * by. Never a probability and never a rating — only a ranking key.
   */
  efficiency: number;
  /** Why `efficiency` could not be computed, e.g. `"effort_minutes_zero"`. */
  insufficient_data: string[];

  deadline_impacts: DeadlineImpact[];
}

/* -------------------------------------------------------------------------- */
/* Next action                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How close the step is to being unrecoverable.
 *
 * Bands come from the schedule engine's own threshold, never from a second set
 * of numbers invented here.
 */
export type ActionUrgency = "critical" | "soon" | "planned";

/** Which rule picked this step over the next-best one. */
export type NextActionReason =
  | "nearest_deadline"
  | "holds_most_doors"
  | "critical_for_multiple_doors"
  | "lowest_effort";

/**
 * The single next move, as facts.
 *
 * There is exactly one of these, because a list of ten tasks is the problem an
 * applicant already has. Nothing here is phrasing — no "тебе стоит", no advice.
 * `affected_doors` carries real `Program.id`s taken from the computed board, so
 * "удерживает 4 двери" is a count of named doors and not a turn of phrase.
 */
export interface NextActionResult {
  action_id: string;
  title: string;

  /** Last day the step can still be started, when the board proves one. */
  due_date?: Iso;
  /** Whole days from today to `due_date`. Negative means already missed. */
  days_remaining?: number;

  /** Present when the catalogue states a usable figure. */
  effort_minutes?: number;

  affected_doors: string[];
  affected_doors_count: number;

  urgency: ActionUrgency;
  reason_code: NextActionReason;
}

/** A door's binding step, before and after. Absent on either side means none. */
export interface NextActionChange {
  program_id: string;
  old_action_id?: string;
  new_action_id?: string;
}

/** A match score that moved. A score, never a probability of admission. */
export interface ScoreChange {
  program_id: string;
  old_score: number;
  new_score: number;
}

/**
 * What moved between two engine runs. Ids are `Program.id`, always sorted.
 *
 * Doors are matched by id and never by position, so a board that reordered
 * itself — which it does, since the board is sorted by urgency — produces no
 * false movement.
 *
 * `changed` and `unchanged` partition the doors present on both boards:
 * everything that differs in a way the product cares about is `changed`, and
 * the other lists say *how* it differs. A door can therefore appear in both
 * `changed` and `opened`, which is the same door described twice, not twice.
 *
 * `needs_data` is deliberately never folded into `opened` or `closed` alone:
 * learning that a date cannot be computed is not the same event as a route
 * shutting, and an applicant told the wrong one of those plans badly.
 */
export interface DiffResult {
  /** Was unreachable in time, is active now: `closed`/`needs_data` → active. */
  opened: string[];
  /** Was active, is out of time now: active → `closed`. */
  closed: string[];

  unchanged: string[];
  /** Every door present on both boards whose significant state differs. */
  changed: string[];

  /** Present only on the new board. */
  added: string[];
  /** Present only on the old board. */
  removed: string[];

  /** Anything → `needs_data`: the engine lost the ability to date this door. */
  became_data_missing: string[];
  /** `needs_data` → anything: the door can be dated again. */
  became_data_available: string[];

  deadline_changes: DeadlineImpact[];
  score_changes: ScoreChange[];
  next_action_changes: NextActionChange[];
}

/**
 * A whole-route diff: the door movement plus the single next step.
 *
 * It states only *that* the recommended step changed, never why — the reason is
 * a separate, later concern and a guess about it would not be a fact.
 */
export interface RouteDiff extends DiffResult {
  next_action_changed: boolean;
  old_next_action_id?: string;
  new_next_action_id?: string;
}
