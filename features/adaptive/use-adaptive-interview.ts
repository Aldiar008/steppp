"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { CATALOG } from "@/data/catalog";
import { parseProfileDeterministically } from "@/lib/ai/deterministic";
import { profileFromParsed } from "@/lib/ai/to-profile";
import { parseProfileText } from "@/lib/api/ai";
import {
  applyInterviewAnswer,
  computeRoute,
  findQuestion,
  MAX_ADAPTIVE_QUESTIONS,
  selectNextQuestion,
  type QuestionDefinition,
  type QuestionSelection,
  type RouteResult,
} from "@/lib/engine";
import { todayIso } from "@/lib/date";
import { useAppStore } from "@/lib/state/app-store";
import type { Profile } from "@/lib/types";

/**
 * The interview, wired up.
 *
 * This is the seam the architecture depends on: the engine computes, the store
 * remembers, and this hook is the only place that knows about both. It holds no
 * state of its own and makes no decisions — every question comes from
 * `selectNextQuestion`, every recalculation from `computeRoute`.
 *
 * After each answer the whole route is recomputed and handed to the store,
 * which keeps the board being replaced as `previous_route`.
 *
 * Editing an *existing* answer is deliberately not here: it lives in
 * `useRouteView().editAnswer`, so an edit made from the breakdown and an edit
 * made from the board go through one path and produce one "что изменилось".
 */

const EMPTY_PROFILE: Profile = {
  interests: [],
  countries: [],
  languages: [],
  exams: [],
  constraints: {},
};

export type InterviewPhase = "loading" | "initial" | "answering" | "stopped" | "complete";

export interface AdaptiveInterview {
  phase: InterviewPhase;
  today: string;

  profile: Profile | null;
  route: RouteResult | null;

  question: QuestionDefinition | null;
  selection: QuestionSelection | null;

  askedCount: number;
  maxQuestions: number;
  /** How many more questions the engine could still ask. Never a guess. */
  estimatedRemaining: number;

  rawText: string;
  lastSkippedId: string | null;

  start: () => void;
  /**
   * Starts from what the applicant wrote: the text is parsed into structured
   * fields, and the adaptive interview continues from there.
   */
  startWithText: (text: string) => Promise<void>;
  /** True while the text is being parsed. */
  parsing: boolean;
  /** Contradictions the parser found and refused to settle. */
  conflicts: { field: string; values: string[]; explanation: string }[];
  answer: (value: unknown) => void;
  skip: () => void;
  finish: () => void;
  saveText: (text: string) => void;
  /** Loads a ready-made demo profile and computes its board. */
  loadDemoProfile: (profile: Profile) => void;
}

const noopSubscribe = () => () => {};

/** True only once the client has taken over; persisted state cannot exist before. */
function useHydratedStore(): boolean {
  const hydrated = useAppStore((state) => state.hasHydrated);
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return mounted && hydrated;
}

export function useAdaptiveInterview(): AdaptiveInterview {
  const hydrated = useHydratedStore();
  const [parsing, setParsing] = useState(false);

  const profile = useAppStore((state) => state.profile);
  const storedRoute = useAppStore((state) => state.route);
  const interview = useAppStore((state) => state.interview);

  const setProfile = useAppStore((state) => state.setProfile);
  const setRoute = useAppStore((state) => state.setRoute);
  const startInterview = useAppStore((state) => state.startInterview);
  const completeInterview = useAppStore((state) => state.completeInterview);
  const answerQuestion = useAppStore((state) => state.answerQuestion);
  const skipQuestion = useAppStore((state) => state.skipQuestion);
  const setCurrentQuestion = useAppStore((state) => state.setCurrentQuestion);
  const setInterviewText = useAppStore((state) => state.setInterviewText);
  const setInterviewConflicts = useAppStore((state) => state.setInterviewConflicts);

  // Pinned once per mount: a countdown that moved mid-interview would make the
  // screen argue with itself.
  const today = useMemo(() => todayIso(), []);

  // A profile with no stored board means nobody has computed one yet, not that
  // there is nothing to show.
  const route = useMemo(() => {
    if (storedRoute !== null) return storedRoute;
    if (profile === null) return null;
    return computeRoute(profile, CATALOG, today);
  }, [storedRoute, profile, today]);

  const selection = useMemo(() => {
    if (!hydrated || profile === null) return null;
    return selectNextQuestion(profile, CATALOG, interview.answered_question_ids, today, {
      skippedQuestionIds: interview.skipped_question_ids,
    });
  }, [hydrated, profile, interview.answered_question_ids, interview.skipped_question_ids, today]);

  const question = selection === null ? null : (findQuestion(selection.question_id) ?? null);

  /** Recomputes the board and records it, with the outgoing one kept for the diff. */
  const recalculate = useCallback(
    (next: Profile) => {
      setProfile(next);
      setRoute(computeRoute(next, CATALOG, today), `${today}T00:00:00.000Z`);
    },
    [setProfile, setRoute, today],
  );

  const start = useCallback(() => {
    startInterview();
    if (profile === null) recalculate(EMPTY_PROFILE);
  }, [startInterview, profile, recalculate]);

  /**
   * Free text in, a starting profile out.
   *
   * The rule parser runs first and locally, so there is always an answer; the
   * route is asked to do better and may. Either way the board is computed by
   * the engine from the resulting profile — the parser never produces a date,
   * a status or a door.
   */
  const startWithText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      setInterviewText(trimmed);
      startInterview();

      if (trimmed.length === 0) {
        if (profile === null) recalculate(EMPTY_PROFILE);
        return;
      }

      setParsing(true);
      try {
        const local = parseProfileDeterministically(trimmed);
        const { value } = await parseProfileText({ text: trimmed, locale: "ru" }, local);
        setInterviewConflicts(value.conflicts);
        recalculate(profileFromParsed(value.profile, profile ?? EMPTY_PROFILE));
      } finally {
        setParsing(false);
      }
    },
    [setInterviewText, startInterview, profile, recalculate, setInterviewConflicts],
  );

  const answer = useCallback(
    (value: unknown) => {
      if (question === null || profile === null) return;
      recalculate(applyInterviewAnswer(profile, question, value));
      answerQuestion(question.id);
      setCurrentQuestion(undefined);
    },
    [question, profile, recalculate, answerQuestion, setCurrentQuestion],
  );

  const skip = useCallback(() => {
    if (question === null) return;
    // Nothing is written to the profile, so the board cannot move: a skip is
    // the absence of an answer, not an answer of "no".
    skipQuestion(question.id);
    setCurrentQuestion(undefined);
  }, [question, skipQuestion, setCurrentQuestion]);

  const saveText = useCallback((text: string) => setInterviewText(text), [setInterviewText]);

  const loadDemoProfile = useCallback(
    (demo: Profile) => {
      startInterview();
      recalculate(demo);
    },
    [startInterview, recalculate],
  );

  const askedCount =
    interview.answered_question_ids.length + interview.skipped_question_ids.length;

  const phase: InterviewPhase = !hydrated
    ? "loading"
    : !interview.started || profile === null
      ? "initial"
      : interview.completed
        ? "complete"
        : question !== null
          ? "answering"
          : "stopped";

  return {
    phase,
    today,
    profile,
    route,
    question,
    selection,
    askedCount,
    maxQuestions: MAX_ADAPTIVE_QUESTIONS,
    // What the engine can still reach, capped by the ceiling. Not a prediction:
    // the interview may stop earlier, and the screen says "примерно" for that
    // reason.
    estimatedRemaining: Math.max(
      0,
      Math.min(selection?.remaining_candidate_questions ?? 0, MAX_ADAPTIVE_QUESTIONS - askedCount),
    ),
    rawText: interview.raw_text ?? "",
    lastSkippedId: interview.skipped_question_ids.at(-1) ?? null,
    start,
    startWithText,
    parsing,
    conflicts: interview.conflicts,
    answer,
    skip,
    finish: completeInterview,
    saveText,
    loadDemoProfile,
  };
}
