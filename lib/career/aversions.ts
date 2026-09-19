import { SPECIALIZATIONS_BY_FIELD } from "./specializations/index";

/**
 * §4 Q10's veto map, transcribed verbatim and marked in the document as
 * "расширяемая инженером" (extensible by the engineer) — new entries are
 * additive, never a replacement of what the document already states.
 *
 * A veto is absolute: any specialization it names must never appear at any
 * stage, including stage 3b's free-form interview (§11.2, test #2). This is
 * why the veto set is computed once from the student's answers and then
 * threaded through every stage's candidate list as a hard filter, not a
 * scoring penalty.
 */
export interface AversionRule {
  /** Shown back to the student as the chip/label that triggered this rule. */
  label: string;
  /** Loose keyword match over the student's own Q10 free text. */
  pattern: RegExp;
  vetoedIds: readonly string[];
}

const ALL_IT_IDS = SPECIALIZATIONS_BY_FIELD.IT.map((spec) => spec.id);
const ALL_SEC_IDS = SPECIALIZATIONS_BY_FIELD.SEC.map((spec) => spec.id);

export const AVERSION_RULES: readonly AversionRule[] = [
  {
    label: "кровь",
    pattern: /кров|операц/i,
    vetoedIds: ["MED_SURG", "MED_GP", "MED_EMS", "MED_VET"],
  },
  {
    label: "публичные выступления",
    pattern: /публичн|выступлен|сцен/i,
    vetoedIds: ["LAW_CRIM", "LAW_DIPL", "ART_PERF", "EDU_TEACH", "BIZ_SALES"],
  },
  {
    label: "сидеть весь день",
    pattern: /сидеть весь день|весь день сидеть|целый день за (компьютером|столом|экраном)/i,
    vetoedIds: [...ALL_IT_IDS, "BIZ_ACC", "SCI_MATH"],
  },
  {
    label: "командировки и вахта",
    pattern: /командировк|вахт[аеы]?\b/i,
    vetoedIds: ["ENG_PETRO", "ENG_MINE", "ENV_GEO", "TRD_RAIL"],
  },
  {
    label: "форма и подчинение",
    pattern: /\bформ[ауеы]?\b|подчинени|устав\b/i,
    vetoedIds: [...ALL_SEC_IDS],
  },
  {
    label: "дети",
    pattern: /\bдет[ьяиь]|дошкольник|школьник/i,
    vetoedIds: ["EDU_EARLY", "EDU_TEACH", "EDU_SLP"],
  },
  {
    label: "математика",
    pattern: /математик|формул|расчёт|расчет/i,
    vetoedIds: ["SCI_MATH", "SCI_PHYS", "IT_DS", "BIZ_FIN"],
  },
];

/** Every specialization id vetoed by any rule matching this free text. */
export function matchAversions(text: string): { rule: AversionRule; label: string }[] {
  const matched: { rule: AversionRule; label: string }[] = [];
  for (const rule of AVERSION_RULES) {
    if (rule.pattern.test(text)) matched.push({ rule, label: rule.label });
  }
  return matched;
}

/** The union of vetoed specialization ids across a set of matched rules. */
export function vetoedIdsFrom(rules: readonly AversionRule[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const rule of rules) for (const id of rule.vetoedIds) ids.add(id);
  return ids;
}
