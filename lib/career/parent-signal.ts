import { FIELD_LABEL } from "./types";
import type { EvidenceEntry, FieldId } from "./types";

/**
 * Part 9 — the parent's own signal. Collected in the parent's own session
 * (see `supabase/migrations/0003_parent_career_signal.sql` and
 * `features/parent/parent-dashboard.tsx`), never merged into the student's
 * vector, never scored — the one comparison screen this data is for is built
 * entirely by deterministic code, exactly like the rest of this module's
 * "code decides the fact, prose only describes it" split
 * (`lib/ai/profession-templates.ts`'s old `buildConflictNote` was the same
 * idea for the module this replaces).
 */

export interface ParentCareerSignal {
  parent_direction?: string;
  parent_priorities?: string;
  parent_support?: string;
}

const FIELD_KEYWORDS: ReadonlyArray<readonly [FieldId, RegExp]> = [
  ["MED", /медицин|врач|доктор|стоматолог|фарма|ветерин|медсестр/i],
  ["IT", /программ|разработ|\bit\b|айти|данные|кибер/i],
  ["ENG", /инженер|констру|механик|электрик|строител/i],
  ["SCI", /наук[аи]|исследовател|физик|хими[кя]|математик|учён/i],
  ["BIZ", /бизнес|экономик|финанс|маркетинг|менеджер|предпринимат|банк/i],
  ["LAW", /юрист|право|политик|госслужб|дипломат|адвокат/i],
  ["ART", /дизайн|архитектур|искусств|музык|кино|творчеств|художник/i],
  ["EDU", /педагог|учител|психолог|воспитател/i],
  ["ENV", /эколог|агроном|геолог|природ|фермер/i],
  ["TRD", /рабоч|мастер|сварщик|станочник|пилот|автомехан/i],
  ["SEC", /военн|полиц|спасател|\bмчс\b|спорт|охран/i],
];

/** A cautious keyword-only read of the parent's free text — never asserted as fact, only used to decide whether a comparison is worth showing. */
export function classifyParentDirection(text: string | undefined): FieldId | null {
  if (text === undefined || text.trim() === "") return null;
  for (const [field, pattern] of FIELD_KEYWORDS) {
    if (pattern.test(text)) return field;
  }
  return null;
}

export interface ParentComparison {
  agrees: boolean;
  note: string;
}

/**
 * §9.2's comparison screen, built the same way for every family: the field
 * match is decided by code, the one quoted sentence is the strongest thing
 * the student's own evidence says — never a model's guess at what matters.
 */
export function buildParentComparison(
  signal: ParentCareerSignal,
  studentField: FieldId,
  evidence: readonly EvidenceEntry[],
): ParentComparison | null {
  const parentField = classifyParentDirection(signal.parent_direction);
  if (parentField === null) return null;

  const strongest = [...evidence].sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))[0];
  const quote = strongest === undefined ? null : `«${strongest.quote}»`;

  if (parentField === studentField) {
    return {
      agrees: true,
      note:
        `Вы назвали направление «${FIELD_LABEL[studentField]}», и по собственным ответам ребёнка ближе всего оказалось ` +
        `то же самое.${quote !== null ? ` Он сам сказал: ${quote}.` : ""}`,
    };
  }

  return {
    agrees: false,
    note:
      `Вы назвали «${FIELD_LABEL[parentField]}». Он отвечал так, что ближе всего оказалось «${FIELD_LABEL[studentField]}».` +
      `${quote !== null ? ` Сам он говорит: ${quote}.` : ""} Это не значит, что кто-то из вас прав — это значит, что есть о чём поговорить.`,
  };
}
