"use client";

import type {
  ExtractAxesRequest,
  ExtractAxesResponse,
  Stage2QuestionRequest,
  Stage2QuestionResponse,
  Stage3bTurnRequest,
  Stage3bTurnResponse,
} from "@/lib/ai/career-contracts";
import type { DiffRequest, DiffResponse, ExplainRequest, ExplainResponse, ParseRequest, ParseResponse } from "@/lib/ai/contracts";

/**
 * The client's only door to the AI layer.
 *
 * Screens call these functions; nothing in the browser knows the provider
 * exists, and no component writes `fetch("/api/...")` of its own. That is what
 * keeps the key on the server and the SDK out of the bundle.
 *
 * Every function here answers, always. A failed request, an offline device or
 * a server that returned nonsense all end in a deterministic result rather than
 * a thrown error, because the screens above this file are not allowed to break
 * when a language model is unavailable.
 *
 * Responses are cached in `localStorage` by a hash of the request. The cache is
 * a presentation optimisation and nothing more: it holds wording, never facts.
 * Doors, dates and counts are recomputed by the engine on every render and are
 * never read from here.
 */

const CACHE_PREFIX = "stepwise-ai";
/** Bump when a prompt or contract changes, so old wording is not reused. */
const CACHE_VERSION = 1;
const CACHE_LIMIT = 40;
const REQUEST_TIMEOUT_MS = 12_000;

export interface AiOutcome<T> {
  value: T;
  /** False when the value came from the deterministic layer. */
  fromModel: boolean;
  cached: boolean;
}

/* -------------------------------------------------------------------------- */
/* Public calls                                                                */
/* -------------------------------------------------------------------------- */

export async function parseProfileText(
  request: ParseRequest,
  fallback: ParseResponse,
): Promise<AiOutcome<ParseResponse>> {
  return call<ParseResponse>("/api/parse", request, fallback, (value) => !value.fallback);
}

export async function explainDoor(
  request: ExplainRequest,
  fallback: ExplainResponse,
): Promise<AiOutcome<ExplainResponse>> {
  return call<ExplainResponse>("/api/explain", request, fallback, (value) => !value.fallback);
}

export async function explainDiff(
  request: DiffRequest,
  fallback: DiffResponse,
): Promise<AiOutcome<DiffResponse>> {
  return call<DiffResponse>("/api/diff", request, fallback, (value) => !value.fallback);
}

/**
 * The career interview's three calls (§5/§6.3/§8.1). None of these are
 * cached like the calls above them — a career question or extraction is
 * unique to the moment it was asked, never worth reusing for a different
 * student's answer, so caching would only risk showing one student's
 * wording keyed off another's near-identical request.
 */

export async function extractCareerAxes(
  request: ExtractAxesRequest,
  fallback: ExtractAxesResponse,
): Promise<AiOutcome<ExtractAxesResponse>> {
  return callUncached<ExtractAxesResponse>("/api/career-extract-axes", request, fallback, (value) => !value.fallback);
}

export async function nextCareerQuestion(
  request: Stage2QuestionRequest,
  fallback: Stage2QuestionResponse,
): Promise<AiOutcome<Stage2QuestionResponse>> {
  return callUncached<Stage2QuestionResponse>("/api/career-next-question", request, fallback, (value) => !value.fallback);
}

export async function careerFreeformTurn(
  request: Stage3bTurnRequest,
  fallback: Stage3bTurnResponse,
): Promise<AiOutcome<Stage3bTurnResponse>> {
  return callUncached<Stage3bTurnResponse>("/api/career-freeform", request, fallback, () => false);
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

async function call<T>(
  endpoint: string,
  request: unknown,
  fallback: T,
  fromModel: (value: T) => boolean,
): Promise<AiOutcome<T>> {
  const key = cacheKey(endpoint, request);

  const cached = readCache<T>(key);
  if (cached !== null) return { value: cached, fromModel: fromModel(cached), cached: true };

  const outcome = await request_(endpoint, request, fallback, fromModel);
  if (outcome.fromModel) writeCache(key, outcome.value);
  return outcome;
}

/** Same transport as `call`, without the localStorage-keyed cache — see the career functions above. */
async function callUncached<T>(
  endpoint: string,
  request: unknown,
  fallback: T,
  fromModel: (value: T) => boolean,
): Promise<AiOutcome<T>> {
  return request_(endpoint, request, fallback, fromModel);
}

async function request_<T>(
  endpoint: string,
  request: unknown,
  fallback: T,
  fromModel: (value: T) => boolean,
): Promise<AiOutcome<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) return { value: fallback, fromModel: false, cached: false };

    const value = (await response.json()) as T;
    return { value, fromModel: fromModel(value), cached: false };
  } catch {
    // Offline, aborted, or the server said something unreadable. The product
    // continues on deterministic output.
    return { value: fallback, fromModel: false, cached: false };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

function cacheKey(endpoint: string, request: unknown): string {
  return `${CACHE_PREFIX}:${CACHE_VERSION}:${endpoint}:${hash(stableStringify(request))}`;
}

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    evictOldest();
  } catch {
    /* storage full or disabled: the answer still shows, it just will not be reused */
  }
}

/** Keeps the cache from growing without bound on a shared demo machine. */
function evictOldest(): void {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key !== null && key.startsWith(`${CACHE_PREFIX}:`)) keys.push(key);
  }
  if (keys.length <= CACHE_LIMIT) return;

  keys.sort();
  for (const key of keys.slice(0, keys.length - CACHE_LIMIT)) {
    window.localStorage.removeItem(key);
  }
}

/** Key order must not change the hash, or identical requests would miss. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(",")}}`;
}

/** FNV-1a: short, stable and enough to tell two requests apart. */
function hash(input: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(36);
}
