import { z } from "zod";

/**
 * The AI boundary's contract, in one file.
 *
 * Three routes, three request shapes, three response shapes — and a rule that
 * shows up in every schema below: the model may return words, and it may return
 * which of the applicant's own statements it recognised. It may not return a
 * date, a countdown, a score or a number of routes, because those are computed
 * before it is called and it has no way to know them.
 *
 * Note what is structurally absent: there is no field anywhere here for a
 * probability, a chance or a rating. The model cannot invent one because there
 * is nowhere to put it.
 */

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

export type Locale = "ru" | "kk" | "en";
export const localeSchema = z.enum(["ru", "kk", "en"]);

export const toneSchema = z.enum(["friendly", "direct"]);
export type Tone = z.infer<typeof toneSchema>;

/**
 * How a parsed fact came to be.
 *
 * `stated` — the applicant wrote it. `inferred` — a cautious reading of what
 * they wrote ("люблю код" → programming). `unknown` — nobody said.
 *
 * This is about the *applicant's* words and is deliberately a different type
 * from `Confidence` in the domain model, which is about whether a human checked
 * a university's website. A model extracting a fact perfectly still does not
 * make that fact verified.
 */
export const factConfidenceSchema = z.enum(["stated", "inferred", "unknown"]);
export type FactConfidence = z.infer<typeof factConfidenceSchema>;

/** A contradiction inside the applicant's own text, never resolved by guessing. */
export const conflictSchema = z.object({
  field: z.string().min(1).max(64),
  values: z.array(z.string().max(120)).min(2).max(4),
  explanation: z.string().min(1).max(240),
});
export type Conflict = z.infer<typeof conflictSchema>;

/* -------------------------------------------------------------------------- */
/* /api/parse                                                                  */
/* -------------------------------------------------------------------------- */

/** 4000 characters is a long paragraph about yourself and a hard ceiling. */
export const parseRequestSchema = z.object({
  text: z.string().min(1).max(4_000),
  locale: localeSchema.default("ru"),
});
export type ParseRequest = z.infer<typeof parseRequestSchema>;

/**
 * The profile the model is allowed to return.
 *
 * A deliberately narrow mirror of `Profile`: every field optional, nothing
 * derived, no dates and no catalogue facts. Anything the applicant did not say
 * must simply be absent — the schema has no way to express a guess.
 */
export const parsedProfileSchema = z.object({
  grade: z.number().int().min(5).max(13).optional(),
  age: z.number().int().min(10).max(60).optional(),
  interests: z.array(z.string().min(1).max(60)).max(8).optional(),
  countries: z.array(z.string().min(2).max(2)).max(8).optional(),
  budget_per_year: z
    .object({ amount: z.number().min(0).max(1_000_000_000), currency: z.enum(["KZT", "USD", "EUR"]) })
    .optional(),
  languages: z
    .array(
      z.object({
        code: z.string().min(2).max(3),
        level: z.string().max(12).optional(),
        score: z.number().min(0).max(200).optional(),
      }),
    )
    .max(6)
    .optional(),
  exams: z
    .array(
      z.object({
        id: z.string().min(1).max(24),
        score: z.number().min(0).max(2_000).optional(),
        status: z.enum(["planned", "registered", "taken", "completed"]),
      }),
    )
    .max(6)
    .optional(),
  constraints: z
    .object({
      can_relocate: z.boolean().optional(),
      needs_full_funding: z.boolean().optional(),
    })
    .optional(),
});
export type ParsedProfileFields = z.infer<typeof parsedProfileSchema>;

export const parseResponseSchema = z.object({
  profile: parsedProfileSchema,
  conflicts: z.array(conflictSchema).max(6),
  confidence: z.record(z.string(), factConfidenceSchema),
  /** True when the deterministic parser produced this, not the model. */
  fallback: z.boolean(),
});
export type ParseResponse = z.infer<typeof parseResponseSchema>;

/** Exactly what the model is asked to return — no envelope, no commentary. */
export const parseModelOutputSchema = z.object({
  profile: parsedProfileSchema,
  conflicts: z.array(conflictSchema).max(6),
  confidence: z.record(z.string(), factConfidenceSchema),
});

/* -------------------------------------------------------------------------- */
/* /api/explain                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The facts an explanation may use.
 *
 * This is a projection of a computed `Door`, not a programme record: the engine
 * has already decided the status, the date and the countdown, and the model
 * receives the answer rather than the inputs. It never sees the catalogue.
 */
export const doorFactsSchema = z.object({
  program_id: z.string().max(64),
  program_name: z.string().max(160),
  org: z.string().max(160).optional(),
  country: z.string().max(4).optional(),
  status: z.enum(["open", "closing_soon", "closed", "needs_data"]),
  point_of_no_return: z.string().max(10).optional(),
  days_remaining: z.number().int().optional(),
  next_critical_action: z.string().max(160).optional(),
  matched_requirements: z.array(z.string().max(160)).max(12).default([]),
  unmatched_requirements: z.array(z.string().max(160)).max(12).default([]),
  reasons: z.array(z.string().max(300)).max(8).default([]),
  blockers: z.array(z.string().max(300)).max(8).default([]),
  confidence: z.enum(["verified", "derived", "last_cycle", "demo"]),
});
export type DoorFacts = z.infer<typeof doorFactsSchema>;

export const profileSummarySchema = z.object({
  interests: z.array(z.string().max(60)).max(8).default([]),
  countries: z.array(z.string().max(4)).max(8).default([]),
  languages: z.array(z.string().max(12)).max(6).default([]),
  needs_full_funding: z.boolean().optional(),
});
export type ProfileSummary = z.infer<typeof profileSummarySchema>;

export const explainRequestSchema = z.object({
  door: doorFactsSchema,
  profile_summary: profileSummarySchema,
  tone: toneSchema.default("friendly"),
});
export type ExplainRequest = z.infer<typeof explainRequestSchema>;

export const explainResponseSchema = z.object({
  text: z.string().min(1).max(900),
  /** True when every number in the text traces back to the supplied facts. */
  grounded: z.boolean(),
  /**
   * True when the deterministic template produced this.
   *
   * Separate from `grounded` on purpose: a template is grounded by
   * construction, so that flag cannot tell a caller who wrote the sentence —
   * and a screen must never credit a model for a sentence it did not write.
   */
  fallback: z.boolean(),
});
export type ExplainResponse = z.infer<typeof explainResponseSchema>;

export const explainModelOutputSchema = z.object({
  text: z.string().min(20).max(700),
});

/* -------------------------------------------------------------------------- */
/* /api/diff                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The already-computed difference.
 *
 * The deterministic diff engine decided what opened, what closed and which date
 * moved. The model is handed the result and asked for wording. It is not handed
 * two boards to compare, because then it could compare them.
 */
export const diffFactsSchema = z.object({
  opened: z.array(z.string().max(64)).max(40).default([]),
  closed: z.array(z.string().max(64)).max(40).default([]),
  became_data_missing: z.array(z.string().max(64)).max(40).default([]),
  became_data_available: z.array(z.string().max(64)).max(40).default([]),
  deadline_changes: z
    .array(
      z.object({
        program_id: z.string().max(64),
        old_date: z.string().max(10).optional(),
        new_date: z.string().max(10).optional(),
        delta_days: z.number().int().optional(),
      }),
    )
    .max(40)
    .default([]),
  next_action_changed: z.boolean().default(false),
  old_next_action: z.string().max(160).optional(),
  new_next_action: z.string().max(160).optional(),
});
export type DiffFacts = z.infer<typeof diffFactsSchema>;

export const diffRequestSchema = z.object({
  before: diffFactsSchema.optional(),
  after: diffFactsSchema.optional(),
  /** The computed difference. Required: without it there is nothing to explain. */
  diff: diffFactsSchema,
  changed_field: z.string().max(64),
  old_value: z.string().max(200).optional(),
  new_value: z.string().max(200).optional(),
  tone: toneSchema.default("friendly"),
});
export type DiffRequest = z.infer<typeof diffRequestSchema>;

export const diffResponseSchema = z.object({
  headline: z.string().min(1).max(200),
  reasons: z.array(z.string().max(300)).max(6),
  grounded: z.boolean(),
  /** True when the deterministic template produced this. See explain above. */
  fallback: z.boolean(),
});
export type DiffResponse = z.infer<typeof diffResponseSchema>;

export const diffModelOutputSchema = z.object({
  headline: z.string().min(5).max(160),
  reasons: z.array(z.string().min(5).max(240)).max(4),
});

