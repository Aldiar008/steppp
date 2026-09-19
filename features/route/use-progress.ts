"use client";

import { useMemo } from "react";

import type { Door } from "@/lib/types";
import type { RouteView } from "./use-route";

export interface Progress {
  done: number;
  total: number;
  /** 0–100, rounded. Zero when there is nothing to count, never NaN. */
  percent: number;
}

/**
 * Every obligatory step of every route still worth pursuing.
 *
 * A path that has already closed, or that the profile cannot pass, obliges
 * nobody to do anything — its steps drop out entirely rather than counting
 * against the applicant. Exported (not just inlined in `computeProgress`)
 * because `features/parent/parent-dashboard.tsx` needs this exact set too,
 * to split the parent's step counts into done/doing/planned/pending.
 */
export function reachableActionIds(doors: readonly Door[]): Set<string> {
  const needed = new Set<string>();
  for (const door of doors) {
    if (door.status === "closed" || door.status === "needs_data") continue;
    if (door.explanation_facts.blockers.length > 0) continue;
    for (const actionId of door.action_chain) needed.add(actionId);
  }
  return needed;
}

/**
 * How much of the work the open routes need is already behind you.
 *
 * The numerator is what the applicant ticked, intersected with
 * `reachableActionIds`: a step ticked for a route that has since closed still
 * happened, but it is no longer part of what is left to do.
 *
 * A plain function, not a hook, on purpose: `features/parent/parent-dashboard.tsx`
 * calls this directly on a student's fetched `Door[]`, and it has to be the
 * exact same computation `useProgress` runs for the student's own screens —
 * not a second implementation of the same idea that could quietly drift.
 */
export function computeProgress(doors: readonly Door[], completedActionIds: readonly string[]): Progress {
  const needed = reachableActionIds(doors);
  const done = completedActionIds.filter((id) => needed.has(id)).length;
  const total = needed.size;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function useProgress(view: RouteView): Progress {
  return useMemo(
    () => computeProgress(view.doors, view.completedActionIds),
    [view.doors, view.completedActionIds],
  );
}
