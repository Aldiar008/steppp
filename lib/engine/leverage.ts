/**
 * Counterfactual analysis: what one change would buy.
 *
 * The question this answers is not "what are you missing" — a list of gaps is
 * something an applicant can already feel, and it helps nobody decide what to
 * do on a Tuesday evening. The question is:
 *
 *     if this one thing were true, how many doors would be standing open?
 *
 * The method is brute force and deliberately so. For each authored candidate
 * the engine applies the change to a copy of the profile, re-runs the *whole*
 * route, and compares the two boards. Nothing here re-implements matching or
 * scheduling, and nothing here estimates: every number is the difference
 * between two full engine runs, and can be reproduced by running them.
 *
 *     baseline profile → baseline route ┐
 *     candidate change → modified route ┘ → diff → doors gained / effort → rank
 *
 * Two properties this module must not lose:
 *
 * - The applicant's profile is never mutated. Every change lands on a fresh
 *   object, so a counterfactual can never leak into the real plan.
 * - A door counts as gained only when the engine shows it reachable on the
 *   modified board and not on the baseline one. Not a higher score, not a
 *   shorter list of unmet requirements, not a probability — a door.
 */
import type { LeverageCandidate } from "@/data/leverage-candidates";
import type { Door, Iso, Leverage, Profile } from "@/lib/types";
import { diffDeadlines } from "./diff";
import { getReachableDoors } from "./door-state";
import { applyProfileChange, readProfileField } from "./profile-patch";
import { computeRoute, type Catalog } from "./route";
import { isIsoDate } from "./schedule";

export type { LeverageCandidate };

/* -------------------------------------------------------------------------- */
/* Counterfactual                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Every candidate, priced against one baseline route.
 *
 * The baseline is computed once; each candidate costs exactly one further route
 * computation. `today` is validated here, like everywhere else in the engine,
 * because a bad day is the caller's error rather than the data's.
 *
 * A candidate the engine cannot apply does not remove the rest of the list: it
 * comes back with nothing gained and the reason recorded, exactly like a
 * catalogue record that cannot be read.
 */
export function computeLeverage(
  profile: Profile,
  catalog: Catalog,
  candidates: readonly LeverageCandidate[],
  today: Iso,
): Leverage[] {
  if (!isIsoDate(today)) {
    throw new Error(`computeLeverage: "today" is not an ISO date: ${String(today)}`);
  }

  const baseline = computeRoute(profile, catalog, today);
  const reachableBefore = new Set(getReachableDoors(baseline.doors).map((d) => d.program_id));

  const results = candidates.map((candidate) =>
    evaluateCandidate(profile, catalog, candidate, today, baseline.doors, reachableBefore),
  );

  return sortLeverage(results);
}

function evaluateCandidate(
  profile: Profile,
  catalog: Catalog,
  candidate: LeverageCandidate,
  today: Iso,
  baselineDoors: readonly Door[],
  reachableBefore: ReadonlySet<string>,
): Leverage {
  let modifiedDoors: readonly Door[];
  let oldValue: unknown;
  let newValue: unknown;
  const insufficient: string[] = [];

  try {
    const modifiedProfile = applyProfileChange(profile, candidate);
    oldValue = readProfileField(profile, candidate);
    newValue = readProfileField(modifiedProfile, candidate);
    modifiedDoors = computeRoute(modifiedProfile, catalog, today).doors;
  } catch (error) {
    // The change cannot be applied, so it buys nothing that can be shown.
    const detail = error instanceof Error ? error.message : String(error);
    return {
      id: candidate.id,
      title: candidate.title,
      changed_field: candidate.field,
      old_value: undefined,
      new_value: candidate.to,
      doors_gained: 0,
      doors_retained: reachableBefore.size,
      doors_delta: 0,
      reopened_doors: [],
      lost_doors: [],
      effort_minutes: candidate.effort_minutes,
      efficiency: 0,
      insufficient_data: [`change_not_applicable: ${detail}`],
      deadline_impacts: [],
    };
  }

  /* Reachability, both boards. Order follows the boards themselves, which are
     already in a total order, so these lists never shuffle between runs. */
  const reachableAfter = getReachableDoors(modifiedDoors).map((door) => door.program_id);
  const gained = reachableAfter.filter((id) => !reachableBefore.has(id));
  const retained = reachableAfter.filter((id) => reachableBefore.has(id));
  const stillReachable = new Set(reachableAfter);
  const lost = baselineDoors
    .map((door) => door.program_id)
    .filter((id) => reachableBefore.has(id) && !stillReachable.has(id));

  const effort = candidate.effort_minutes;
  let efficiency = 0;
  if (typeof effort !== "number" || !Number.isFinite(effort)) {
    insufficient.push("effort_minutes_missing");
  } else if (effort <= 0) {
    // Zero is a fact about the change, not a gap in the data — but it still
    // cannot be divided by, so the candidate is ranked on doors alone.
    insufficient.push("effort_minutes_zero");
  } else {
    efficiency = gained.length / effort;
  }

  const leverage: Leverage = {
    id: candidate.id,
    title: candidate.title,
    changed_field: candidate.field,
    old_value: oldValue,
    new_value: newValue,
    doors_gained: gained.length,
    doors_retained: retained.length,
    doors_delta: reachableAfter.length - reachableBefore.size,
    // The doors behind `doors_gained`: each was blocked or out of time before
    // the change and stands open after it.
    reopened_doors: gained,
    lost_doors: lost,
    effort_minutes: effort,
    efficiency,
    insufficient_data: insufficient,
    // Shared with the diff engine, so "this date moved" has one implementation.
    // As the engine stands this is always empty: the reverse planner is a
    // function of the programme and the action catalogue, never of the profile.
    // The comparison stays for the day the schedule starts taking finished
    // steps into account — an empty list is the honest answer until then.
    deadline_impacts: diffDeadlines(baselineDoors, modifiedDoors),
  };
  if (candidate.preparation_days !== undefined) {
    leverage.preparation_days = candidate.preparation_days;
  }
  return leverage;
}

/* -------------------------------------------------------------------------- */
/* Ranking                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Doors first, then doors per minute.
 *
 * Effort breaks a tie between two changes that buy the same doors at the same
 * rate, and the id breaks everything else, so the list is a total order and two
 * identical candidates always land in the same sequence.
 */
function sortLeverage(items: readonly Leverage[]): Leverage[] {
  return [...items].sort((a, b) => {
    if (a.doors_gained !== b.doors_gained) return b.doors_gained - a.doors_gained;
    if (a.efficiency !== b.efficiency) return b.efficiency - a.efficiency;
    if (a.effort_minutes !== b.effort_minutes) return a.effort_minutes - b.effort_minutes;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * The few changes worth putting in front of somebody.
 *
 * Only changes that actually add doors *and* do not cost doors elsewhere are
 * offered. A change that opens two routes while closing three is kept in the
 * full result — an applicant may still want to know — but it is not a
 * recommendation, and presenting it as one would be the kind of lie the rest of
 * this engine exists to avoid. With nothing that helps, the honest answer is an
 * empty list.
 *
 * The input is re-ranked rather than trusted to arrive in order, so the top
 * three are the top three whatever the caller did with the array first.
 */
export function getTopLeverage(leverage: readonly Leverage[], limit = 3): Leverage[] {
  return sortLeverage(leverage)
    .filter((item) => item.doors_gained > 0 && item.doors_delta > 0)
    .slice(0, Math.max(0, limit));
}
