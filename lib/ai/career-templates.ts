import { pickNextStage2Question } from "@/lib/career/stage2";
import type { FieldId } from "@/lib/career/types";
import type { ExtractAxesResponse, Stage2QuestionResponse, Stage3bTurnResponse } from "./career-contracts";

/**
 * Everything the career-interview boundary does with no AI available.
 *
 * §11.2 test #5: stage 1's free-text questions simply produce no shift
 * without a model (the option-based questions carry the real signal
 * regardless); stage 2 falls back to `pickNextStage2Question` — the same
 * real, discriminating selector the LLM path is graded against, not a
 * degraded stand-in; stage 3b has no offline mode at all and says so
 * honestly, per the document's own requirement that a disabled feature must
 * be disabled cleanly rather than faked.
 */

export function templateExtractAxes(): ExtractAxesResponse {
  return { shifts: [], fallback: true };
}

export function templateStage2Question(
  field: FieldId,
  remainingCandidateIds: readonly string[],
  askedIds: ReadonlySet<string>,
  lastAxis?: string,
): Stage2QuestionResponse {
  const question = pickNextStage2Question(field, remainingCandidateIds, askedIds, lastAxis);
  if (question === null) return { done: true, bank_question_id: null, fallback: true };
  return { done: false, bank_question_id: question.id, fallback: true };
}

export function templateStage3bUnavailable(): Stage3bTurnResponse {
  return {
    done: true,
    question: null,
    insight: null,
    result_ids: null,
    unavailable: true,
  };
}
