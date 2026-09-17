"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { CATALOG } from "@/data/catalog";
import {
  applyInterviewAnswer,
  buildActionIndex,
  computeNextBestAction,
  computeRoute,
  diffRoutes,
  findQuestion,
  readProfileFieldValue,
  type NextActionResult,
  type RouteDiff,
  type RouteResult,
} from "@/lib/engine";
import { todayIso } from "@/lib/date";
import {
  useAppStore,
  type ActionState,
  type ActionStatus,
  type ProfileEdit,
} from "@/lib/state/app-store";
import type { ActionStep, Door, Profile } from "@/lib/types";

/**
 * One derivation of the whole application state.
 *
 * Every screen reads from here, so the board, the roadmap and the next action
 * can never disagree with each other: they are three views of one pure
 * computation over one profile. The engine computes, the store remembers, and
 * this hook is the only place that knows about both.
 *
 * The route is recomputed on the client the moment the profile changes — no
 * request, no waiting. That is what makes an edit feel instant, and it is only
 * possible because the engine is deterministic and local.
 */

export interface RouteView {
  /** False until persisted state has been read; screens show a skeleton. */
  ready: boolean;
  today: string;

  profile: Profile | null;
  route: RouteResult | null;
  doors: Door[];

  actionsById: Record<string, ActionStep>;
  completedActionIds: string[];
  /** The next step, with finished work already excluded. */
  nextAction: NextActionResult | null;

  compareIds: string[];

  /** The change worth showing, or null when there is nothing new to report. */
  pendingChange: { edit: ProfileEdit; diff: RouteDiff } | null;

  /** Recomputes and stores the board. Used after any profile edit. */
  recalculate: (profile: Profile) => void;
  /**
   * Applies one interview answer as an edit: recompute, remember what moved,
   * and let the "что изменилось" view open. The board is recomputed locally and
   * immediately — nothing waits on a request.
   */
  editAnswer: (questionId: string, value: unknown) => void;
  acknowledgeChange: () => void;
  markDone: (actionId: string) => void;
  markUndone: (actionId: string) => void;
  /** Where each step stands: planned, in progress, or done. */
  actionStates: Record<string, ActionState>;
  setActionStatus: (actionId: string, status: ActionStatus, plannedDate?: string) => void;
  clearActionStatus: (actionId: string) => void;
  toggleCompare: (programId: string) => void;
  clearCompare: () => void;
}

const noopSubscribe = () => () => {};

export function useRouteView(): RouteView {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const hydrated = useAppStore((state) => state.hasHydrated);

  const profile = useAppStore((state) => state.profile);
  const storedRoute = useAppStore((state) => state.route);
  const completedActionIds = useAppStore((state) => state.completed_action_ids);
  const compareIds = useAppStore((state) => state.selected_compare_ids);

  const setProfile = useAppStore((state) => state.setProfile);
  const setRoute = useAppStore((state) => state.setRoute);
  const markActionComplete = useAppStore((state) => state.markActionComplete);
  const actionStates = useAppStore((state) => state.action_states);
  const setActionStatus = useAppStore((state) => state.setActionStatus);
  const clearActionStatus = useAppStore((state) => state.clearActionStatus);
  const unmarkActionComplete = useAppStore((state) => state.unmarkActionComplete);
  const toggleCompareId = useAppStore((state) => state.toggleCompare);
  const clearCompareSelection = useAppStore((state) => state.clearCompareSelection);
  const previousRoute = useAppStore((state) => state.previous_route);
  const lastEdit = useAppStore((state) => state.last_edit);
  const changeSeen = useAppStore((state) => state.change_seen);
  const recordProfileEdit = useAppStore((state) => state.recordProfileEdit);
  const acknowledgeChange = useAppStore((state) => state.acknowledgeChange);

  // Pinned per mount: a countdown that moved mid-session would make the page
  // argue with itself.
  const today = useMemo(() => todayIso(), []);
  const actionsById = useMemo(() => buildActionIndex(CATALOG.actions), []);

  /**
   * The board, recomputed when the store does not have one.
   *
   * A profile without a stored route is not an empty product — it is a board
   * nobody has computed yet, and the engine is right here. This is what makes a
   * deep link work on a returning device, and what keeps a storage entry
   * written by an older build from reading as "у тебя нет профиля".
   */
  const route = useMemo(() => {
    if (storedRoute !== null) return storedRoute;
    if (profile === null) return null;
    return computeRoute(profile, CATALOG, today);
  }, [storedRoute, profile, today]);

  // Memoised so the empty-array fallback does not produce a new identity on
  // every render and re-run everything that depends on the board.
  const doors = useMemo(() => route?.doors ?? [], [route]);

  /**
   * The next step, recomputed here rather than read from the stored route:
   * finishing something changes what to do next, and the stored board was
   * computed before the applicant ticked the box.
   */
  const nextAction = useMemo(() => {
    if (doors.length === 0) return null;
    return computeNextBestAction(doors, actionsById, new Set(completedActionIds), today);
  }, [doors, actionsById, completedActionIds, today]);

  const recalculate = useCallback(
    (next: Profile) => {
      setProfile(next);
      setRoute(computeRoute(next, CATALOG, today), `${today}T00:00:00.000Z`);
    },
    [setProfile, setRoute, today],
  );

  const editAnswer = useCallback(
    (questionId: string, value: unknown) => {
      const question = findQuestion(questionId);
      if (question === undefined || profile === null) return;

      const oldValue = readProfileFieldValue(profile, question.field);
      const next = applyInterviewAnswer(profile, question, value);
      const newValue = readProfileFieldValue(next, question.field);

      // An answer that changes nothing is not an edit and must not open a view
      // promising that something moved.
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;

      recalculate(next);
      recordProfileEdit({
        field: question.field,
        old_value: oldValue,
        new_value: newValue,
        at: `${today}T00:00:00.000Z`,
      });
    },
    [profile, recalculate, recordProfileEdit, today],
  );

  /**
   * The change to show, if there is one. Both boards come from the store, and
   * the comparison is the engine's — this hook only decides when to offer it.
   */
  const pendingChange = useMemo(() => {
    if (changeSeen || lastEdit === undefined || route === null || previousRoute === null) {
      return null;
    }
    return { edit: lastEdit, diff: diffRoutes(previousRoute, route) };
  }, [changeSeen, lastEdit, route, previousRoute]);

  return {
    ready: mounted && hydrated,
    today,
    profile,
    route,
    doors,
    actionsById,
    completedActionIds,
    nextAction,
    compareIds,
    pendingChange,
    recalculate,
    editAnswer,
    acknowledgeChange,
    markDone: markActionComplete,
    markUndone: unmarkActionComplete,
    actionStates,
    setActionStatus,
    clearActionStatus,
    toggleCompare: toggleCompareId,
    clearCompare: clearCompareSelection,
  };
}
