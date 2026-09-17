/**
 * The one thing to do next.
 *
 * A board of doors answers "what is still possible". It does not answer the
 * question somebody actually asks at eleven at night in November, which is
 * "so what do I do now" — and answering that with a list of ten tasks is the
 * same as not answering it. This module returns exactly one step, or nothing.
 *
 *     active doors → their obligatory chains → drop what is done
 *                 → rank → one step, with the doors it holds
 *
 * Everything it says is taken from the computed board:
 *
 * - Candidates come from `Door.action_chain`, not from the raw action
 *   catalogue. A step nobody's route obliges is not work, however real it is.
 * - "Holds N doors" counts named programmes from that same board, so the number
 *   can always be listed back.
 * - Urgency uses the schedule engine's own threshold. There is no second set of
 *   magic numbers here deciding what "soon" means.
 *
 * The engine keeps no state, so it cannot know what the applicant has already
 * done; whoever does know passes `completedActionIds` in. Absent that, nothing
 * is assumed to be finished.
 *
 * No phrasing, no advice, no probability. Facts, and a caller that renders them.
 */
import { daysBetween } from "@/lib/date";
import type {
  ActionStep,
  ActionUrgency,
  Door,
  Iso,
  NextActionResult,
  NextActionReason,
} from "@/lib/types";
import { getActiveDoors } from "./door-state";
import { isIsoDate, statusFor } from "./schedule";

/** Everything known about one candidate step, before ranking. */
interface Candidate {
  action_id: string;
  action: ActionStep;
  /** The step is the binding constraint of at least one active door. */
  binding: boolean;
  binding_doors: number;
  /** Active doors whose obligatory chain contains this step. */
  affected: string[];
  due?: Iso;
  days?: number;
  effort?: number;
}

const NOTHING_COMPLETED: ReadonlySet<string> = new Set<string>();

/**
 * One step, or `null`.
 *
 * `null` is returned whenever the board cannot prove a move: no active doors at
 * all, every chain already done, or a chain naming steps the action catalogue
 * does not hold. Inventing something for the applicant to do would be worse
 * than saying nothing, because they would go and do it.
 *
 * `today` is optional and only sharpens the answer: a step that binds a door
 * already carries that door's countdown, computed with the same day the board
 * was. It is needed only to date a step that the board does not bind, and in
 * its absence such a step is reported as dated but not as urgent.
 */
export function computeNextBestAction(
  doors: readonly Door[],
  actionsById: Record<string, ActionStep>,
  completedActionIds: ReadonlySet<string> = NOTHING_COMPLETED,
  today?: Iso,
): NextActionResult | null {
  const active = getActiveDoors(doors);
  if (active.length === 0) return null;

  /* Candidates: every step an active route obliges, in board order, once. */
  const candidateIds: string[] = [];
  for (const door of active) {
    for (const actionId of door.action_chain) {
      if (!candidateIds.includes(actionId)) candidateIds.push(actionId);
    }
  }

  const candidates: Candidate[] = [];
  for (const actionId of candidateIds) {
    if (completedActionIds.has(actionId)) continue;

    // A step the catalogue cannot show is a step the engine will not name.
    const action = actionsById[actionId];
    if (action === undefined) continue;

    candidates.push(describe(actionId, action, active, today));
  }
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort(compareCandidates);
  const winner = ranked[0];
  if (winner === undefined) return null;

  return toResult(winner, ranked[1]);
}

/** One candidate, measured against the board. */
function describe(
  actionId: string,
  action: ActionStep,
  active: readonly Door[],
  today: Iso | undefined,
): Candidate {
  // `action_chain` is the runtime source of truth: the schedule engine already
  // walked `depends_on` and `unlocks` to decide what each programme obliges, so
  // a door carrying this step in its chain is a door this step holds.
  const affected = active
    .filter((door) => door.action_chain.includes(actionId))
    .map((door) => door.program_id);

  const bound = active.filter((door) => door.next_critical_action_id === actionId);

  const candidate: Candidate = {
    action_id: actionId,
    action,
    binding: bound.length > 0,
    binding_doors: bound.length,
    affected,
  };

  if (bound.length > 0) {
    // For a binding step the door's point of no return *is* the last day this
    // step can be started, and the door's countdown was computed against the
    // same day the board was. Both are taken from the tightest door.
    for (const door of bound) {
      const date = door.point_of_no_return;
      if (date !== undefined && (candidate.due === undefined || date < candidate.due)) {
        candidate.due = date;
        if (door.days_remaining !== undefined) candidate.days = door.days_remaining;
      }
    }
  } else {
    // Otherwise the only date the data states about this step is its own cap.
    const hard = action.hard_deadline?.date;
    if (hard !== undefined && isIsoDate(hard)) {
      candidate.due = hard;
      if (today !== undefined && isIsoDate(today)) candidate.days = daysBetween(today, hard);
    }
  }

  if (typeof action.effort_minutes === "number" && Number.isFinite(action.effort_minutes)) {
    candidate.effort = action.effort_minutes;
  }

  return candidate;
}

/**
 * Ranking, in tiers, with every tie broken.
 *
 * 1. A binding step first. It is the constraint that decides a door's point of
 *    no return, so it is the only kind of step whose slipping costs a door.
 * 2. Then the earliest last-day-to-start, because that is the one that stops
 *    being possible first.
 * 3. Then the step that holds more doors.
 * 4. Then the cheaper one in minutes.
 * 5. Then the lower id, so the answer never depends on iteration order.
 *
 * Urgency is descriptive and deliberately absent from this list: it is derived
 * from the same dates as tier 2, and using it here would count them twice.
 */
function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.binding !== b.binding) return a.binding ? -1 : 1;

  const byDate = compareDates(a.due, b.due);
  if (byDate !== 0) return byDate;

  if (a.affected.length !== b.affected.length) return b.affected.length - a.affected.length;

  const byEffort = compareEfforts(a.effort, b.effort);
  if (byEffort !== 0) return byEffort;

  return a.action_id < b.action_id ? -1 : a.action_id > b.action_id ? 1 : 0;
}

/** Earlier first; an undated step sorts after every dated one. */
function compareDates(a: Iso | undefined, b: Iso | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a < b ? -1 : 1;
}

/** Cheaper first; an unpriced step sorts after every priced one. */
function compareEfforts(a: number | undefined, b: number | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

function toResult(winner: Candidate, runnerUp: Candidate | undefined): NextActionResult {
  const result: NextActionResult = {
    action_id: winner.action_id,
    title: winner.action.title,
    affected_doors: winner.affected,
    affected_doors_count: winner.affected.length,
    urgency: urgencyOf(winner),
    reason_code: reasonFor(winner, runnerUp),
  };
  if (winner.due !== undefined) result.due_date = winner.due;
  if (winner.days !== undefined) result.days_remaining = winner.days;
  if (winner.effort !== undefined) result.effort_minutes = winner.effort;
  return result;
}

/**
 * How close the step is to being unrecoverable.
 *
 * The bands are the schedule engine's own: `statusFor` already decides when a
 * countdown is closing, and reusing it means the product cannot tell somebody a
 * door is closing while calling the step that holds it merely planned.
 *
 * A step on a route that shuts within the fortnight is critical regardless of
 * its own date — the whole chain goes with the door.
 */
function urgencyOf(candidate: Candidate): ActionUrgency {
  if (candidate.days !== undefined) {
    return statusFor(candidate.days) === "open" ? "soon" : "critical";
  }
  return candidate.due !== undefined ? "soon" : "planned";
}

/**
 * Which rule actually picked this step.
 *
 * Derived by comparing the winner with the runner-up tier by tier, so the code
 * names the reason this step won rather than a reason somebody liked. With a
 * single candidate there is nothing it beat, so the code describes what the
 * step is.
 */
function reasonFor(winner: Candidate, runnerUp: Candidate | undefined): NextActionReason {
  if (runnerUp === undefined) return intrinsicReason(winner);

  if (winner.binding !== runnerUp.binding) {
    return winner.binding_doors > 1 ? "critical_for_multiple_doors" : "nearest_deadline";
  }
  if (compareDates(winner.due, runnerUp.due) !== 0) return "nearest_deadline";
  if (winner.affected.length !== runnerUp.affected.length) return "holds_most_doors";
  if (compareEfforts(winner.effort, runnerUp.effort) !== 0) return "lowest_effort";

  return intrinsicReason(winner);
}

function intrinsicReason(candidate: Candidate): NextActionReason {
  if (candidate.binding_doors > 1) return "critical_for_multiple_doors";
  if (candidate.due !== undefined) return "nearest_deadline";
  if (candidate.affected.length > 1) return "holds_most_doors";
  return "lowest_effort";
}
