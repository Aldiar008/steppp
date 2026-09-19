import { z } from "zod";

import { AXIS_IDS, FACET_IDS } from "@/lib/career/types";

/**
 * The career-interview module's own slice of the AI boundary.
 *
 * Three calls, matching the document's own "Роль ИИ" table: extracting axis
 * shifts from free text (§5 step 1's own instruction, quoted almost
 * verbatim below), picking the next stage-2 question from a fixed bank
 * (§6.3's system prompt), and running the stage-3b free-form interview
 * (§8.1's system prompt). None of the three schemas below has a field for a
 * percentage, a probability, a date or a name — the model has nowhere to put
 * one even if it tried. None of the three request payloads carries a
 * student's name, school, age, city, email or phone (§10.7) — those simply
 * are not fields on these types.
 */

const DIMENSION_IDS = [...FACET_IDS, ...AXIS_IDS] as const;
export const careerDimensionSchema = z.enum(DIMENSION_IDS);

/* -------------------------------------------------------------------------- */
/* Axis extraction from free text — §5 step 1                                 */
/* -------------------------------------------------------------------------- */

export const extractAxesRequestSchema = z.object({
  question_id: z.string().max(60),
  question_text: z.string().max(400),
  answer_text: z.string().min(1).max(1_500),
  /** Only the dimension ids this specific question is allowed to touch (kept short in the prompt). */
  allowed_dimensions: z.array(careerDimensionSchema).min(1).max(16),
});
export type ExtractAxesRequest = z.infer<typeof extractAxesRequestSchema>;

const extractedShiftSchema = z.object({
  dimension: careerDimensionSchema,
  amount: z.number().int().min(-50).max(50),
  quote: z.string().min(1).max(300),
});

export const extractAxesModelOutputSchema = z.object({
  shifts: z.array(extractedShiftSchema).max(6),
});
export type ExtractedShift = z.infer<typeof extractedShiftSchema>;

export const extractAxesResponseSchema = z.object({
  shifts: z.array(extractedShiftSchema),
  /** True when no model was available and the answer produced no shift at all. */
  fallback: z.boolean(),
});
export type ExtractAxesResponse = z.infer<typeof extractAxesResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Stage 2 — next question from the field's own bank, §6.3                    */
/* -------------------------------------------------------------------------- */

const stage2BankEntrySchema = z.object({
  id: z.string().max(40),
  prompt: z.string().max(400),
  axes: z.array(z.string().max(12)).max(4),
});

const stage2HistoryEntrySchema = z.object({
  question: z.string().max(400),
  answer: z.string().max(600),
});

export const stage2QuestionRequestSchema = z.object({
  field: z.string().max(4),
  /** Remaining candidate specializations — id and label only. */
  candidates: z.array(z.object({ id: z.string().max(40), label: z.string().max(120) })).min(1).max(12),
  /** Bank questions not yet asked. The model may only choose among these. */
  bank: z.array(stage2BankEntrySchema).min(1).max(11),
  history: z.array(stage2HistoryEntrySchema).max(20),
  aversion_labels: z.array(z.string().max(60)).max(10),
  questions_asked_total: z.number().int().min(0).max(20),
  questions_left: z.number().int().min(0).max(20),
});
export type Stage2QuestionRequest = z.infer<typeof stage2QuestionRequestSchema>;

export const stage2ModelOutputSchema = z.object({
  done: z.boolean(),
  /** Required, and must be one of the ids in the request's `bank`, when `done` is false. */
  bank_question_id: z.string().max(40).optional(),
});

export const stage2QuestionResponseSchema = z.object({
  done: z.boolean(),
  bank_question_id: z.string().nullable(),
  fallback: z.boolean(),
});
export type Stage2QuestionResponse = z.infer<typeof stage2QuestionResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Stage 3b — free-form interviewer, §8.1                                     */
/* -------------------------------------------------------------------------- */

const stage3bCandidateSchema = z.object({ id: z.string().max(40), label: z.string().max(120), field: z.string().max(4) });

export const stage3bTurnRequestSchema = z.object({
  candidates: z.array(stage3bCandidateSchema).min(1).max(130),
  rejected_ids: z.array(z.string().max(40)).max(60),
  aversion_labels: z.array(z.string().max(60)).max(10),
  history: z.array(stage2HistoryEntrySchema).max(20),
  turns_asked: z.number().int().min(0).max(20),
});
export type Stage3bTurnRequest = z.infer<typeof stage3bTurnRequestSchema>;

const stage3bQuestionOptionSchema = z.object({ value: z.string().max(40), label: z.string().max(160) });

export const stage3bModelOutputSchema = z
  .object({
    done: z.boolean(),
    title: z.string().max(240).optional(),
    type: z.enum(["single", "text"]).optional(),
    options: z.array(stage3bQuestionOptionSchema).max(5).optional(),
    /** §8.1 rule 6 — a short "here's what I understand so far" aside, at most every few turns. */
    insight: z.string().max(220).optional(),
    /** Required, from `candidates`, only when `done` is true. */
    result_ids: z.array(z.string().max(40)).max(3).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.done) {
      if (value.result_ids === undefined || value.result_ids.length === 0) {
        ctx.addIssue({ code: "custom", message: "result_ids обязателен, когда done=true", path: ["result_ids"] });
      }
      return;
    }
    if (value.title === undefined || value.title.length < 5) {
      ctx.addIssue({ code: "custom", message: "title обязателен, когда done=false", path: ["title"] });
    }
    if (value.type === "single" && (value.options === undefined || value.options.length < 2)) {
      ctx.addIssue({ code: "custom", message: "single требует минимум 2 options", path: ["options"] });
    }
  });

export const stage3bTurnResponseSchema = z.object({
  done: z.boolean(),
  question: z
    .object({ id: z.string(), title: z.string(), type: z.enum(["single", "text"]), options: z.array(stage3bQuestionOptionSchema).optional() })
    .nullable(),
  insight: z.string().nullable(),
  result_ids: z.array(z.string()).nullable(),
  /** True when the model was unavailable — stage 3b has no offline mode, see career-templates.ts. */
  unavailable: z.boolean(),
});
export type Stage3bTurnResponse = z.infer<typeof stage3bTurnResponseSchema>;
