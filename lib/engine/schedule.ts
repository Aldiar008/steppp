/**
 * Reverse planning.
 *
 * Forward planning asks "when is the deadline". That is the question a
 * calendar answers and it is useless on its own: by the time an applicant sees
 * a January deadline, the November registration that feeds it is already gone.
 *
 * Reverse planning asks the only question that matters — "what is the last day
 * I can still start this and physically make it". It starts at the application
 * deadline and walks the obligatory chain backwards:
 *
 *     application deadline
 *       ← waiting for the SAT score
 *         ← the SAT sitting
 *           ← SAT registration
 *
 * Every step gets a `latest_finish` (the earliest cap among the application
 * deadline, its own hard deadline, and the latest start of everything that
 * waits on it) and a `latest_start` (`latest_finish - duration_days`). The
 * earliest `latest_start` across the whole chain is the point of no return.
 *
 * Two properties this module must never lose:
 *
 * - It is pure and deterministic. No clock, no network, no React, no model.
 *   `today` is passed in so every screen and every test agree on the same day.
 * - It never invents a date. A missing duration is *unknown*, not zero; a
 *   missing action is *unknown*, not skipped. Anything unknown makes the whole
 *   result `needs_data` and names what is missing, because a plausible-looking
 *   wrong date is worse to an applicant than an honest gap.
 */
import { addDays, daysBetween, isBefore, parseIso, toIso } from "@/lib/date";
import type { ActionStep, Iso, Program } from "@/lib/types";

/**
 * How close the point of no return has to be before a door counts as closing.
 * Matches `CRITICAL_DAYS` in the first-generation engine, so the two cannot
 * tell an applicant different things about the same date.
 */
export const CLOSING_SOON_DAYS = 14;

export type ScheduleStatus = "open" | "closing_soon" | "closed" | "needs_data";

/** One obligatory step, placed on the calendar. */
export interface ScheduleChainEntry {
  action_id: string;
  /** Last day the step can still be started. Absent when it is not computable. */
  latest_start_date?: Iso;
  /** The step's own hard cap, when the data declares one. */
  hard_deadline?: Iso;
}

export interface ScheduleResult {
  status: ScheduleStatus;

  /** Last day the whole pathway is still achievable. */
  point_of_no_return?: Iso;

  /** Whole days from `today` to the point of no return. Negative means missed. */
  days_remaining?: number;

  /** The step that defines the point of no return, and so the one to do next. */
  critical_action_id?: string;

  /** The obligatory chain, earliest latest-start first. */
  chain: ScheduleChainEntry[];

  /**
   * What stopped an honest calculation, as dotted paths rooted at the id they
   * concern: `"sat_reg"` (no such action), `"sat_reg.duration_days"` (unknown
   * duration), `"sat_exam.hard_deadline"` (unusable date),
   * `"sat_exam.depends_on"` (the dependency graph cycles through this step),
   * `"program.application_deadline"`.
   */
  missing_data: string[];
}

/** True for a real calendar date written as "YYYY-MM-DD", leap years included. */
export function isIsoDate(value: unknown): value is Iso {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Round-tripping rejects days that do not exist: 2027-02-29 normalises to
  // 2027-03-01 and so fails, while 2028-02-29 survives untouched.
  return toIso(parseIso(value)) === value;
}

/**
 * The last day a step can be started, given the last day it must be finished.
 *
 * `duration_days` is an offset in days, not a count of working days: a step
 * that must be finished on the 15th and takes 14 days has to begin on the 1st.
 */
export function computeLatestStartDate(latestFinish: Iso, durationDays: number): Iso {
  return addDays(latestFinish, -durationDays);
}

/**
 * Walks `program.action_chain` backwards from the application deadline.
 *
 * `actionsById` is the catalogue of steps; anything the chain references and
 * the catalogue does not hold is reported rather than skipped. `today` must be
 * an ISO date — it is an argument the caller controls, so a bad one is a
 * programming error and throws, unlike bad catalogue data which is data loss
 * and becomes `needs_data`.
 */
export function computePointOfNoReturn(
  program: Program,
  actionsById: Record<string, ActionStep>,
  today: Iso,
): ScheduleResult {
  if (!isIsoDate(today)) {
    throw new Error(`computePointOfNoReturn: "today" is not an ISO date: ${String(today)}`);
  }

  const missing: string[] = [];
  const reportMissing = (code: string): void => {
    if (!missing.includes(code)) missing.push(code);
  };

  /* 1. Everything the programme obliges, including steps reached only through
        `depends_on`. Breadth-first, so the order stays the authored one. */
  const resolved: string[] = [];
  const discovered: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [...program.action_chain];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    if (seen.has(id)) continue;
    seen.add(id);
    discovered.push(id);

    const action = actionsById[id];
    if (action === undefined) {
      reportMissing(id);
      continue;
    }
    resolved.push(id);
    for (const dependency of action.depends_on) queue.push(dependency);
  }
  const required = new Set(resolved);

  /* 2. The anchor. Everything in the chain has to be finished by this day. */
  // A programme with no published submission deadline has no anchor to plan
  // backwards from. That is reported, never guessed at.
  const deadline = program.application_deadline?.date;
  if (deadline === undefined || !isIsoDate(deadline)) reportMissing("program.application_deadline");

  /* 3. Per-step facts. An absent duration is unknown, never zero — a step that
        really is instantaneous says `duration_days: 0` out loud. */
  const hardDeadlines = new Map<string, Iso>();
  const durations = new Map<string, number>();
  for (const id of resolved) {
    const action = actionsById[id];
    if (action === undefined) continue;

    const hard = action.hard_deadline;
    if (hard !== undefined) {
      if (isIsoDate(hard.date)) hardDeadlines.set(id, hard.date);
      else reportMissing(`${id}.hard_deadline`);
    }

    const duration = action.duration_days;
    if (typeof duration === "number" && Number.isInteger(duration) && duration >= 0) {
      durations.set(id, duration);
    } else {
      reportMissing(`${id}.duration_days`);
    }
  }

  /* 4. Ordering edges. `depends_on` is the authoritative one; `unlocks` is the
        same relation written forwards and is honoured when both ends are
        obligatory. An `unlocks` target outside the chain is an opportunity,
        not an obligation, so it constrains nothing. */
  const successors = new Map<string, string[]>();
  const link = (before: string, after: string): void => {
    const existing = successors.get(before);
    if (existing === undefined) successors.set(before, [after]);
    else if (!existing.includes(after)) existing.push(after);
  };
  for (const id of resolved) {
    const action = actionsById[id];
    if (action === undefined) continue;
    for (const dependency of action.depends_on) {
      if (required.has(dependency)) link(dependency, id);
    }
    for (const unlocked of action.unlocks) {
      if (required.has(unlocked)) link(id, unlocked);
    }
  }

  /* 5. Topological order, which doubles as cycle detection: a chain that
        depends on itself has no honest start date for any step on it. */
  const indegree = new Map<string, number>(resolved.map((id) => [id, 0]));
  for (const afters of successors.values()) {
    for (const after of afters) indegree.set(after, (indegree.get(after) ?? 0) + 1);
  }
  const ready = resolved.filter((id) => (indegree.get(id) ?? 0) === 0);
  const topological: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    topological.push(id);
    for (const after of successors.get(id) ?? []) {
      const left = (indegree.get(after) ?? 0) - 1;
      indegree.set(after, left);
      if (left === 0) ready.push(after);
    }
  }
  if (topological.length !== resolved.length) {
    const placed = new Set(topological);
    for (const id of resolved) if (!placed.has(id)) reportMissing(`${id}.depends_on`);
  }

  if (missing.length > 0) {
    return {
      status: "needs_data",
      chain: discovered.map((id) => chainEntry(id, undefined, hardDeadlines.get(id))),
      missing_data: missing,
    };
  }

  /* 6. Backwards through the chain. Reverse topological order guarantees every
        step that waits on this one already has its latest start. */
  const deadlineDate = deadline as Iso;
  const latestFinish = new Map<string, Iso>();
  const latestStart = new Map<string, Iso>();
  for (let i = topological.length - 1; i >= 0; i -= 1) {
    const id = topological[i];
    if (id === undefined) continue;

    const caps: Iso[] = [];
    const own = hardDeadlines.get(id);
    if (own !== undefined) caps.push(own);
    for (const after of successors.get(id) ?? []) {
      const start = latestStart.get(after);
      if (start !== undefined) caps.push(start);
    }

    const finish = earliestOf(deadlineDate, caps);
    const duration = durations.get(id);
    if (duration === undefined) continue; // validated in step 3; cannot happen here

    latestFinish.set(id, finish);
    latestStart.set(id, computeLatestStartDate(finish, duration));
  }

  /* 7. The point of no return is the earliest latest-start in the chain — the
        last constraint to bite, never an average and never the first date in a
        range. With no steps at all, the deadline itself is the last day to act. */
  let pointOfNoReturn = deadlineDate;
  for (const id of resolved) {
    const start = latestStart.get(id);
    if (start !== undefined && isBefore(start, pointOfNoReturn)) pointOfNoReturn = start;
  }

  // Ties break on the tighter own finish, then on authored order, so the step
  // the applicant is told to do next is stable across runs.
  let criticalActionId: string | undefined;
  for (const id of resolved) {
    if (latestStart.get(id) !== pointOfNoReturn) continue;
    if (criticalActionId === undefined) {
      criticalActionId = id;
      continue;
    }
    const finish = latestFinish.get(id);
    const incumbent = latestFinish.get(criticalActionId);
    if (finish !== undefined && incumbent !== undefined && isBefore(finish, incumbent)) {
      criticalActionId = id;
    }
  }

  const daysRemaining = daysBetween(today, pointOfNoReturn);

  const chain = resolved
    .map((id, index) => ({ id, index }))
    .sort((a, b) => {
      const aStart = latestStart.get(a.id) ?? "";
      const bStart = latestStart.get(b.id) ?? "";
      if (aStart !== bStart) return aStart < bStart ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ id }) => chainEntry(id, latestStart.get(id), hardDeadlines.get(id)));

  const result: ScheduleResult = {
    status: statusFor(daysRemaining),
    point_of_no_return: pointOfNoReturn,
    days_remaining: daysRemaining,
    chain,
    missing_data: [],
  };
  if (criticalActionId !== undefined) result.critical_action_id = criticalActionId;
  return result;
}

/**
 * Status from the countdown alone.
 *
 * The day the point of no return falls on still counts: an applicant who acts
 * today makes it, so `0` is `closing_soon` and only a date already behind us
 * closes the door.
 */
export function statusFor(daysRemaining: number): Exclude<ScheduleStatus, "needs_data"> {
  if (daysRemaining < 0) return "closed";
  if (daysRemaining <= CLOSING_SOON_DAYS) return "closing_soon";
  return "open";
}

function chainEntry(
  actionId: string,
  latestStartDate: Iso | undefined,
  hardDeadline: Iso | undefined,
): ScheduleChainEntry {
  const entry: ScheduleChainEntry = { action_id: actionId };
  if (latestStartDate !== undefined) entry.latest_start_date = latestStartDate;
  if (hardDeadline !== undefined) entry.hard_deadline = hardDeadline;
  return entry;
}

/** Earliest of a known date and any number of further caps. Never widens. */
function earliestOf(anchor: Iso, caps: readonly Iso[]): Iso {
  let best = anchor;
  for (const cap of caps) if (isBefore(cap, best)) best = cap;
  return best;
}
