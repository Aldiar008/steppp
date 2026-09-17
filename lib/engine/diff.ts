/**
 * What changed between two runs of the engine.
 *
 * An applicant edits one field and the whole board moves. Telling them
 * "пересчитано" is useless; telling them "две двери закрылись, одна открылась,
 * у трёх сдвинулся срок" is the entire value of having an engine at all.
 *
 *     before route ┐
 *                  ├→ match doors by program_id → status / date / step / score
 *     after route  ┘                                      ↓
 *                                                     DiffResult
 *
 * Three rules hold here:
 *
 * 1. Doors are matched by `program_id`, never by position. The board sorts
 *    itself by urgency, so positions move on their own and comparing index to
 *    index would invent changes that did not happen.
 * 2. This module states facts and never explains them. "Budget opened these
 *    three" is a claim about causation that two door arrays cannot support;
 *    everything here is a transition somebody can check.
 * 3. Nothing is mutated, nothing is generated, nothing is sorted by anything
 *    but the id. The same two boards always produce the same bytes.
 */
import { daysBetween } from "@/lib/date";
import type {
  DeadlineImpact,
  DiffResult,
  Door,
  DoorStatus,
  NextActionChange,
  RouteDiff,
  ScoreChange,
} from "@/lib/types";
import type { RouteResult } from "./route";
import { isIsoDate } from "./schedule";

/* -------------------------------------------------------------------------- */
/* Door sets                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Two boards, compared door by door.
 *
 * Both inputs are read-only and stay exactly as they were: every array in the
 * result is built fresh and sorted by `program_id`, so the output is stable
 * across runs, across machines and across whatever order the caller happened to
 * hand the doors over in.
 */
export function diffDoorSets(before: readonly Door[], after: readonly Door[]): DiffResult {
  const beforeById = indexDoors(before);
  const afterById = indexDoors(after);

  const opened: string[] = [];
  const closed: string[] = [];
  const unchanged: string[] = [];
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  const becameDataMissing: string[] = [];
  const becameDataAvailable: string[] = [];
  const deadlineChanges: DeadlineImpact[] = [];
  const scoreChanges: ScoreChange[] = [];
  const nextActionChanges: NextActionChange[] = [];

  for (const [id, beforeDoor] of beforeById) {
    const afterDoor = afterById.get(id);
    if (afterDoor === undefined) {
      removed.push(id);
      continue;
    }

    /* Status transitions. A door that becomes undatable is reported as exactly
       that and never as a closure: "this shut" and "we no longer know when this
       shuts" are different pieces of news. */
    if (beforeDoor.status !== afterDoor.status) {
      if (afterDoor.status === "needs_data") becameDataMissing.push(id);
      if (beforeDoor.status === "needs_data") becameDataAvailable.push(id);

      if (isActive(afterDoor.status) && !isActive(beforeDoor.status)) opened.push(id);
      if (afterDoor.status === "closed" && isActive(beforeDoor.status)) closed.push(id);
    }

    if (beforeDoor.point_of_no_return !== afterDoor.point_of_no_return) {
      deadlineChanges.push(deadlineChange(id, beforeDoor, afterDoor));
    }

    if (beforeDoor.score !== afterDoor.score) {
      scoreChanges.push({ program_id: id, old_score: beforeDoor.score, new_score: afterDoor.score });
    }

    if (beforeDoor.next_critical_action_id !== afterDoor.next_critical_action_id) {
      const change: NextActionChange = { program_id: id };
      if (beforeDoor.next_critical_action_id !== undefined) {
        change.old_action_id = beforeDoor.next_critical_action_id;
      }
      if (afterDoor.next_critical_action_id !== undefined) {
        change.new_action_id = afterDoor.next_critical_action_id;
      }
      nextActionChanges.push(change);
    }

    if (significantSignature(beforeDoor) === significantSignature(afterDoor)) unchanged.push(id);
    else changed.push(id);
  }

  for (const id of afterById.keys()) if (!beforeById.has(id)) added.push(id);

  return {
    opened: sortIds(opened),
    closed: sortIds(closed),
    unchanged: sortIds(unchanged),
    changed: sortIds(changed),
    added: sortIds(added),
    removed: sortIds(removed),
    became_data_missing: sortIds(becameDataMissing),
    became_data_available: sortIds(becameDataAvailable),
    deadline_changes: sortByProgram(deadlineChanges),
    score_changes: sortByProgram(scoreChanges),
    next_action_changes: sortByProgram(nextActionChanges),
  };
}

/**
 * Points of no return that moved between two boards.
 *
 * Shared with the leverage engine, which asks the same question about a
 * counterfactual board, so there is one implementation of "this date moved"
 * rather than two that can drift apart.
 */
export function diffDeadlines(
  before: readonly Door[],
  after: readonly Door[],
): DeadlineImpact[] {
  const afterById = indexDoors(after);

  const impacts: DeadlineImpact[] = [];
  for (const [id, door] of indexDoors(before)) {
    const next = afterById.get(id);
    if (next === undefined) continue;
    if (door.point_of_no_return === next.point_of_no_return) continue;
    impacts.push(deadlineChange(id, door, next));
  }
  return sortByProgram(impacts);
}

function deadlineChange(programId: string, before: Door, after: Door): DeadlineImpact {
  const impact: DeadlineImpact = { program_id: programId };

  const oldDate = before.point_of_no_return;
  const newDate = after.point_of_no_return;
  if (oldDate !== undefined) impact.old_date = oldDate;
  if (newDate !== undefined) impact.new_date = newDate;

  // Subtracting is only honest when both sides are real calendar dates; a date
  // that appeared or vanished has no delta, and a malformed one has no meaning.
  if (oldDate !== undefined && newDate !== undefined && isIsoDate(oldDate) && isIsoDate(newDate)) {
    impact.delta_days = daysBetween(oldDate, newDate);
  }
  return impact;
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The door diff plus the one step the applicant was told to take.
 *
 * `next_action_changed` compares ids and nothing else: an action that is the
 * same step described differently is the same step, and an action that
 * disappeared is a change from an id to nothing.
 */
export function diffRoutes(before: RouteResult, after: RouteResult): RouteDiff {
  const oldId = before.next_action?.action_id;
  const newId = after.next_action?.action_id;

  const diff: RouteDiff = {
    ...diffDoorSets(before.doors, after.doors),
    next_action_changed: oldId !== newId,
  };
  if (oldId !== undefined) diff.old_next_action_id = oldId;
  if (newId !== undefined) diff.new_next_action_id = newId;

  return diff;
}

/* -------------------------------------------------------------------------- */
/* Comparison rules                                                            */
/* -------------------------------------------------------------------------- */

function isActive(status: DoorStatus): boolean {
  return status === "open" || status === "closing_soon";
}

/**
 * The state of a door the product actually reasons about.
 *
 * Included: the status, the last day to act, the binding step, the match score,
 * what blocks the door, which requirements are covered, the obligatory chain
 * and how well the whole thing is sourced.
 *
 * Deliberately excluded:
 *
 * - `days_remaining`, which is the point of no return counted from today. A
 *   diff taken a day later would otherwise mark every door as changed while
 *   nothing about any door had changed.
 * - `explanation_facts.reasons`, which restates facts already compared above.
 *   Wording is not state, and a re-worded reason is not news.
 */
function significantSignature(door: Door): string {
  return JSON.stringify([
    door.status,
    door.point_of_no_return ?? null,
    door.next_critical_action_id ?? null,
    door.score,
    door.confidence,
    door.action_chain,
    door.matched_requirements,
    door.unmatched_requirements,
    door.explanation_facts.blockers,
  ]);
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Doors by id. The first entry for an id wins, as everywhere in the engine. */
function indexDoors(doors: readonly Door[]): Map<string, Door> {
  const index = new Map<string, Door>();
  for (const door of doors) if (!index.has(door.program_id)) index.set(door.program_id, door);
  return index;
}

/** Plain code-point order: `localeCompare` depends on the host's locale data. */
function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sortIds(ids: readonly string[]): string[] {
  return [...ids].sort(compareIds);
}

function sortByProgram<T extends { program_id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareIds(a.program_id, b.program_id));
}
