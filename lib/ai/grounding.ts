/**
 * The guard between a language model and a person planning their year.
 *
 * Everything the product states as fact — a date, a countdown, a number of
 * routes, a price — is computed before the model is called. The model's only
 * job is to put those facts into a sentence. This checks that it did exactly
 * that: every number and every date in the generated text has to appear in the
 * facts that were sent.
 *
 * A plausible invented deadline is the worst failure this product can have. It
 * does not look like a bug, it looks like an answer, and somebody acts on it.
 * Three layers of instruction in a prompt are cheaper to write than this and
 * worth less, because they are advice and this is a check.
 *
 * Deliberately domain-free: it walks whatever JSON it is given, so the same
 * guard serves explanations, diffs and anything added later.
 */

/** Numbers as a person writes them: 12, 6.5, 1 500 000, 1,5. */
const NUMBER_PATTERN = /\d+(?:[., \s]\d+)*/g;

/** Any run of digits, used to compare dates and numbers part by part. */
const DIGIT_PATTERN = /\d+/g;

/**
 * Every numeric token the model is allowed to use.
 *
 * Both the whole number and its digit groups are collected, so a text may say
 * "20 ноября 2026" when the facts carry "2026-11-20", and may say "1 500 000"
 * when the facts carry 1500000 — the same fact written the way Russian writes
 * it. Nothing new can be produced this way: every part still has to come from
 * the input.
 */
export function collectGroundedValues(facts: unknown): Set<string> {
  const allowed = new Set<string>();

  const remember = (value: string): void => {
    for (const match of value.match(NUMBER_PATTERN) ?? []) {
      allowed.add(normalizeNumber(match));
      for (const part of match.match(DIGIT_PATTERN) ?? []) allowed.add(stripLeadingZeros(part));
    }
  };

  const walk = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (typeof node === "number") {
      remember(String(node));
      return;
    }
    if (typeof node === "string") {
      remember(node);
      return;
    }
    if (typeof node === "boolean") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node === "object") {
      // Keys carry facts too: a programme id or a field name can legitimately
      // contain a year.
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        remember(key);
        walk(value);
      }
    }
  };

  walk(facts);
  return allowed;
}

/**
 * True when every number and date in the text came from the facts.
 *
 * A percentage is never grounded: the product has no percentages, so a "%"
 * anywhere in the answer means the model invented a measure this product does
 * not compute — most likely a chance of admission.
 */
export function isGrounded(text: string, facts: unknown): boolean {
  if (/%/.test(text)) return false;

  const allowed = collectGroundedValues(facts);

  for (const match of text.match(NUMBER_PATTERN) ?? []) {
    if (allowed.has(normalizeNumber(match))) continue;

    // Fall back to digit groups, so "20 ноября 2026" matches "2026-11-20".
    const parts = match.match(DIGIT_PATTERN) ?? [];
    if (parts.every((part) => allowed.has(stripLeadingZeros(part)))) continue;

    return false;
  }

  return true;
}

/** `1 500 000` and `1,5` compare equal to `1500000` and `1.5`. */
function normalizeNumber(value: string): string {
  const compact = value.replace(/[ \s]/g, "");
  const decimal = compact.replace(",", ".");
  return decimal.includes(".") ? String(Number(decimal)) : stripLeadingZeros(decimal);
}

function stripLeadingZeros(value: string): string {
  const trimmed = value.replace(/^0+(?=\d)/, "");
  return trimmed === "" ? "0" : trimmed;
}
