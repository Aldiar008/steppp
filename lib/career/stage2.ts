import { bankOf, type Stage2Question } from "./stage2-banks/index";
import type { FieldId } from "./types";

/**
 * Part 6 — the adaptive stage. Two independent pieces:
 *   - `pickNextStage2Question` — the offline, fully deterministic selector
 *     that also serves as the LLM-outage fallback (§11.2 test #5). It
 *     implements §6.1's own description of a good question (splits the
 *     remaining list close to evenly) as an actual greedy search over the
 *     bank, not a fixed sequence.
 *   - the candidate tally + stopping conditions of §6.4, which apply
 *     identically whether the question came from this file or from the
 *     model (the model never decides when to stop; the tally does).
 */

/** §6.1 rule 1 — specializations with a heavy entry barrier, asked about before finer distinctions. */
const BARRIER_SPECIALIZATION_IDS: ReadonlySet<string> = new Set([
  "TRD_PILOT",
  "TRD_AVTECH",
  "MED_SURG",
  "SEC_MIL",
  "SEC_FIRE",
  "ART_PERF",
]);

export interface Stage2Split {
  inA: readonly string[];
  inB: readonly string[];
  neutral: readonly string[];
}

export function splitCandidates(question: Stage2Question, remaining: readonly string[]): Stage2Split {
  const remainingSet = new Set(remaining);
  const groupASet = new Set(question.groupA);
  const inA = remaining.filter((id) => groupASet.has(id));
  const inB =
    question.groupB === "rest"
      ? remaining.filter((id) => !groupASet.has(id))
      : remaining.filter((id) => new Set(question.groupB).has(id));
  const inBSet = new Set(inB);
  const neutral = remaining.filter((id) => !groupASet.has(id) && !inBSet.has(id) && remainingSet.has(id));
  return { inA, inB, neutral };
}

/**
 * §6.1's greedy "делит примерно пополам" search over one field's bank.
 *
 * `lastAxis` enforces rule 3 ("не задавай два похожих вопроса подряд") by
 * excluding the previous question's axis where a choice remains; barrier
 * candidates (rule 1) are preferred while still present in `remaining`.
 */
export function pickNextStage2Question(
  field: FieldId,
  remaining: readonly string[],
  askedIds: ReadonlySet<string>,
  lastAxis?: string,
): Stage2Question | null {
  const bank = bankOf(field);
  const unaskedPool = bank.filter((q) => !askedIds.has(q.id));
  if (unaskedPool.length === 0) return null;

  const avoidingRepeatAxis =
    lastAxis === undefined ? unaskedPool : unaskedPool.filter((q) => !q.axes.includes(lastAxis));
  const pool = avoidingRepeatAxis.length > 0 ? avoidingRepeatAxis : unaskedPool;

  const remainingHasBarrier = remaining.some((id) => BARRIER_SPECIALIZATION_IDS.has(id));
  const referencesBarrier = (q: Stage2Question) =>
    q.groupA.some((id) => BARRIER_SPECIALIZATION_IDS.has(id)) ||
    (Array.isArray(q.groupB) && q.groupB.some((id) => BARRIER_SPECIALIZATION_IDS.has(id)));
  const barrierPool = remainingHasBarrier ? pool.filter(referencesBarrier) : [];
  const searchPool = barrierPool.length > 0 ? barrierPool : pool;

  const usable = searchPool
    .map((q) => ({ q, split: splitCandidates(q, remaining) }))
    // Rule: "никогда не выбирай вопрос, на который все оставшиеся кандидаты
    // отвечают одинаково" — a question must actually move at least one
    // candidate into each side to count as splitting anything.
    .filter((entry) => entry.split.inA.length > 0 && entry.split.inB.length > 0);

  const scored = usable.length > 0 ? usable : searchPool.map((q) => ({ q, split: splitCandidates(q, remaining) }));

  let best = scored[0];
  if (best === undefined) return null;
  let bestMax = Math.max(best.split.inA.length, best.split.inB.length, best.split.neutral.length);
  for (const entry of scored.slice(1)) {
    const max = Math.max(entry.split.inA.length, entry.split.inB.length, entry.split.neutral.length);
    if (max < bestMax) {
      best = entry;
      bestMax = max;
    }
  }
  return best.q;
}

/* -------------------------------------------------------------------------- */
/* Candidate tally — §6.4's "лидер опережает второго"                         */
/* -------------------------------------------------------------------------- */

export type CandidateTally = Readonly<Record<string, number>>;

export function createTally(candidateIds: readonly string[]): CandidateTally {
  return Object.fromEntries(candidateIds.map((id) => [id, 0]));
}

/**
 * One answered question moves its two sides apart: the chosen side's
 * candidates gain a point, the other side's lose one. Candidates the
 * question does not mention (`neutral`) are untouched. Scores are not
 * bounded — the ranking and ratio below only ever look at relative order.
 */
export function applyStage2Answer(
  tally: CandidateTally,
  question: Stage2Question,
  remaining: readonly string[],
  chosen: "A" | "B",
): CandidateTally {
  const { inA, inB } = splitCandidates(question, remaining);
  const winners = chosen === "A" ? inA : inB;
  const losers = chosen === "A" ? inB : inA;
  const next: Record<string, number> = { ...tally };
  for (const id of winners) next[id] = (next[id] ?? 0) + 1;
  for (const id of losers) next[id] = (next[id] ?? 0) - 1;
  return next;
}

export interface RankedCandidate {
  id: string;
  score: number;
}

/** §6's own scale: a floor of 1 keeps the leader/second ratio well-defined even when a candidate has only ever lost. */
export function rankCandidates(tally: CandidateTally, remaining: readonly string[]): readonly RankedCandidate[] {
  return remaining
    .map((id) => ({ id, score: Math.max(1, 1 + (tally[id] ?? 0)) }))
    .sort((a, b) => b.score - a.score);
}

const LEADER_RATIO_THRESHOLD = 1.6;
const TOTAL_QUESTION_LIMIT = 12;

export function stage2Confident(ranked: readonly RankedCandidate[]): boolean {
  const leader = ranked[0];
  const second = ranked[1];
  if (leader === undefined) return false;
  if (second === undefined) return true;
  return leader.score / second.score > LEADER_RATIO_THRESHOLD;
}

export function topThree(ranked: readonly RankedCandidate[]): readonly string[] {
  return ranked.slice(0, 3).map((entry) => entry.id);
}

export function sameTopThree(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export interface Stage2StopCheck {
  stop: boolean;
  reason?: "confident" | "few_candidates" | "stalled" | "question_limit";
}

/**
 * §6.4's four scoring-side stopping conditions ("нажал «хватит»" and "три
 * односложных ответа подряд" are UI-observed signals, not scoring facts, and
 * are handled by the interview hook instead).
 *
 * `stalledStreak` is how many consecutive prior questions left the top three
 * unchanged (via `sameTopThree`, tracked by the caller — it is genuinely
 * about the history of turns, not something derivable from the current tally
 * alone). The document's "два вопроса подряд" only trips after the *second*
 * such question.
 */
export function checkStage2Stop(
  ranked: readonly RankedCandidate[],
  stalledStreak: number,
  totalAskedAcrossStages: number,
): Stage2StopCheck {
  if (ranked.length <= 2) return { stop: true, reason: "few_candidates" };
  if (stage2Confident(ranked)) return { stop: true, reason: "confident" };
  if (totalAskedAcrossStages >= TOTAL_QUESTION_LIMIT) return { stop: true, reason: "question_limit" };
  if (stalledStreak >= 2) return { stop: true, reason: "stalled" };
  return { stop: false };
}

/** §6.4's "отвечает односложно" — a short, low-content free-text answer. */
export function isMonosyllabicAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "") return true;
  return trimmed.split(/\s+/).length <= 1 && trimmed.length <= 8;
}
