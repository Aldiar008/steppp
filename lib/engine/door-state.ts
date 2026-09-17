/**
 * What a door's status means, in one place.
 *
 * Three layers ask the same questions of a door — the route when it counts
 * opportunities, the leverage engine when it prices a change, the next-action
 * engine when it decides what to recommend — and the moment any of them answers
 * "is this still possible" on its own, the product has two definitions of
 * possible and starts contradicting itself on screen.
 *
 * Pure predicates over a computed `Door`. No dates are read here and no clock is
 * consulted: every question below is answered by fields the engine already
 * filled in.
 */
import type { Door } from "@/lib/types";

/**
 * Doors the applicant can still act on.
 *
 * `open` and `closing_soon` are the active opportunities; `needs_data` is not
 * one, because a door nobody can date is not a door anybody can plan for, and
 * `closed` is not one for the obvious reason.
 */
export function isActiveDoor(door: Door): boolean {
  return door.status === "open" || door.status === "closing_soon";
}

export function getActiveDoors(doors: readonly Door[]): Door[] {
  return doors.filter(isActiveDoor);
}

/**
 * Doors with nothing at all standing in the way.
 *
 * Status answers "is there still time"; it deliberately says nothing about the
 * applicant, because time and fit are different questions. Reachability is both
 * halves at once: the countdown is still running *and* the match engine found
 * no hard constraint the applicant stated — no missing language of instruction,
 * no unfunded place for somebody who needs a grant.
 *
 * `blockers` is empty exactly when the engine has nothing blocking this door,
 * so this is a fact the engine already computed rather than a second opinion
 * about it. This is the predicate counterfactual analysis counts with: a
 * profile change cannot move a deadline, but it can remove a blocker.
 */
export function isDoorReachable(door: Door): boolean {
  return isActiveDoor(door) && door.explanation_facts.blockers.length === 0;
}

export function getReachableDoors(doors: readonly Door[]): Door[] {
  return doors.filter(isDoorReachable);
}

export function getOpenDoors(doors: readonly Door[]): Door[] {
  return doors.filter((door) => door.status === "open");
}

export function getClosingSoonDoors(doors: readonly Door[]): Door[] {
  return doors.filter((door) => door.status === "closing_soon");
}

export function getClosedDoors(doors: readonly Door[]): Door[] {
  return doors.filter((door) => door.status === "closed");
}

export function getNeedsDataDoors(doors: readonly Door[]): Door[] {
  return doors.filter((door) => door.status === "needs_data");
}
