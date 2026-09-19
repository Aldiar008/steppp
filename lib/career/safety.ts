/**
 * Part 10.6 — the crisis-detection interrupt.
 *
 * A deterministic, regex-based scan, not an LLM classification: it has to
 * keep working when the model is unavailable (§11.2 test #5's degradation
 * applies here too, and arguably more — a safety stop cannot depend on a
 * network call succeeding), and it has to be something a test can pin down
 * exactly rather than something that behaves differently call to call.
 *
 * This checks every free-text answer the student ever gives, at every
 * stage, before the text is scored or sent anywhere else. A match halts the
 * interview immediately — the caller must stop asking questions and must
 * not continue scoring — and routes to a support screen.
 *
 * The patterns below are a first pass, deliberately conservative (favouring
 * false positives, which just show a support screen a beat early, over false
 * negatives). The document itself says this screen's actual content "пишется
 * отдельно и согласуется со специалистом" — the copy in
 * `features/profession/crisis-screen.tsx` is a clearly-marked placeholder for
 * that reason; what must work today is the stop mechanism, not the wording.
 */

/**
 * Real free-text answers insert words a literal phrase match would miss
 * ("не хочу **больше** жить") — found live, not in a unit test, by actually
 * typing that exact sentence into a running browser. Every "core verb near
 * core verb" pattern below tolerates a handful of words in between for
 * exactly that reason; only fixed idioms (no natural variation) stay literal.
 */
const NEAR = (a: string, b: string, gap = 3): RegExp => new RegExp(`${a}(?:\\s+\\S+){0,${gap}}\\s+${b}`, "iu");

const CRISIS_PATTERNS: readonly RegExp[] = [
  NEAR("не хочу", "жить", 3),
  /жить.{0,20}не хочу/iu,
  /покончить с собой/iu,
  /самоуб/iu,
  /причинить себе вред/iu,
  /порезат?ь себя/iu,
  /навредить себе/iu,
  /лучше бы меня не было/iu,
  /без меня всем (будет )?лучше/iu,
  /никому не нужен/iu,
  NEAR("нет", "смысла", 2),
  /хочу исчезнуть/iu,
  /не вижу смысла/iu,
  /всё бессмысленно/iu,
  /жизнь бессмысленна/iu,
  /хочу умереть/iu,
  /лучше бы я умер/iu,
];

export interface CrisisCheck {
  triggered: boolean;
  matchedPattern?: string;
}

export function detectCrisisSignal(text: string): CrisisCheck {
  const trimmed = text.trim();
  if (trimmed === "") return { triggered: false };
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(trimmed)) return { triggered: true, matchedPattern: pattern.source };
  }
  return { triggered: false };
}
