import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

import { AI_MODEL, getAnthropic } from "./client";

/**
 * The one place a language model is actually called.
 *
 * Everything about that call is narrow on purpose: one provider, one model, a
 * hard timeout, a bounded output, exactly one retry, and a schema the answer
 * has to satisfy before anything downstream sees it. The routes above this file
 * do not talk to the SDK and do not know what a token is.
 *
 * The contract with callers is that this never throws and never returns
 * something unvalidated. It returns the parsed value or the reason it could
 * not, and the caller falls back to deterministic output — which is why the
 * product keeps working with no key, a dead provider or a nonsense answer.
 */

/** Ten seconds: a screen waiting longer than that has already failed the user. */
const TIMEOUT_MS = 10_000;

/** Bounded so a runaway answer cannot cost a fortune or block a request. */
const MAX_TOKENS = 1_024;

export type BoundaryFailure =
  | "no_key"
  | "invalid_output"
  | "rate_limited"
  | "timeout"
  | "provider_error";

export type BoundaryResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: BoundaryFailure };

export interface BoundaryCall<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

/**
 * Ask the model for one JSON object and validate it.
 *
 * Malformed output gets exactly one more attempt, with the failure quoted back
 * and a stricter instruction — models usually fix their own JSON when shown
 * what broke. A second failure is a fallback, not a third attempt: retrying a
 * model that has already misunderstood twice spends a user's time to get the
 * same answer.
 *
 * Operational failures — no key, rate limit, timeout, provider outage — never
 * retry at all. The deterministic path is instant and always available, and
 * hammering a provider that just said no is how a demo turns into a spinner.
 */
export async function callModel<T>({ system, user, schema }: BoundaryCall<T>): Promise<BoundaryResult<T>> {
  const client = getAnthropic();
  if (client === null) return { ok: false, reason: "no_key" };

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      const response = await client.messages.create(
        {
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages,
        },
        { timeout: TIMEOUT_MS },
      );
      raw = textOf(response);
    } catch (error) {
      return { ok: false, reason: classify(error) };
    }

    const parsed = parseJson(raw);
    if (parsed.ok) {
      const validated = schema.safeParse(parsed.value);
      if (validated.success) return { ok: true, value: validated.data };

      if (attempt === 0) {
        messages = [
          ...messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content:
              `Ответ не прошёл проверку схемы: ${validated.error.issues
                .slice(0, 3)
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; ")}. ` +
              "Верни ровно один JSON-объект по схеме, без пояснений, без markdown и без полей, которых нет в схеме.",
          },
        ];
        continue;
      }
      return { ok: false, reason: "invalid_output" };
    }

    if (attempt === 0) {
      messages = [
        ...messages,
        { role: "assistant", content: raw },
        {
          role: "user",
          content:
            "Это не JSON. Верни ровно один JSON-объект без markdown-разметки, без комментариев и без текста вокруг.",
        },
      ];
      continue;
    }
    return { ok: false, reason: "invalid_output" };
  }

  return { ok: false, reason: "invalid_output" };
}

/** The text of the answer, ignoring any thinking blocks. */
function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/**
 * JSON from a model, tolerating the one thing they all do anyway.
 *
 * A fenced block is unwrapped; anything else is parsed as-is and allowed to
 * fail, because guessing at broken JSON is how invented values get in.
 */
function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  const candidate = (fenced?.[1] ?? raw).trim();
  if (candidate === "") return { ok: false };

  try {
    return { ok: true, value: JSON.parse(candidate) as unknown };
  } catch {
    return { ok: false };
  }
}

/** Provider failures, named so the route can answer honestly. */
function classify(error: unknown): BoundaryFailure {
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (error instanceof Anthropic.APIError) return "provider_error";
  if (error instanceof Error && /timeout|aborted/i.test(error.message)) return "timeout";
  return "provider_error";
}
