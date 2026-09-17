"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Speaking instead of typing.
 *
 * A sixteen-year-old answering questions about money and exams on a phone, on
 * a bus, should be able to say the answer out loud. Everything here runs in the
 * browser through the Web Speech API: nothing is recorded, nothing is uploaded,
 * and no audio ever reaches our server or anybody else's.
 *
 * The API is still vendor-prefixed in most browsers and absent in some, so the
 * hook reports `supported` honestly and every screen keeps its typed and
 * tappable path. Voice is an extra way in, never the only one.
 */

/** The slice of the Web Speech API we use. It is not in the DOM typings. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function constructorOf(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface Speech {
  /** False when the browser has no speech recognition at all. */
  supported: boolean;
  listening: boolean;
  /** What has been recognised so far in this session. */
  transcript: string;
  /** Set when the microphone was refused or recognition failed. */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

const noopSubscribe = (): (() => void) => () => {};

export function useSpeech(locale = "ru-RU"): Speech {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  // Support is a browser fact: the server has no window and must not render a
  // microphone that cannot exist, so the two renders differ by design.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => constructorOf() !== null,
    () => false,
  );

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    const Recognition = constructorOf();
    if (Recognition === null) return;

    recognition.current?.abort();
    const instance = new Recognition();
    instance.lang = locale;
    instance.continuous = true;
    // Interim results make the field fill as the person speaks, which is the
    // difference between "is this thing on?" and a usable control.
    instance.interimResults = true;

    instance.onresult = (event) => {
      let text = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result?.[0];
        if (alternative !== undefined) text += alternative.transcript;
      }
      setTranscript(text.trim());
    };

    instance.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Микрофон недоступен — разреши доступ в браузере или ответь текстом."
          : "Не расслышали. Попробуй ещё раз или ответь текстом.",
      );
      setListening(false);
    };

    instance.onend = () => setListening(false);

    recognition.current = instance;
    setError(null);
    setListening(true);
    try {
      instance.start();
    } catch {
      setListening(false);
    }
  }, [locale]);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
