/**
 * Changing one field of a profile, safely.
 *
 * Two features need this and must never disagree about it: counterfactual
 * analysis, which asks what a change would buy, and the interview, which asks
 * the applicant to make one. If each wrote its own setter, "I speak English"
 * would mean one thing on one screen and something else on the other.
 *
 * The mapping is an explicit switch, never a path-string writer. A string-driven
 * setter accepts `"constraints.anything"` and quietly grows a field the rest of
 * the engine has never heard of; this one only compiles for fields that exist.
 *
 * Pure and immutable down the touched path: the profile handed in, its arrays
 * and its `constraints` object all come back untouched, and only the named
 * field differs in the result.
 */
import type { Cost, Profile, ProfileExam, ProfileLanguage } from "@/lib/types";
import { normalizeLanguage } from "./match";

/**
 * One change, typed by the field it touches.
 *
 * List fields are *additive*: a change adds a language, an exam result or a
 * country and never silently drops what the applicant already has. `exams` and
 * `languages` replace the entry with the same id or code, so "IELTS 6.5" over
 * an older "IELTS 5.5" updates the score instead of listing the test twice.
 */
export type ProfileChange =
  | { field: "interests"; to: string[] }
  | { field: "countries"; to: string[] }
  | { field: "languages"; to: ProfileLanguage }
  | { field: "exams"; to: ProfileExam }
  | { field: "budget_per_year"; to: Cost }
  | { field: "grade"; to: number }
  | { field: "constraints.can_relocate"; to: boolean }
  | { field: "constraints.needs_full_funding"; to: boolean }
  | { field: "constraints.max_tuition_per_year"; to: Cost };

export type ProfileField = ProfileChange["field"];

export const PROFILE_FIELDS: readonly ProfileField[] = [
  "interests",
  "countries",
  "languages",
  "exams",
  "budget_per_year",
  "grade",
  "constraints.can_relocate",
  "constraints.needs_full_funding",
  "constraints.max_tuition_per_year",
];

/** The profile as it would be with this change applied. */
export function applyProfileChange(profile: Profile, change: ProfileChange): Profile {
  switch (change.field) {
    case "interests":
      return { ...profile, interests: appendMissing(profile.interests, change.to) };

    case "countries":
      return { ...profile, countries: appendMissing(profile.countries, change.to) };

    case "languages": {
      const code = normalizeLanguage(change.to.code);
      const kept = profile.languages.filter(
        (language) => normalizeLanguage(language.code) !== code,
      );
      return { ...profile, languages: [...kept, change.to] };
    }

    case "exams": {
      const kept = profile.exams.filter((exam) => exam.id !== change.to.id);
      return { ...profile, exams: [...kept, change.to] };
    }

    case "budget_per_year":
      return { ...profile, budget_per_year: change.to };

    case "grade":
      return { ...profile, grade: change.to };

    case "constraints.can_relocate":
      return { ...profile, constraints: { ...profile.constraints, can_relocate: change.to } };

    case "constraints.needs_full_funding":
      return {
        ...profile,
        constraints: { ...profile.constraints, needs_full_funding: change.to },
      };

    case "constraints.max_tuition_per_year":
      return {
        ...profile,
        constraints: { ...profile.constraints, max_tuition_per_year: change.to },
      };

    default:
      return unsupportedField(change);
  }
}

/**
 * The value the profile holds at the field a change touches.
 *
 * For the two upsert fields it is the matching entry rather than the whole
 * list, so "IELTS: nothing → 6.5" reads as one fact rather than two arrays.
 */
export function readProfileField(profile: Profile, change: ProfileChange): unknown {
  switch (change.field) {
    case "interests":
      return profile.interests;
    case "countries":
      return profile.countries;
    case "languages": {
      const code = normalizeLanguage(change.to.code);
      return profile.languages.find((language) => normalizeLanguage(language.code) === code);
    }
    case "exams":
      return profile.exams.find((exam) => exam.id === change.to.id);
    case "budget_per_year":
      return profile.budget_per_year;
    case "grade":
      return profile.grade;
    case "constraints.can_relocate":
      return profile.constraints.can_relocate;
    case "constraints.needs_full_funding":
      return profile.constraints.needs_full_funding;
    case "constraints.max_tuition_per_year":
      return profile.constraints.max_tuition_per_year;
    default:
      return unsupportedField(change);
  }
}

/**
 * The whole value a profile holds at a field.
 *
 * `readProfileField` needs a change to know *which* entry of a list to look at;
 * this one answers the simpler question a "что изменилось" line asks — what did
 * this field look like before, and what does it look like now.
 */
export function readProfileFieldValue(profile: Profile, field: ProfileField): unknown {
  switch (field) {
    case "interests":
      return profile.interests;
    case "countries":
      return profile.countries;
    case "languages":
      return profile.languages;
    case "exams":
      return profile.exams;
    case "budget_per_year":
      return profile.budget_per_year;
    case "grade":
      return profile.grade;
    case "constraints.can_relocate":
      return profile.constraints.can_relocate;
    case "constraints.needs_full_funding":
      return profile.constraints.needs_full_funding;
    case "constraints.max_tuition_per_year":
      return profile.constraints.max_tuition_per_year;
    default:
      return undefined;
  }
}

/**
 * Whether the applicant has already told us about this field.
 *
 * An empty list is not an answer — nobody "has no interests", they have not
 * said yet — so a blank list counts as unknown and the interview may ask. An
 * explicit `false` on a constraint *is* an answer and is left alone.
 */
export function isProfileFieldKnown(profile: Profile, field: ProfileField): boolean {
  switch (field) {
    case "interests":
      return profile.interests.length > 0;
    case "countries":
      return profile.countries.length > 0;
    case "languages":
      return profile.languages.length > 0;
    case "exams":
      return profile.exams.length > 0;
    case "budget_per_year":
      return profile.budget_per_year !== undefined;
    case "grade":
      return profile.grade !== undefined;
    case "constraints.can_relocate":
      return profile.constraints.can_relocate !== undefined;
    case "constraints.needs_full_funding":
      return profile.constraints.needs_full_funding !== undefined;
    case "constraints.max_tuition_per_year":
      return profile.constraints.max_tuition_per_year !== undefined;
    default:
      return false;
  }
}

/** Unreachable for authored data; a guard for anything that arrives as JSON. */
function unsupportedField(change: never): never {
  const field = (change as { field?: unknown }).field;
  throw new Error(`applyProfileChange: поле профиля не поддерживается: ${String(field)}`);
}

function appendMissing(current: readonly string[], additions: readonly string[]): string[] {
  const next = [...current];
  for (const addition of additions) if (!next.includes(addition)) next.push(addition);
  return next;
}
