/**
 * Languages of instruction, by their ISO code.
 *
 * Lives in the data layer rather than inside the engine because two very
 * different callers need it: the engine, to say *why* a route fits, and the
 * screens, to show what the applicant answered. Two copies would drift, and the
 * drift would show up as "en" in one sentence and "английский" in the next.
 */
export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  en: "английский",
  ru: "русский",
  kk: "казахский",
  de: "немецкий",
  fr: "французский",
  tr: "турецкий",
  ko: "корейский",
  zh: "китайский",
  it: "итальянский",
  cs: "чешский",
  hu: "венгерский",
  ja: "японский",
  nl: "нидерландский",
  pl: "польский",
  sv: "шведский",
};

/** The name, or the code itself — visible and fixable, never a blank. */
export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}
