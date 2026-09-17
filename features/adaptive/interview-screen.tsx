"use client";

import Link from "next/link";
import { useState } from "react";

import { DEMO_PROFILE } from "@/data/demo-profile";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inputClass } from "@/components/form";
import { cn } from "@/lib/utils";
import { MicrophoneIcon, MicrophoneSlashIcon } from "@phosphor-icons/react/dist/ssr";

import { useSpeech } from "@/lib/voice/speech";
import { ScaleAnswer, SpokenAnswer } from "./answer-controls";
import { useAdaptiveInterview } from "./use-adaptive-interview";

/**
 * The adaptive interview.
 *
 * One question at a time, and only questions whose answer would move the board.
 * The rail across the top counts what has been asked rather than promising a
 * fixed number of steps, because the engine decides when to stop and it is
 * allowed to stop early — that is the whole point of the screen.
 *
 * Mobile first: everything below reads at 360px, the options are full-width
 * tap targets, and the primary action sits where a thumb reaches it.
 *
 * Note for the AI stage: the free-text box saves what the applicant typed and
 * does nothing else. There is no parser yet, and faking one — guessing a city
 * or a budget from a sentence — would put invented facts into a profile the
 * whole engine then treats as true.
 */

const EXAMPLES = [
  "10 класс, Шымкент. Люблю дизайн и код. Родители готовы платить около 1,5 млн ₸ в год.",
  "11 класс, хочу медицину в Казахстане. ЕНТ ещё не сдавал, английский слабый.",
  "Выпустился в прошлом году, ищу бесплатную программу за рубежом. IELTS 6.5 есть.",
];

export function AdaptiveInterviewScreen() {
  const interview = useAdaptiveInterview();
  const [draft, setDraft] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  /** The applicant's own value on a scale question, before they confirm it. */
  const [scaleValue, setScaleValue] = useState<number | null>(null);
  // Telling the product about yourself out loud is the fastest way in, and on a
  // phone it is the only comfortable one.
  const speech = useSpeech();

  if (interview.phase === "loading") {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Загружаем твои ответы</span>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  /* ------------------------------------------------------------ initial --- */

  if (interview.phase === "initial") {
    const text = speech.transcript !== "" ? speech.transcript : draft || interview.rawText;
    return (
      <div className="mx-auto w-full max-w-xl">
        {interview.profile !== null && (
          <p className="mb-4 panel-inset px-3 py-2 text-sm">
            У тебя уже есть профиль.{" "}
            <Link href="/doors" className="underline underline-offset-2">
              Вернуться к своим путям
            </Link>
          </p>
        )}
        <PageHeader
          title="Расскажи о себе"
          lede="Своими словами — класс, интересы, деньги, языки. Если проще ответить на вопросы, пропусти поле и жми «Начать»."
        />

        <label htmlFor="statement" className="mb-2 block text-sm font-medium">
          О себе
        </label>
        <div className="relative">
          <textarea
            id="statement"
            value={text}
            onChange={(event) => {
              speech.reset();
              setDraft(event.target.value);
            }}
            rows={5}
            placeholder="Например: 11 класс, Алматы. Интересно программирование…"
            className={cn(inputClass, "min-h-32 resize-y", speech.supported && "pr-14")}
          />
          {speech.supported && (
            <Button
              type="button"
              variant={speech.listening ? "default" : "outline"}
              className="absolute right-2 top-2 size-10 p-0"
              aria-label={speech.listening ? "Остановить запись" : "Рассказать голосом"}
              aria-pressed={speech.listening}
              onClick={() => {
                if (speech.listening) {
                  speech.stop();
                  setDraft(speech.transcript);
                } else {
                  speech.start();
                }
              }}
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
            Слушаем… говори как есть, потом можно поправить текст.
          </p>
        )}
        {speech.error !== null && (
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {speech.error}
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setDraft(example)}
                className="w-full panel-inset px-3 py-2 text-left text-xs leading-snug text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-muted-foreground">
          Профиль хранится у тебя в браузере. Пока текст никуда не отправляется — мы его просто
          сохраняем и задаём обычные вопросы.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            disabled={interview.parsing}
            onClick={() => {
              // The text is parsed into a starting profile; with no AI the rule
              // parser answers and the interview continues exactly the same.
              if (text.trim().length > 0) void interview.startWithText(text);
              else interview.start();
            }}
          >
            {interview.parsing ? "Разбираем…" : "Начать"}
          </Button>
          {/* Labelled as demo on purpose: it is not anybody's data. */}
          <Button
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => interview.loadDemoProfile(DEMO_PROFILE)}
          >
            Посмотреть на демо-профиле
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------- conflicts ----- */

  const conflicts =
    interview.conflicts.length === 0 ? null : (
      <section className="mb-4 panel-inset p-3" role="status">
        <h2 className="text-sm font-medium">Это стоит уточнить</h2>
        <ul className="mt-2 space-y-1">
          {interview.conflicts.map((conflict) => (
            <li key={conflict.field} className="text-sm leading-snug text-muted-foreground">
              {conflict.explanation}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Мы не стали выбирать за тебя — поправь нужное в разборе.
        </p>
      </section>
    );

  /* ------------------------------------------------- stopped / complete --- */

  if (interview.phase === "stopped" || interview.phase === "complete") {
    const summary = interview.route?.summary;
    return (
      <div className="mx-auto w-full max-w-xl">
        {conflicts}
        <PageHeader
          title="Остальные вопросы почти ничего не изменят"
          lede="Мы посчитали: ответы на оставшиеся вопросы не двигают твой набор вариантов. Можно идти дальше."
        />

        {summary && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Всего вариантов" value={summary.total} />
            <Stat label="Открыто" value={summary.open} />
            <Stat label="Закрывается" value={summary.closing_soon} />
            <Stat label="Не хватает данных" value={summary.needs_data} />
          </dl>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/doors">Показать пути</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/diagnostics">Сначала разбор</Link>
          </Button>
          {interview.phase === "stopped" && (
            <Button variant="outline" className="w-full sm:w-auto" onClick={interview.finish}>
              Завершить интервью
            </Button>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Сроки — из официальных страниц вузов. Где вуз не назвал дату, мы её не придумываем.
        </p>
      </div>
    );
  }

  /* ----------------------------------------------------------- asking ---- */

  const question = interview.question;
  if (question === null) return null;

  const multi = question.type === "multi";
  const toggle = (value: string) =>
    setChosen((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : multi
          ? [...current, value]
          : [value],
    );

  const scale = question.scale;
  const current = scaleValue ?? scale?.default ?? 0;

  const answerWith = (value: unknown) => {
    interview.answer(value);
    setChosen([]);
    setScaleValue(null);
  };

  const submit = () => {
    // A scale question is answered by its number unless the applicant picked
    // one of the quick options instead ("ещё не сдавал").
    if (chosen.length > 0) {
      answerWith(multi ? chosen : chosen[0]);
      return;
    }
    if (scale !== undefined) answerWith(current);
  };

  const canSubmit = chosen.length > 0 || scale !== undefined;

  return (
    <div className="mx-auto w-full max-w-xl">
      {conflicts}
      <ProgressRail asked={interview.askedCount} max={interview.maxQuestions} />

      <p className="mt-4 text-xs text-muted-foreground">
        Осталось примерно {interview.estimatedRemaining}{" "}
        {plural(interview.estimatedRemaining, "вопрос", "вопроса", "вопросов")}
      </p>

      <h1 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">{question.title}</h1>
      {question.hint && <p className="mt-2 text-sm text-muted-foreground">{question.hint}</p>}

      {scale !== undefined && (
        <div className="mt-5">
          <ScaleAnswer
            scale={scale}
            value={current}
            onChange={(value) => {
              setScaleValue(value);
              setChosen([]);
            }}
          />
        </div>
      )}

      <fieldset className={cn("flex flex-col gap-2", scale === undefined ? "mt-5" : "mt-3")}>
        <legend className="sr-only">{question.title}</legend>
        {question.options.map((option) => {
          const selected = chosen.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                selected
                  ? "border-foreground bg-accent"
                  : "border-border bg-card hover:border-border-strong",
              )}
            >
              <input
                type={multi ? "checkbox" : "radio"}
                name={question.id}
                value={option.value}
                checked={selected}
                onChange={() => toggle(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                  multi ? "rounded" : "rounded-full",
                  selected ? "border-foreground bg-foreground" : "border-border-strong",
                )}
              >
                {selected && (
                  <span className={cn("size-1.5 bg-background", multi ? "rounded-[1px]" : "rounded-full")} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug">{option.label}</span>
                {option.hint && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      <SpokenAnswer
        question={question}
        onPick={(value) => answerWith(value)}
        onNumber={(value) => {
          setScaleValue(value);
          setChosen([]);
        }}
      />

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Button
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={() => {
            interview.skip();
            setChosen([]);
            setScaleValue(null);
          }}
        >
          Пропустить
        </Button>
        <Button className="w-full sm:flex-1" disabled={!canSubmit} onClick={submit}>
          Дальше
        </Button>
      </div>

      {interview.lastSkippedId !== null && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          Вопрос пропущен — мы к нему не возвращаемся, и твой маршрут от этого не изменился.
        </p>
      )}
    </div>
  );
}

function ProgressRail({ asked, max }: { asked: number; max: number }) {
  return (
    <div
      className="flex gap-1"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={asked}
      aria-label="Пройдено вопросов"
    >
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            index < asked ? "bg-foreground" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel-inset p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}
