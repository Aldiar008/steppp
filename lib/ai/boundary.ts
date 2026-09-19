import "server-only";

import type { z } from "zod";

import { AI_MODEL, getGeminiKey } from "./client";

/**
 * The one place a language model is actually called.
 *
 * Everything about that call is narrow on purpose: one provider, one model, a
 * hard timeout, a bounded output, exactly one retry, and a schema the answer
 * has to satisfy before anything downstream sees it. The routes above this file
 * do not talk to the API and do not know what a token is.
 *
 * The contract with callers is that this never throws and never returns
 * something unvalidated. It returns the parsed value or the reason it could
 * not, and the caller falls back to deterministic output — which is why the
 * product keeps working with no key, a dead provider or a nonsense answer.
 *
 * Provider is Google Gemini, called directly over `fetch` — no SDK, so
 * swapping providers again later only ever touches this one file. JSON mode
 * (`responseMimeType`) does the work a hand-rolled fenced-code-block strip
 * used to do for the previous provider; `parseJson` below still tolerates one
 * anyway, since a model asked twice for corrected JSON sometimes wraps it.
 */

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
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
  const key = getGeminiKey();
  if (key === null) return { ok: false, reason: "no_key" };

  let contents: GeminiContent[] = [{ role: "user", parts: [{ text: user }] }];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      raw = await requestOnce(key, system, contents);
    } catch (error) {
      return { ok: false, reason: classify(error) };
    }

    const parsed = parseJson(raw);
    if (parsed.ok) {
      const validated = schema.safeParse(parsed.value);
      if (validated.success) return { ok: true, value: validated.data };

      if (attempt === 0) {
        contents = [
          ...contents,
          { role: "model", parts: [{ text: raw }] },
          {
            role: "user",
            parts: [
              {
                text:
                  `Ответ не прошёл проверку схемы: ${validated.error.issues
                    .slice(0, 3)
                    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                    .join("; ")}. ` +
                  "Верни ровно один JSON-объект по схеме, без пояснений, без markdown и без полей, которых нет в схеме.",
              },
            ],
          },
        ];
        continue;
      }
      return { ok: false, reason: "invalid_output" };
    }

    if (attempt === 0) {
      contents = [
        ...contents,
        { role: "model", parts: [{ text: raw }] },
        {
          role: "user",
          parts: [{ text: "Это не JSON. Верни ровно один JSON-объект без markdown-разметки, без комментариев и без текста вокруг." }],
        },
      ];
      continue;
    }
    return { ok: false, reason: "invalid_output" };
  }

  return { ok: false, reason: "invalid_output" };
}

async function requestOnce(key: string, system: string, contents: GeminiContent[]): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL(AI_MODEL)}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          responseMimeType: "application/json",
          temperature: 0.4,
          // Gemini 3's "thinking" competes with the visible answer for the
          // same token budget — confirmed live: with this left on, a
          // one-line JSON reply came back truncated mid-string
          // (`finishReason: "MAX_TOKENS"`) after spending 188 of 200 tokens
          // on unseen reasoning. None of this boundary's tasks (extraction,
          // picking one id, short grounded prose) need deliberation; turning
          // it off makes the JSON reliably complete instead of tuning the
          // budget around an invisible cost.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpFailure(response.status);
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    return textOf(data);
  } finally {
    clearTimeout(timer);
  }
}

interface GeminiGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}

/** The text of the answer, joining every part Gemini returned. */
function textOf(response: GeminiGenerateContentResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
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

/** Thrown for a non-2xx HTTP response, carrying the status `classify` needs. */
class HttpFailure extends Error {
  constructor(public readonly status: number) {
    super(`Gemini HTTP ${status}`);
  }
}

/** Provider failures, named so the route can answer honestly. */
function classify(error: unknown): BoundaryFailure {
  if (error instanceof HttpFailure) {
    if (error.status === 429) return "rate_limited";
    if (error.status === 408 || error.status === 504) return "timeout";
    return "provider_error";
  }
  if (error instanceof DOMException && error.name === "AbortError") return "timeout";
  if (error instanceof Error && /timeout|aborted/i.test(error.message)) return "timeout";
  return "provider_error";
}
