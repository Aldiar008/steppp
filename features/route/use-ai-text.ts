"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  DiffRequest,
  DiffResponse,
  ExplainRequest,
  ExplainResponse,
} from "@/lib/ai/contracts";
import { templateDiff, templateExplain } from "@/lib/ai/deterministic";
import { explainDiff, explainDoor } from "@/lib/api/ai";

/**
 * Wording that improves if it can, and is complete if it cannot.
 *
 * The deterministic text is computed during render, so it is on screen on the
 * first frame; a model answer replaces it only after it comes back and only if
 * it passed grounding. No screen ever waits on a request to show a fact — the
 * board, the dates and the counts are already computed, and this changes
 * sentences.
 *
 * With no key, offline, or after a rejected answer, the first text is also the
 * last one, and nothing in the interface reveals that anything was attempted.
 */

export interface AiText<T> {
  value: T;
  /** True when a model wrote this and it passed the grounding check. */
  fromModel: boolean;
}

/** State is keyed by the request, so a stale answer can never outlive its facts. */
interface Keyed<T> {
  key: string;
  value: T;
}

export function useDoorExplanation(request: ExplainRequest | null): AiText<ExplainResponse> | null {
  const key = useMemo(() => (request === null ? null : JSON.stringify(request)), [request]);
  const fallback = useMemo(
    () => (request === null ? null : templateExplain(request)),
    // Compared by value: a re-render with the same facts must not recompute or
    // re-request anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const [model, setModel] = useState<Keyed<ExplainResponse> | null>(null);

  useEffect(() => {
    if (request === null || key === null || fallback === null) return;

    let alive = true;
    void explainDoor(request, fallback).then((outcome) => {
      if (!alive || !outcome.fromModel) return;
      setModel({ key, value: outcome.value });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (fallback === null || key === null) return null;
  if (model !== null && model.key === key) return { value: model.value, fromModel: true };
  return { value: fallback, fromModel: false };
}

export function useDiffExplanation(request: DiffRequest | null): AiText<DiffResponse> | null {
  const key = useMemo(() => (request === null ? null : JSON.stringify(request)), [request]);
  const fallback = useMemo(
    () => (request === null ? null : templateDiff(request)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const [model, setModel] = useState<Keyed<DiffResponse> | null>(null);

  useEffect(() => {
    if (request === null || key === null || fallback === null) return;

    let alive = true;
    void explainDiff(request, fallback).then((outcome) => {
      if (!alive || !outcome.fromModel) return;
      setModel({ key, value: outcome.value });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (fallback === null || key === null) return null;
  if (model !== null && model.key === key) return { value: model.value, fromModel: true };
  return { value: fallback, fromModel: false };
}
