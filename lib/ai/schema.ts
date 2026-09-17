import { z } from "zod";

/**
 * The AI contract.
 *
 * Two jobs, both narrow:
 *   1. turn free text into profile fields the applicant could have typed anyway;
 *   2. put an already-computed result into plain sentences.
 *
 * Note what is absent from both schemas: dates, deadlines, day counts, scores,
 * probabilities. The model is structurally unable to return one, so it cannot
 * invent one. This is enforced here rather than asked for in a prompt.
 */

export const gradeSchema = z.enum(["9", "10", "11", "12", "graduated", "gap_year"]);
export const budgetSchema = z.enum([
  "scholarship_only",
  "under_5k",
  "under_15k",
  "under_30k",
  "over_30k",
]);
export const interestSchema = z.enum([
  "tech",
  "engineering",
  "business",
  "natural_sciences",
  "medicine",
  "social_law",
  "arts_design",
  "undecided",
]);
export const languageTestSchema = z.enum(["none", "ielts", "toefl", "duolingo", "other"]);

/** Two-letter country codes the catalogue knows about. */
export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Ожидается двухбуквенный код страны");

export const parsedProfileSchema = z.object({
  grade: gradeSchema.nullable(),
  homeCountry: countryCodeSchema.nullable(),
  intakeYear: z.number().int().min(2020).max(2040).nullable(),
  targetCountries: z.array(countryCodeSchema).max(6),
  interest: interestSchema.nullable(),
  budget: budgetSchema.nullable(),
  nationalScore: z.number().min(0).max(1000).nullable(),
  nationalTaken: z.boolean().nullable(),
  sat: z.number().int().min(400).max(1600).nullable(),
  languageTest: languageTestSchema.nullable(),
  languageScore: z.number().min(0).max(200).nullable(),
  /** Anything the model could not place, echoed back for the applicant to see. */
  unclear: z.array(z.string()).max(4),
});

export type ParsedProfile = z.infer<typeof parsedProfileSchema>;

export const explanationSchema = z.object({
  /** One sentence naming the single thing that matters right now. */
  headline: z.string().min(10).max(180),
  /** Two to four sentences of plain-language reasoning over the given numbers. */
  body: z.string().min(20).max(700),
});

export type Explanation = z.infer<typeof explanationSchema>;

export const parseRequestSchema = z.object({
  text: z.string().min(20).max(4000),
  homeCountry: z.string().max(2).optional(),
});

/**
 * Facts handed to the explainer. All of them are computed by the engine before
 * the request is made; the model may only rephrase what is in this object.
 */
export const explainRequestSchema = z.object({
  doorTitle: z.string().max(120),
  status: z.enum(["open", "at_risk", "critical", "closed", "blocked"]),
  pointOfNoReturn: z.string().max(10).nullable(),
  daysLeft: z.number().int().nullable(),
  bindingStep: z.string().max(160).nullable(),
  bindingLeadTimeDays: z.number().int().nullable(),
  fitBand: z.enum(["strong", "moderate", "weak"]),
  fitFactors: z.array(z.object({ label: z.string().max(120), detail: z.string().max(300) })).max(10),
  blockers: z.array(z.string().max(300)).max(5),
});

export type ExplainRequest = z.infer<typeof explainRequestSchema>;
