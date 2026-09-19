import "server-only";

/**
 * Server-only Gemini configuration.
 *
 * The key never leaves the server, and the app degrades to deterministic
 * behaviour when no key is configured, so a demo machine without credentials
 * still works end to end. No SDK dependency: Gemini's `generateContent` REST
 * endpoint is one `fetch` call, made in `./boundary.ts`.
 */
export function getGeminiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

/**
 * Overridable via env so a model rename never needs a code change — which
 * already happened once while wiring this up: `gemini-2.0-flash` came back
 * `404` with the API's own error naming `gemini-3.6-flash` as its
 * replacement, confirmed against the real endpoint before shipping.
 */
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export function isAiConfigured(): boolean {
  return Boolean(getGeminiKey());
}
