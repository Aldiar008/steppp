import type { QuestionDefinition } from "@/lib/engine";

/**
 * What a spoken or typed sentence means for the question on screen.
 *
 * Deterministic and small: it matches words against the options the question
 * already offers, and reads a number when the question is a scale. There is no
 * model here — an answer misheard by a model is an invented fact about a
 * person, and this is the same boundary the rest of the product keeps.
 *
 * When nothing matches, nothing is answered. The transcript stays on screen and
 * the applicant taps instead, which is a worse interaction and an honest one.
 */

export type VoiceAnswer =
  | { kind: "option"; value: string; label: string }
  | { kind: "number"; value: number }
  | { kind: "unclear" };

/** Words people actually say instead of digits, up to the ranges we use. */
const SPOKEN_NUMBERS: Readonly<Record<string, number>> = {
  ноль: 0,
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
  одиннадцать: 11,
  двенадцать: 12,
};

export function interpretAnswer(question: QuestionDefinition, said: string): VoiceAnswer {
  const text = said.toLowerCase().trim();
  if (text === "") return { kind: "unclear" };

  // A scale question wants a number, and a number is what "6,5" and "шесть с
  // половиной" both are.
  if (question.scale !== undefined) {
    const value = readNumber(text);
    if (value !== null && value >= question.scale.min && value <= question.scale.max) {
      return { kind: "number", value };
    }
  }

  // Options are matched on their own words: the longest label that appears in
  // what was said wins, so "хочу в Польшу" finds "Польша" and not "Польша" plus
  // three other countries.
  let best: { value: string; label: string; length: number } | null = null;
  for (const option of question.options) {
    const label = option.label.toLowerCase();
    const stem = label.split(/[,(—]/)[0]?.trim() ?? label;
    if (stem.length < 3) continue;
    if (!text.includes(stem) && !includesStem(text, stem)) continue;
    if (best === null || stem.length > best.length) {
      best = { value: option.value, label: option.label, length: stem.length };
    }
  }
  if (best !== null) return { kind: "option", value: best.value, label: best.label };

  // "Да" and "нет" are answers to a yes/no question even when the buttons say
  // something longer.
  if (question.type === "boolean") {
    if (/\b(да|конечно|готов|нужен|нужно)\b/.test(text)) {
      const yes = question.options.find((option) => option.to === true);
      if (yes !== undefined) return { kind: "option", value: yes.value, label: yes.label };
    }
    if (/\b(нет|не готов|не нужен|не нужно)\b/.test(text)) {
      const no = question.options.find((option) => option.to === false);
      if (no !== undefined) return { kind: "option", value: no.value, label: no.label };
    }
  }

  return { kind: "unclear" };
}

/** Matches on a word stem, so "Польшу" finds the option labelled "Польша". */
function includesStem(text: string, label: string): boolean {
  const root = label.length > 5 ? label.slice(0, label.length - 2) : label;
  return root.length >= 4 && text.includes(root);
}

/**
 * A number out of speech or typing.
 *
 * Handles digits with either separator, "шесть с половиной", and spoken units
 * of thousands and millions, because that is how a budget gets said out loud.
 */
export function readNumber(text: string): number | null {
  const normalized = text.replace(/ /g, " ");

  const digits = /(\d+(?:[.,]\d+)?)/.exec(normalized);
  if (digits?.[1] !== undefined) {
    let value = Number(digits[1].replace(",", "."));
    if (!Number.isFinite(value)) return null;
    if (/(млн|миллион)/.test(normalized)) value *= 1_000_000;
    else if (/(тыс|тысяч)/.test(normalized)) value *= 1_000;
    else if (/с половиной/.test(normalized)) value += 0.5;
    return value;
  }

  for (const [word, value] of Object.entries(SPOKEN_NUMBERS)) {
    if (!new RegExp(`\\b${word}`).test(normalized)) continue;
    let result = value;
    if (/с половиной/.test(normalized)) result += 0.5;
    if (/(млн|миллион)/.test(normalized)) result *= 1_000_000;
    else if (/(тыс|тысяч)/.test(normalized)) result *= 1_000;
    return result;
  }

  return null;
}
