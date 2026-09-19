"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { careerFreeformTurn, extractCareerAxes, nextCareerQuestion } from "@/lib/api/ai";
import type { Stage2QuestionRequest, Stage3bTurnRequest } from "@/lib/ai/career-contracts";
import { templateExtractAxes, templateStage2Question, templateStage3bUnavailable } from "@/lib/ai/career-templates";
import { AVERSION_RULES, matchAversions, vetoedIdsFrom } from "@/lib/career/aversions";
import { buildResults } from "@/lib/career/results";
import { detectCrisisSignal } from "@/lib/career/safety";
import { applyShifts, evidenceFromShifts, selectFieldCandidates, type ShiftInput } from "@/lib/career/scoring";
import { ALL_SPECIALIZATIONS, findSpecialization, specializationsOf } from "@/lib/career/specializations/index";
import { STAGE1_OPTIONAL_QUESTIONS, STAGE1_QUESTIONS, type Stage1Question } from "@/lib/career/stage1";
import {
  applyStage2Answer,
  checkStage2Stop,
  createTally,
  rankCandidates,
  sameTopThree,
  topThree,
} from "@/lib/career/stage2";
import { bankOf, type Stage2Question } from "@/lib/career/stage2-banks/index";
import {
  AXIS_IDS,
  FACET_IDS,
  totalAskedAcrossStage1And2,
  type CareerAnswerRecord,
  type CareerResultItemRecord,
  type CareerStage2State,
} from "@/lib/career/types";
import {
  answerClarify,
  currentWidenOptions,
  rejectCurrentAndAdvance,
  WIDEN_CLARIFYING_QUESTION,
  type WidenClarificationBranch,
} from "@/lib/career/widen";
import { useAppStore } from "@/lib/state/app-store";

/**
 * The career-interview state machine — the entire content package's flow
 * (§4 → §6 → §7 → §8) driven from one hook, the same seam every other
 * interview in this app uses: the zustand store remembers, this hook is the
 * only place that knows about both the store and the network, and every
 * number/date/veto decision is made by pure functions under `lib/career/`
 * before a model is ever consulted.
 */

export type Stage3bQuestion = { id: string; title: string; type: "single" | "text"; options?: { value: string; label: string }[] };

export type CareerStep =
  | { kind: "loading" }
  | { kind: "intro" }
  | { kind: "stage1"; question: Stage1Question; index: number; total: number }
  | { kind: "stage1_optional"; question: Stage1Question }
  | { kind: "stage2_loading" }
  | { kind: "stage2"; question: Stage2Question }
  | { kind: "stage3a_clarify" }
  | { kind: "stage3a_list"; options: readonly CareerResultItemRecord[] }
  | { kind: "stage3b_loading" }
  | { kind: "stage3b"; question: Stage3bQuestion; insight: string | null }
  | { kind: "stage3b_unavailable" }
  | { kind: "result" }
  | { kind: "crisis" };

const noopSubscribe = () => () => {};

function useHydratedStore(): boolean {
  const hydrated = useAppStore((state) => state.hasHydrated);
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return mounted && hydrated;
}

function allowedDimensionsFor(questionId: string): readonly string[] {
  // §4 Q1's own instruction: "LLM extracts O_* facets by verb and object;
  // A_ABS, A_NEW, A_SOC by context" — a narrower, question-specific list.
  // Everywhere else (open-ended follow-ups) the full 16 stay available.
  if (questionId === "q1_absorbed") {
    return ["O_PEOPLE", "O_LIFE", "O_MATTER", "O_DATA", "O_SYSTEM", "O_IMAGE", "A_ABS", "A_NEW", "A_SOC"];
  }
  return [...FACET_IDS, ...AXIS_IDS];
}

function historyWire(answers: readonly CareerAnswerRecord[]): { question: string; answer: string }[] {
  return answers.map((a) => ({ question: a.question_text, answer: a.answer_text }));
}

export function useCareerInterview() {
  const hydrated = useHydratedStore();
  const career = useAppStore((state) => state.career);
  const patchCareer = useAppStore((state) => state.patchCareer);
  const resetCareer = useAppStore((state) => state.resetCareer);

  // Loading is derived (no question in hand yet) rather than its own state —
  // `stage2Guard`/`stage3bGuard` alone stop the effects below from firing
  // twice for the same turn, so there is nothing a separate boolean would
  // add except a second synchronous `setState` inside an effect body.
  const [stage2Question, setStage2Question] = useState<Stage2Question | null>(null);
  const stage2Guard = useRef("");

  const [stage3bQuestion, setStage3bQuestion] = useState<Stage3bQuestion | null>(null);
  const [stage3bInsight, setStage3bInsight] = useState<string | null>(null);
  const [stage3bUnavailable, setStage3bUnavailable] = useState(false);
  const stage3bGuard = useRef("");

  const [pending, setPending] = useState(false);

  const vetoedSet = useMemo(() => new Set(career.vetoedIds), [career.vetoedIds]);

  /* ---------------------------------------------------------------------- */
  /* Stage 1 → stage 2 transition — pure computation, committed in an effect */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated) return;
    if (career.stage !== "stage1" && career.stage !== "stage1_optional") return;

    const nextMain = STAGE1_QUESTIONS.find((q) => !career.askedStage1Ids.includes(q.id));
    if (nextMain !== undefined) return;

    const candidateResult = selectFieldCandidates(career.vector, vetoedSet, career.fieldBonuses);
    const optionalAsked = career.askedStage1Ids.filter((id) =>
      STAGE1_OPTIONAL_QUESTIONS.some((q) => q.id === id),
    ).length;

    if (candidateResult.needsDisambiguation && optionalAsked < STAGE1_OPTIONAL_QUESTIONS.length) {
      if (career.stage !== "stage1_optional") patchCareer({ stage: "stage1_optional" });
      return;
    }

    const field = candidateResult.candidates[0];
    if (field === undefined) return; // 11 fields always yield a leader; defensive only.
    const remaining = specializationsOf(field)
      .filter((spec) => !vetoedSet.has(spec.id))
      .map((spec) => spec.id);
    const stage2State: CareerStage2State = {
      field,
      remaining,
      tally: createTally(remaining),
      askedBankIds: [],
      stalledStreak: 0,
      previousTopThree: null,
    };
    patchCareer({ candidateFields: candidateResult.candidates, stage: "stage2", stage2: stage2State });
  }, [hydrated, career.stage, career.askedStage1Ids, career.vector, career.fieldBonuses, vetoedSet, patchCareer]);

  /* ---------------------------------------------------------------------- */
  /* Stage 2 — fetch the next question (LLM, with a real deterministic       */
  /* fallback) whenever there isn't one in hand.                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated || career.stage !== "stage2" || career.stage2 === null) return;
    if (stage2Question !== null) return;

    const s2 = career.stage2;
    const guard = `${s2.field}:${s2.askedBankIds.length}`;
    if (stage2Guard.current === guard) return;
    stage2Guard.current = guard;

    const unaskedBank = bankOf(s2.field).filter((q) => !s2.askedBankIds.includes(q.id));
    const totalAsked = totalAskedAcrossStage1And2(career);

    if (unaskedBank.length === 0 || totalAsked >= 12) {
      finalizeStage2(s2);
      return;
    }

    const request: Stage2QuestionRequest = {
      field: s2.field,
      candidates: s2.remaining.map((id) => ({ id, label: findSpecialization(id)?.label ?? id })),
      bank: unaskedBank.map((q) => ({ id: q.id, prompt: q.prompt, axes: [...q.axes] })),
      history: historyWire(career.answers),
      aversion_labels: [...career.aversionLabels],
      questions_asked_total: totalAsked,
      questions_left: Math.max(0, 12 - totalAsked),
    };
    const fallback = templateStage2Question(s2.field, s2.remaining, new Set(s2.askedBankIds), s2.lastAxis);

    void nextCareerQuestion(request, fallback)
      .then((outcome) => {
        if (outcome.value.done || outcome.value.bank_question_id === null) {
          finalizeStage2(s2);
          return;
        }
        const question = bankOf(s2.field).find((q) => q.id === outcome.value.bank_question_id);
        if (question === undefined) {
          finalizeStage2(s2);
          return;
        }
        setStage2Question(question);
      })
      .catch(() => finalizeStage2(s2));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, career.stage, career.stage2, stage2Question]);

  function finalizeStage2(s2: CareerStage2State) {
    const ranked = rankCandidates(s2.tally, s2.remaining);
    const items = buildResults(topThree(ranked), vetoedSet, career.evidence);
    patchCareer({
      result: { items, generated_at: new Date().toISOString(), source: "stage2" },
      stage: "result",
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Stage 3b — fetch the next free-form turn.                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated || career.stage !== "stage3b") return;
    if (stage3bQuestion !== null || stage3bUnavailable) return;

    const guard = `${career.stage3bTurns}`;
    if (stage3bGuard.current === guard) return;
    stage3bGuard.current = guard;

    const rejectedIds = new Set(career.widen.rejected.map((entry) => entry.id));
    const candidates = ALL_SPECIALIZATIONS.filter((spec) => !vetoedSet.has(spec.id) && !rejectedIds.has(spec.id)).map(
      (spec) => ({ id: spec.id, label: spec.label, field: spec.field }),
    );

    const request: Stage3bTurnRequest = {
      candidates,
      rejected_ids: [...rejectedIds],
      aversion_labels: [...career.aversionLabels],
      history: historyWire(career.answers),
      turns_asked: career.stage3bTurns,
    };

    void careerFreeformTurn(request, templateStage3bUnavailable())
      .then((outcome) => {
        if (outcome.value.unavailable) {
          setStage3bUnavailable(true);
          return;
        }
        if (outcome.value.done) {
          const ids = outcome.value.result_ids ?? [];
          const items = buildResults(ids, vetoedSet, career.evidence);
          patchCareer({ result: { items, generated_at: new Date().toISOString(), source: "stage3b" }, stage: "result" });
          return;
        }
        if (outcome.value.question === null) {
          setStage3bUnavailable(true);
          return;
        }
        setStage3bQuestion(outcome.value.question);
        setStage3bInsight(outcome.value.insight);
      })
      .catch(() => setStage3bUnavailable(true));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, career.stage, career.stage3bTurns, stage3bQuestion, stage3bUnavailable]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ---------------------------------------------------------------------- */

  const start = useCallback(() => {
    if (career.stage === "idle") patchCareer({ stage: "stage1" });
  }, [career.stage, patchCareer]);

  const answerStage1Choice = useCallback(
    (question: Stage1Question, values: readonly string[]) => {
      if (question.kind === "text" || question.kind === "text_with_chips") return;
      const chosen = question.options.filter((o) => values.includes(o.value));
      const shifts: ShiftInput[] = chosen.flatMap((option) =>
        (option.shifts ?? []).map((shift) => ({
          dimension: shift.dimension,
          amount: shift.amount,
          quote: option.label,
          question_id: question.id,
        })),
      );
      const nextFieldBonuses = { ...career.fieldBonuses };
      for (const option of chosen) {
        if (option.fieldBonus === undefined) continue;
        for (const [field, value] of Object.entries(option.fieldBonus)) {
          nextFieldBonuses[field] = (nextFieldBonuses[field] ?? 0) + (value ?? 0);
        }
      }
      const vetoedFromChoice = chosen.flatMap((option) => option.vetoedIds ?? []);
      const answerLabel = chosen.length > 0 ? chosen.map((o) => o.label).join(" / ") : "не знаю";

      patchCareer({
        vector: applyShifts(career.vector, shifts),
        evidence: [...career.evidence, ...evidenceFromShifts(shifts)],
        fieldBonuses: nextFieldBonuses,
        vetoedIds: [...new Set([...career.vetoedIds, ...vetoedFromChoice])],
        answers: [
          ...career.answers,
          { question_id: question.id, question_text: question.prompt, answer_text: answerLabel, source: "stage1" },
        ],
        askedStage1Ids: [...career.askedStage1Ids, question.id],
      });
    },
    [career, patchCareer],
  );

  const answerStage1Text = useCallback(
    async (question: Stage1Question, text: string) => {
      const trimmed = text.trim();

      const crisis = detectCrisisSignal(trimmed);
      if (crisis.triggered) {
        patchCareer({ stage: "crisis", crisisTriggered: true });
        return;
      }

      const prompt = "prompt" in question ? question.prompt : "";

      if (question.kind === "text_with_chips") {
        // §4 Q10 — dealbreakers become hard vetoes, never an axis shift.
        const matched = matchAversions(trimmed);
        patchCareer({
          aversionLabels: [...new Set([...career.aversionLabels, ...matched.map((m) => m.label)])],
          vetoedIds: [...new Set([...career.vetoedIds, ...vetoedIdsFrom(matched.map((m) => m.rule))])],
          answers: [
            ...career.answers,
            { question_id: question.id, question_text: prompt, answer_text: trimmed, source: "stage1" },
          ],
          askedStage1Ids: [...career.askedStage1Ids, question.id],
        });
        return;
      }

      if (trimmed === "") {
        // Legal skip — no signal, still marks the question asked.
        patchCareer({
          answers: [
            ...career.answers,
            { question_id: question.id, question_text: prompt, answer_text: "не знаю", source: "stage1" },
          ],
          askedStage1Ids: [...career.askedStage1Ids, question.id],
        });
        return;
      }

      setPending(true);
      try {
        const allowed = allowedDimensionsFor(question.id);
        const outcome = await extractCareerAxes(
          { question_id: question.id, question_text: prompt, answer_text: trimmed, allowed_dimensions: allowed as never },
          templateExtractAxes(),
        );
        const shifts: ShiftInput[] = outcome.value.shifts.map((shift) => ({
          dimension: shift.dimension,
          amount: shift.amount,
          quote: shift.quote,
          question_id: question.id,
        }));
        patchCareer({
          vector: applyShifts(career.vector, shifts),
          evidence: [...career.evidence, ...evidenceFromShifts(shifts)],
          answers: [
            ...career.answers,
            { question_id: question.id, question_text: prompt, answer_text: trimmed, source: "stage1" },
          ],
          askedStage1Ids: [...career.askedStage1Ids, question.id],
        });
      } finally {
        setPending(false);
      }
    },
    [career, patchCareer],
  );

  const answerStage2 = useCallback(
    (chosen: "A" | "B", answerLabel: string) => {
      if (stage2Question === null || career.stage2 === null) return;
      const crisis = detectCrisisSignal(answerLabel);
      if (crisis.triggered) {
        patchCareer({ stage: "crisis", crisisTriggered: true });
        return;
      }

      const s2 = career.stage2;
      const nextTally = applyStage2Answer(s2.tally, stage2Question, s2.remaining, chosen);
      const ranked = rankCandidates(nextTally, s2.remaining);
      const newTopThree = topThree(ranked);
      const stalled = s2.previousTopThree !== null && sameTopThree(s2.previousTopThree, newTopThree);
      const nextAskedBankIds = [...s2.askedBankIds, stage2Question.id];
      const totalAsked = career.askedStage1Ids.length + nextAskedBankIds.length;
      const stopCheck = checkStage2Stop(ranked, stalled ? s2.stalledStreak + 1 : 0, totalAsked);

      const nextStage2: CareerStage2State = {
        ...s2,
        tally: nextTally,
        askedBankIds: nextAskedBankIds,
        lastAxis: stage2Question.axes[0],
        stalledStreak: stalled ? s2.stalledStreak + 1 : 0,
        previousTopThree: newTopThree,
      };
      const nextAnswers: CareerAnswerRecord[] = [
        ...career.answers,
        { question_id: stage2Question.id, question_text: stage2Question.prompt, answer_text: answerLabel, source: "stage2" },
      ];

      if (stopCheck.stop) {
        const items = buildResults(newTopThree, vetoedSet, career.evidence);
        patchCareer({
          answers: nextAnswers,
          stage2: nextStage2,
          result: { items, generated_at: new Date().toISOString(), source: "stage2" },
          stage: "result",
        });
      } else {
        patchCareer({ answers: nextAnswers, stage2: nextStage2 });
      }
      setStage2Question(null);
    },
    [career, stage2Question, vetoedSet, patchCareer],
  );

  /** One button on the result/stage-3a screens — §7's "это не про меня". */
  const rejectCurrentResult = useCallback(() => {
    if (career.stage === "result" && career.widen.round === 0) {
      const leadId = career.result?.items[0]?.id;
      if (leadId === undefined) return;
      const spec = findSpecialization(leadId);
      if (spec === undefined) return;
      patchCareer({ widen: rejectCurrentAndAdvance(career.widen, leadId, spec.field), stage: "stage3a" });
      return;
    }

    if (career.widen.round === 3 && career.widen.phase === "list") {
      patchCareer({ stage: "stage3b" });
      return;
    }

    const options = currentWidenOptions(career.widen);
    const representativeId = options[0]?.id ?? career.widen.lastRejectedId;
    if (representativeId === undefined) return;
    const originField = career.widen.originField ?? findSpecialization(representativeId)?.field;
    if (originField === undefined) return;
    patchCareer({ widen: rejectCurrentAndAdvance(career.widen, representativeId, originField) });
  }, [career, patchCareer]);

  const answerWidenClarify = useCallback(
    (branch: WidenClarificationBranch) => {
      patchCareer({ widen: answerClarify(career.widen, branch) });
    },
    [career.widen, patchCareer],
  );

  const chooseWidenOption = useCallback(
    (id: string) => {
      const optionIds = currentWidenOptions(career.widen).map((spec) => spec.id);
      const items = buildResults([id, ...optionIds.filter((o) => o !== id)], vetoedSet, career.evidence);
      patchCareer({ result: { items, generated_at: new Date().toISOString(), source: "stage3a" }, stage: "result" });
    },
    [career.widen, career.evidence, vetoedSet, patchCareer],
  );

  const answerStage3bChoice = useCallback(
    (label: string) => {
      if (stage3bQuestion === null) return;
      patchCareer({
        answers: [
          ...career.answers,
          { question_id: stage3bQuestion.id, question_text: stage3bQuestion.title, answer_text: label, source: "stage3b" },
        ],
        stage3bTurns: career.stage3bTurns + 1,
      });
      setStage3bQuestion(null);
      setStage3bInsight(null);
    },
    [career, stage3bQuestion, patchCareer],
  );

  const answerStage3bText = useCallback(
    (text: string) => {
      if (stage3bQuestion === null) return;
      const trimmed = text.trim();
      const crisis = detectCrisisSignal(trimmed);
      if (crisis.triggered) {
        patchCareer({ stage: "crisis", crisisTriggered: true });
        return;
      }
      patchCareer({
        answers: [
          ...career.answers,
          { question_id: stage3bQuestion.id, question_text: stage3bQuestion.title, answer_text: trimmed, source: "stage3b" },
        ],
        stage3bTurns: career.stage3bTurns + 1,
      });
      setStage3bQuestion(null);
      setStage3bInsight(null);
    },
    [career, stage3bQuestion, patchCareer],
  );

  /** "Хватит" — the document's own legal exit, from stage 2 or stage 3b. */
  const finishNow = useCallback(() => {
    if (career.stage === "stage2" && career.stage2 !== null) {
      finalizeStage2(career.stage2);
      return;
    }
    if (career.stage === "stage3b") {
      const rejectedIds = new Set(career.widen.rejected.map((entry) => entry.id));
      const candidates = ALL_SPECIALIZATIONS.filter((s) => !vetoedSet.has(s.id) && !rejectedIds.has(s.id))
        .slice(0, 3)
        .map((s) => s.id);
      const items = buildResults(candidates, vetoedSet, career.evidence);
      patchCareer({ result: { items, generated_at: new Date().toISOString(), source: "stage3b" }, stage: "result" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [career, vetoedSet, patchCareer]);

  const restart = useCallback(() => {
    setStage2Question(null);
    setStage3bQuestion(null);
    setStage3bUnavailable(false);
    stage2Guard.current = "";
    stage3bGuard.current = "";
    resetCareer();
  }, [resetCareer]);

  /* ---------------------------------------------------------------------- */
  /* Derived step                                                            */
  /* ---------------------------------------------------------------------- */

  const step = useMemo<CareerStep>(() => {
    if (!hydrated) return { kind: "loading" };
    if (career.stage === "idle") return { kind: "intro" };
    if (career.stage === "crisis") return { kind: "crisis" };
    if (career.stage === "result") return { kind: "result" };

    if (career.stage === "stage1" || career.stage === "stage1_optional") {
      const nextMain = STAGE1_QUESTIONS.find((q) => !career.askedStage1Ids.includes(q.id));
      if (nextMain !== undefined) {
        return { kind: "stage1", question: nextMain, index: STAGE1_QUESTIONS.indexOf(nextMain), total: STAGE1_QUESTIONS.length };
      }
      const nextOptional = STAGE1_OPTIONAL_QUESTIONS.find((q) => !career.askedStage1Ids.includes(q.id));
      if (nextOptional !== undefined) return { kind: "stage1_optional", question: nextOptional };
      return { kind: "loading" }; // one-frame gap while the effect above commits the stage-2 transition
    }

    if (career.stage === "stage2") {
      return stage2Question !== null ? { kind: "stage2", question: stage2Question } : { kind: "stage2_loading" };
    }

    if (career.stage === "stage3a") {
      if (career.widen.phase === "clarify") return { kind: "stage3a_clarify" };
      const options = currentWidenOptions(career.widen);
      const items = buildResults(options.map((o) => o.id), vetoedSet, career.evidence);
      return { kind: "stage3a_list", options: items };
    }

    if (career.stage === "stage3b") {
      if (stage3bUnavailable) return { kind: "stage3b_unavailable" };
      return stage3bQuestion !== null
        ? { kind: "stage3b", question: stage3bQuestion, insight: stage3bInsight }
        : { kind: "stage3b_loading" };
    }

    return { kind: "loading" };
  }, [hydrated, career, stage2Question, stage3bQuestion, stage3bInsight, stage3bUnavailable, vetoedSet]);

  return {
    ready: hydrated,
    step,
    pending,
    askedCount: totalAskedAcrossStage1And2(career) + career.stage3bTurns,
    result: career.result,
    aversionRules: AVERSION_RULES,
    start,
    answerStage1Choice,
    answerStage1Text,
    answerStage2,
    rejectCurrentResult,
    answerWidenClarify,
    chooseWidenOption,
    answerStage3bChoice,
    answerStage3bText,
    finishNow,
    restart,
  };
}

export const WIDEN_CLARIFY_QUESTION_TEXT = WIDEN_CLARIFYING_QUESTION;
