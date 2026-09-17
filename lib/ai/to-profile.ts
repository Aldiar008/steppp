import type { Profile } from "@/lib/types";
import type { ParsedProfileFields } from "./contracts";

/**
 * Parsed fields onto a profile.
 *
 * The same mapping whether the fields came from the model or from the rule
 * parser, so the two paths can never produce differently-shaped profiles. Only
 * fields that are actually present are written: an absent field means the
 * applicant did not say, and "did not say" is a state the whole engine knows
 * how to handle.
 *
 * Nothing is derived here. This copies.
 */
export function profileFromParsed(fields: ParsedProfileFields, base?: Profile): Profile {
  const profile: Profile = base
    ? { ...base, constraints: { ...base.constraints } }
    : { interests: [], countries: [], languages: [], exams: [], constraints: {} };

  if (fields.grade !== undefined) profile.grade = fields.grade;
  if (fields.age !== undefined) profile.age = fields.age;
  if (fields.interests !== undefined) profile.interests = merge(profile.interests, fields.interests);
  if (fields.countries !== undefined) profile.countries = merge(profile.countries, fields.countries);
  if (fields.budget_per_year !== undefined) profile.budget_per_year = fields.budget_per_year;

  if (fields.languages !== undefined) {
    profile.languages = [...profile.languages];
    for (const language of fields.languages) {
      const existing = profile.languages.findIndex((item) => item.code === language.code);
      if (existing >= 0) profile.languages[existing] = language;
      else profile.languages.push(language);
    }
  }

  if (fields.exams !== undefined) {
    profile.exams = [...profile.exams];
    for (const exam of fields.exams) {
      const existing = profile.exams.findIndex((item) => item.id === exam.id);
      if (existing >= 0) profile.exams[existing] = exam;
      else profile.exams.push(exam);
    }
  }

  if (fields.constraints?.can_relocate !== undefined) {
    profile.constraints.can_relocate = fields.constraints.can_relocate;
  }
  if (fields.constraints?.needs_full_funding !== undefined) {
    profile.constraints.needs_full_funding = fields.constraints.needs_full_funding;
  }

  return profile;
}

function merge(current: readonly string[], additions: readonly string[]): string[] {
  const next = [...current];
  for (const addition of additions) if (!next.includes(addition)) next.push(addition);
  return next;
}
