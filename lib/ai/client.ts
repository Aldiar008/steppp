import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client.
 *
 * The prototype put a gateway URL and a bearer token in the browser bundle and
 * left the edge function open to anonymous callers. Here the key never leaves
 * the server, and the app degrades to deterministic behaviour when no key is
 * configured, so a demo machine without credentials still works end to end.
 */
let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  cached ??= new Anthropic();
  return cached;
}

export const AI_MODEL = "claude-opus-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
