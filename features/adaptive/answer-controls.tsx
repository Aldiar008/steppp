"use client";

import { useId, useState } from "react";
import { MicrophoneIcon, MicrophoneSlashIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form";
import type { QuestionDefinition, QuestionScale } from "@/lib/engine";
import { interpretAnswer } from "@/lib/voice/match";
import { useSpeech } from "@/lib/voice/speech";
import { cn } from "@/lib/utils";

/**
 * Three ways to answer the same question: tap, type, or say it.
 *
 * A fixed set of buttons is the right control for "нужен ли грант" and the
 * wrong one for a band score. Anything measured gets a scale the applicant sets
 * themselves, with the exact number visible and editable — a certificate says
 * 7.5, and a product that only offers "6 или выше" makes somebody round their
 * own life down.
 *
 * Voice is an addition and never a requirement: the microphone appears only
 * where the browser actually supports it, what it heard is always shown before
 * it counts as an answer, and the matching is deterministic — no model decides
 * what somebody said about their own exams.
 */

/* -------------------------------------------------------------------------- */
/* Scale                                                                       */
/* -------------------------------------------------------------------------- */

export function ScaleAnswer({
  scale,
  value,
  onChange,
}: {
  scale: QuestionScale;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  // The text field mirrors the slider, so it is adjusted during render when the
  // value changes from outside rather than in an effect afterwards.
  const [mirrored, setMirrored] = useState(value);
  if (mirrored !== value) {
    setMirrored(value);
    setText(String(value));
  }

  const commit = (raw: string) => {
    setText(raw);
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    onChange(clamp(parsed, scale));
  };

  const decimals = scale.step < 1 ? 1 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm text-muted-foreground">
          Твоё значение
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-exact`}
            type="number"
            inputMode="decimal"
            min={scale.min}
            max={scale.max}
            step={scale.step}
            value={text}
            onChange={(event) => commit(event.target.value)}
            onBlur={() => setText(String(value))}
            aria-label={`Точное значение${scale.unit === undefined ? "" : `, ${scale.unit}`}`}
            className={cn(inputClass, "h-11 w-32 text-right text-base tabular-nums")}
          />
          {scale.unit !== undefined && (
            <span className="text-sm text-muted-foreground">{scale.unit}</span>
          )}
        </div>
      </div>

      <input
        id={id}
        type="range"
        min={scale.min}
        max={scale.max}
        step={scale.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value}${scale.unit === undefined ? "" : ` ${scale.unit}`}`}
        className="mt-4 h-11 w-full cursor-pointer accent-[var(--primary)]"
      />

      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{scale.min.toLocaleString("ru-RU", { maximumFractionDigits: decimals })}</span>
        <span>{scale.max.toLocaleString("ru-RU", { maximumFractionDigits: decimals })}</span>
      </div>
    </div>
  );
}

function clamp(value: number, scale: QuestionScale): number {
  if (value < scale.min) return scale.min;
  if (value > scale.max) return scale.max;
  return Number(value.toFixed(scale.step < 1 ? 1 : 0));
}

/* -------------------------------------------------------------------------- */
/* Voice and free text                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Say it or write it, for any question.
 *
 * What was recognised is shown as text and matched against the question's own
 * options; a match is offered as a suggestion the applicant confirms, never
 * applied behind their back. Nothing is uploaded — recognition happens in the
 * browser.
 */
export function SpokenAnswer({
  question,
  onPick,
  onNumber,
}: {
  question: QuestionDefinition;
  onPick: (optionValue: string) => void;
  onNumber: (value: number) => void;
}) {
  const speech = useSpeech();
  const [typed, setTyped] = useState("");
  const id = useId();

  const said = speech.transcript || typed;
  const guess = said.trim() === "" ? null : interpretAnswer(question, said);

  const apply = () => {
    if (guess === null) return;
    if (guess.kind === "option") onPick(guess.value);
    if (guess.kind === "number") onNumber(guess.value);
    speech.reset();
    setTyped("");
  };

  return (
    <div className="mt-3">
      <label htmlFor={id} className="mb-1.5 block text-xs text-muted-foreground">
        Или ответь своими словами
      </label>

      <div className="flex gap-2">
        <input
          id={id}
          value={said}
          onChange={(event) => {
            speech.reset();
            setTyped(event.target.value);
          }}
          placeholder={question.scale ? "Например: 7,5" : "Например: да, готов"}
          className={cn(inputClass, "h-11 flex-1")}
        />

        {speech.supported && (
          <Button
            type="button"
            variant={speech.listening ? "default" : "outline"}
            className="h-11 w-11 shrink-0 p-0"
            aria-label={speech.listening ? "Остановить запись" : "Ответить голосом"}
            aria-pressed={speech.listening}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
          >
            {speech.listening ? (
              <MicrophoneSlashIcon className="size-5" aria-hidden />
            ) : (
              <MicrophoneIcon className="size-5" aria-hidden />
            )}
          </Button>
        )}
      </div>

      {speech.listening && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          Слушаем… говори спокойно, можно в одно слово.
        </p>
      )}

      {speech.error !== null && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {speech.error}
        </p>
      )}

      {guess?.kind === "option" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Похоже на:</span>
          <Button type="button" size="sm" className="min-h-9" onClick={apply}>
            {guess.label}
          </Button>
        </div>
      )}

      {guess?.kind === "number" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Понял как:</span>
          <Button type="button" size="sm" className="min-h-9 tabular-nums" onClick={apply}>
            {guess.value.toLocaleString("ru-RU")}
            {question.scale?.unit === undefined ? "" : ` ${question.scale.unit}`}
          </Button>
        </div>
      )}

      {guess?.kind === "unclear" && said.trim() !== "" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Не разобрали — выбери вариант выше или напиши точнее.
        </p>
      )}
    </div>
  );
}
