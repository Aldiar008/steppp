"use client";

import { useMemo } from "react";

import type { RouteView } from "./use-route";

export interface Progress {
  done: number;
  total: number;
  /** 0–100, rounded. Zero when there is nothing to count, never NaN. */
  percent: number;
}

/**
 * How much of the work the open routes need is already behind you.
 *
 * Counted over *reachable* routes only. Steps that belong to a path which has
 * already closed, or which the profile cannot pass, are not work anybody has to
 * do — including them would make the denominator grow every time a route shut,
 * so finishing nothing would look like falling behind.
 *
 * The numerator is what the applicant ticked, intersected with that same set:
 * a step ticked for a route that has since closed still happened, but it is no
 * longer part of what is left to do.
 */
export function useProgress(view: RouteView): Progress {
  return useMemo(() => {
    const needed = new Set<string>();
    for (const door of view.doors) {
      if (door.status === "closed" || door.status === "needs_data") continue;
      if (door.explanation_facts.blockers.length > 0) continue;
      for (const actionId of door.action_chain) needed.add(actionId);
    }

    const done = view.completedActionIds.filter((id) => needed.has(id)).length;
    const total = needed.size;
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [view.doors, view.completedActionIds]);
}
