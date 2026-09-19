"use client";

import { useState } from "react";
import { CompassRoseIcon, MicrophoneIcon, MicrophoneSlashIcon } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inputClass } from "@/components/form";
import type { Stage1Question } from "@/lib/career/stage1";
import type { Stage2Question } from "@/lib/career/stage2-banks/index";
import { FIELD_LABEL, type CareerResultItemRecord } from "@/lib/career/types";
import { WIDEN_CLARIFYING_QUESTION, type WidenClarificationBranch } from "@/lib/career/widen";
import { useSpeech, type Speech } from "@/lib/voice/speech";
import { cn } from "@/lib/utils";
import { type Stage3bQuestion, useCareerInterview } from "./use-career-interview";

/**
 * Найти профессию — the career-discovery interview (Career Interview
 * Content Package, full implementation). One question per screen, voice as
 * an addition never a requirement, and a result that always pairs appeal
 * with cost — see the README's "Карьерное интервью" section for the
 * deterministic-vs-LLM-assisted breakdown this screen is built on.
 */

const DISCLAIMER =
  "Ответь на это сам — без помощи ИИ. ИИ не может выбрать будущее за тебя: решить, чего ты по-настоящему хочешь, можешь только ты сам.";

export function ProfessionScreen() {
  const interview = useCareerInterview();
  const { step } = interview;

  if (step.kind === "loading") return <LoadingScreen />;
  if (step.kind === "intro") return <IntroScreen onStart={interview.start} />;
  if (step.kind === "crisis") return <CrisisScreen onRestart={interview.restart} />;

  if (step.kind === "stage1" || step.kind === "stage1_optional") {
    const question = step.kind === "stage1" ? step.question : step.question;
    return (
      <Stage1Screen
        key={question.id}
        question={question}
        index={step.kind === "stage1" ? step.index : undefined}
        total={step.kind === "stage1" ? step.total : undefined}
        pending={interview.pending}
        onChoice={interview.answerStage1Choice}
        onText={interview.answerStage1Text}
      />
    );
  }

  if (step.kind === "stage2_loading") return <ThinkingScreen text="Подбираем следующий вопрос…" />;
  if (step.kind === "stage2") {
    return (
      <Stage2Screen
        key={step.question.id}
        question={step.question}
        onAnswer={interview.answerStage2}
        onFinish={interview.finishNow}
      />
    );
  }

  if (step.kind === "stage3a_clarify") {
    return <WidenClarifyScreen onAnswer={interview.answerWidenClarify} />;
  }
  if (step.kind === "stage3a_list") {
    return (
      <WidenListScreen
        options={step.options}
        onChoose={interview.chooseWidenOption}
        onRejectAll={interview.rejectCurrentResult}
      />
    );
  }

  if (step.kind === "stage3b_loading") return <ThinkingScreen text="Думаем над следующим вопросом…" />;
  if (step.kind === "stage3b_unavailable") return <Stage3bUnavailableScreen onRestart={interview.restart} />;
  if (step.kind === "stage3b") {
    return (
      <Stage3bScreen
        key={step.question.id}
        question={step.question}
        insight={step.insight}
        onChoice={interview.answerStage3bChoice}
        onText={interview.answerStage3bText}
        onFinish={interview.finishNow}
      />
    );
  }

  // result
  return (
    <ResultScreen
      items={interview.result?.items ?? []}
      onRejectLead={interview.rejectCurrentResult}
      onRestart={interview.restart}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Crisis interrupt — §10.6                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Real stop, placeholder wording. The interrupt mechanism itself is what
 * §10.6 requires to genuinely work — the interview has already stopped and
 * will not resume or score anything further by the time this renders. The
 * actual copy and contact details on a screen like this need a specialist's
 * review before shipping to real students; that review has not happened
 * here, and this text says so rather than pretending otherwise.
 */
function CrisisScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="card-surface border-l-4 border-l-critical p-5">
        <h1 className="text-xl font-semibold leading-snug">Это важнее выбора профессии</h1>
        <p className="mt-3 text-sm leading-relaxed">
          Интервью остановлено. То, что ты сейчас написал(а), звучит серьёзно — важнее, чем любое направление
          учёбы. Если тебе тяжело, поговори с человеком, которому доверяешь, или позвони на линию поддержки.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Плейсхолдер: здесь должны быть реальные контакты линии поддержки, согласованные со специалистом, — этот
          текст пока не заменяет профессиональную помощь.
        </p>
      </div>
      <Button variant="outline" className="mt-4" onClick={onRestart}>
        Вернуться позже
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading / thinking                                                          */
/* -------------------------------------------------------------------------- */

function LoadingScreen() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загружаем интервью</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function ThinkingScreen({ text }: { text: string }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="text-sm text-muted-foreground" role="status">
        {text}
      </p>
      <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Intro                                                                       */
/* -------------------------------------------------------------------------- */

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="Найти профессию"
        icon={CompassRoseIcon}
        lede="Сначала десять коротких вопросов, которые отвечают все. Дальше вопросы становятся точнее, под тебя. В конце — ведущее направление и два соседних, с честным объяснением и тем, что в них тяжело."
      />

      <div className="card-surface border-l-4 border-l-risk p-4">
        <p className="text-sm font-medium">{DISCLAIMER}</p>
      </div>

      <ul className="card-surface mt-4 space-y-2.5 p-4 text-sm text-muted-foreground">
        <li>— Отвечай текстом или голосом, как удобнее.</li>
        <li>— Ни одного процента совпадения — только порядок и объяснение своими словами.</li>
        <li>— Результат — не приговор: если не откликнется, покажем соседние варианты.</li>
      </ul>

      <Button className="mt-6 w-full sm:w-auto" size="lg" onClick={onStart}>
        Начать
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage 1 (+ optional Q11/Q12)                                                */
/* -------------------------------------------------------------------------- */

function Stage1Screen({
  question,
  index,
  total,
  pending,
  onChoice,
  onText,
}: {
  question: Stage1Question;
  index?: number;
  total?: number;
  pending: boolean;
  onChoice: (question: Stage1Question, values: readonly string[]) => void;
  onText: (question: Stage1Question, text: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const speech = useSpeech();

  const prompt = question.kind === "text" && usingFallback ? question.fallbackPrompt : question.prompt;

  return (
    <div className="mx-auto w-full max-w-xl">
      {index !== undefined && total !== undefined && (
        <p className="text-xs text-muted-foreground">
          Вопрос {index + 1} из {total} обязательных
        </p>
      )}
      {index === 0 && (
        <div className="mt-3 rounded-xl border border-foreground/20 bg-accent px-4 py-3">
          <p className="text-sm font-medium leading-relaxed">{DISCLAIMER}</p>
        </div>
      )}

      <h1 className="mt-4 whitespace-pre-line text-xl font-semibold leading-snug sm:text-2xl">{prompt}</h1>

      {(question.kind === "single" || question.kind === "single_with_text") && (
        <ChoiceOptions
          options={question.options}
          selected={choice}
          multi={false}
          onChange={setChoice}
          onSubmit={() => onChoice(question, choice)}
        />
      )}

      {question.kind === "multi" && (
        <ChoiceOptions
          options={question.options}
          selected={choice}
          multi
          maxSelect={question.maxSelect}
          onChange={setChoice}
          onSubmit={() => onChoice(question, choice)}
        />
      )}

      {(question.kind === "text" || question.kind === "text_with_chips") && (
        <>
          {question.kind === "text_with_chips" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {question.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-border-strong hover:bg-accent"
                  onClick={() => setText((current) => (current.trim() === "" ? chip : `${current}, ${chip}`))}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          <TextAnswer
            value={speech.transcript || text}
            speech={speech}
            disabled={pending}
            onChange={(value) => {
              speech.reset();
              setText(value);
            }}
            onSubmit={() => {
              const value = speech.transcript || text;
              if (question.kind === "text" && value.trim() === "" && !usingFallback) {
                setUsingFallback(true);
                return;
              }
              void onText(question, value).then(() => {
                setText("");
                speech.reset();
              });
            }}
            allowEmpty={question.kind === "text"}
          />
        </>
      )}
    </div>
  );
}

function ChoiceOptions({
  options,
  selected,
  multi,
  maxSelect,
  onChange,
  onSubmit,
}: {
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
  multi: boolean;
  maxSelect?: number;
  onChange: (values: string[]) => void;
  onSubmit: () => void;
}) {
  const toggle = (value: string) => {
    if (!multi) {
      onChange([value]);
      return;
    }
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
      return;
    }
    if (maxSelect !== undefined && selected.length >= maxSelect) return;
    onChange([...selected, value]);
  };

  return (
    <>
      <fieldset className="mt-5 flex flex-col gap-2">
        <legend className="sr-only">Варианты ответа</legend>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                isSelected ? "border-foreground bg-accent" : "border-border bg-card hover:border-border-strong",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
                  multi ? "rounded-sm" : "rounded-full",
                  isSelected ? "border-foreground bg-foreground" : "border-border-strong",
                )}
              >
                {isSelected && <span className={cn("bg-background", multi ? "size-2" : "size-1.5 rounded-full")} />}
              </span>
              <span className="text-sm font-medium leading-snug">{option.label}</span>
            </button>
          );
        })}
      </fieldset>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onSubmit} disabled={selected.length === 0}>
          Дальше
        </Button>
        <Button variant="ghost" onClick={onSubmit}>
          Не знаю
        </Button>
      </div>
    </>
  );
}

function TextAnswer({
  value,
  speech,
  disabled,
  allowEmpty,
  onChange,
  onSubmit,
}: {
  value: string;
  speech: Speech;
  disabled?: boolean;
  allowEmpty?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-5">
      {speech.supported && (
        <Button
          type="button"
          variant={speech.listening ? "default" : "outline"}
          size="lg"
          className={cn("mb-3 w-full gap-2", speech.listening && "animate-pulse")}
          aria-pressed={speech.listening}
          onClick={() => (speech.listening ? speech.stop() : speech.start())}
        >
          {speech.listening ? (
            <MicrophoneSlashIcon className="size-5" aria-hidden />
          ) : (
            <MicrophoneIcon className="size-5" aria-hidden />
          )}
          {speech.listening ? "Остановить запись" : "Ответить голосом"}
        </Button>
      )}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={speech.supported ? "…или напиши своими словами" : "Напиши своими словами…"}
        className={cn(inputClass, "min-h-28 resize-y")}
        disabled={disabled}
      />

      {speech.listening && (
        <p className="mt-2 text-xs font-medium text-foreground" role="status">
          🔴 Слушаем… говори свободно, можно целыми предложениями.
        </p>
      )}
      {!speech.supported && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          Голосовой ввод не поддерживается этим браузером — ответь текстом.
        </p>
      )}
      {speech.error !== null && (
        <p className="mt-2 text-xs text-critical-ink" role="alert">
          {speech.error}
        </p>
      )}

      <div className="mt-4">
        <Button disabled={disabled || (!allowEmpty && value.trim() === "")} onClick={onSubmit}>
          {disabled ? "Секунду…" : "Дальше"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage 2                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The bank's own scenario text usually contrasts two things in one sentence
 * ("...мост... или двигатель...") — split on "или" to reuse the document's
 * own words as the two buttons rather than authoring new labels. A plain
 * yes/no scenario (no "или") falls back to "Да"/"Нет", which is how most of
 * those questions read naturally ("Ты готов...?", "Тебя не смущает...?").
 */
function deriveBinaryOptions(prompt: string): [string, string] {
  const match = /^(.*?)\bили\b(.+)$/su.exec(prompt);
  if (match !== null) {
    const a = match[1]!.replace(/^[^\p{L}]+/u, "").trim();
    const b = match[2]!.trim().replace(/[.?!]+$/, "");
    if (a.length > 2 && b.length > 2) return [a, b];
  }
  return ["Да", "Нет"];
}

function Stage2Screen({
  question,
  onAnswer,
  onFinish,
}: {
  question: Stage2Question;
  onAnswer: (chosen: "A" | "B", label: string) => void;
  onFinish: () => void;
}) {
  const [a, b] = deriveBinaryOptions(question.prompt);
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="text-xs text-muted-foreground">Уточняющий вопрос — подобран под твои ответы</p>
      <h1 className="mt-4 text-xl font-semibold leading-snug sm:text-2xl">{question.prompt}</h1>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="rounded-lg border border-border bg-card p-3 text-left text-sm font-medium hover:border-border-strong hover:bg-accent"
          onClick={() => onAnswer("A", a)}
        >
          {a}
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-card p-3 text-left text-sm font-medium hover:border-border-strong hover:bg-accent"
          onClick={() => onAnswer("B", b)}
        >
          {b}
        </button>
      </div>

      <Button variant="ghost" className="mt-4" onClick={onFinish}>
        Хватит вопросов — покажи, что есть
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage 3a — widen                                                            */
/* -------------------------------------------------------------------------- */

function WidenClarifyScreen({ onAnswer }: { onAnswer: (branch: WidenClarificationBranch) => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-xl font-semibold leading-snug sm:text-2xl">{WIDEN_CLARIFYING_QUESTION}</h1>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="rounded-lg border border-border bg-card p-3 text-left text-sm font-medium hover:border-border-strong hover:bg-accent"
          onClick={() => onAnswer("what")}
        >
          Чем занимаются
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-card p-3 text-left text-sm font-medium hover:border-border-strong hover:bg-accent"
          onClick={() => onAnswer("where")}
        >
          Где это происходит
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-card p-3 text-left text-sm font-medium hover:border-border-strong hover:bg-accent"
          onClick={() => onAnswer("how_long")}
        >
          Сколько лет учиться
        </button>
      </div>
    </div>
  );
}

function WidenListScreen({
  options,
  onChoose,
  onRejectAll,
}: {
  options: readonly CareerResultItemRecord[];
  onChoose: (id: string) => void;
  onRejectAll: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="Посмотри на эти"
        lede="Они из той же области, но устроены иначе."
      />
      <ol className="space-y-3">
        {options.map((item) => (
          <li key={item.id} className="card-surface p-4">
            <p className="text-xs font-medium text-muted-foreground">{FIELD_LABEL[item.field]}</p>
            <h2 className="mt-1 text-base font-medium">{item.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.why}</p>
            <p className="mt-2 text-sm leading-relaxed">{item.hard}</p>
            <Button className="mt-3" size="sm" onClick={() => onChoose(item.id)}>
              Это ближе
            </Button>
          </li>
        ))}
      </ol>
      {options.length === 0 && (
        <p className="text-sm text-muted-foreground">Больше вариантов рядом нет — переходим дальше.</p>
      )}
      <Button variant="ghost" className="mt-4" onClick={onRejectAll}>
        Если и это не то
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage 3b — free-form                                                        */
/* -------------------------------------------------------------------------- */

function Stage3bScreen({
  question,
  insight,
  onChoice,
  onText,
  onFinish,
}: {
  question: Stage3bQuestion;
  insight: string | null;
  onChoice: (label: string) => void;
  onText: (text: string) => void;
  onFinish: () => void;
}) {
  const [text, setText] = useState("");
  const speech = useSpeech();

  return (
    <div className="mx-auto w-full max-w-xl">
      {insight !== null && <p className="mb-3 text-sm text-muted-foreground">{insight}</p>}
      <h1 className="text-xl font-semibold leading-snug sm:text-2xl">{question.title}</h1>

      {question.type === "single" && question.options !== undefined ? (
        <div className="mt-5 flex flex-col gap-2">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="rounded-lg border border-border bg-card p-3 text-left text-sm font-medium hover:border-border-strong hover:bg-accent"
              onClick={() => onChoice(option.label)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <TextAnswer
          value={speech.transcript || text}
          speech={speech}
          onChange={(value) => {
            speech.reset();
            setText(value);
          }}
          onSubmit={() => {
            onText(speech.transcript || text);
            setText("");
            speech.reset();
          }}
        />
      )}

      <Button variant="ghost" className="mt-4" onClick={onFinish}>
        Хочу закончить
      </Button>
    </div>
  );
}

function Stage3bUnavailableScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="Свободный разбор сейчас недоступен"
        lede="Модель, которая ведёт это интервью, сейчас не отвечает. Мы не будем притворяться и подбирать вопросы наугад — попробуй, пожалуйста, чуть позже."
      />
      <Button variant="outline" onClick={onRestart}>
        Начать заново
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Result                                                                      */
/* -------------------------------------------------------------------------- */

function ResultScreen({
  items,
  onRejectLead,
  onRestart,
}: {
  items: readonly CareerResultItemRecord[];
  onRejectLead: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Вот что получилось"
        lede="Не единственно верный ответ и не гарантия — направления, которые лучше всего совпали с твоими же словами. Самое близкое сверху."
      />

      {items.length === 0 && (
        <p className="card-surface p-4 text-sm text-muted-foreground">
          По твоим ответам пока не нашлось направления, которое можно объяснить твоими же словами. Попробуй пройти
          интервью ещё раз, ответив чуть подробнее.
        </p>
      )}

      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="card-surface p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground">{index + 1}</span>
              <p className="text-xs font-medium text-muted-foreground">{FIELD_LABEL[item.field]}</p>
            </div>
            <h2 className="mt-1 text-base font-medium">{item.label}</h2>
            <p className="mt-2 text-sm leading-relaxed">{item.why}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Что тяжело: {item.hard}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        {items.length > 0 && (
          <Button variant="outline" onClick={onRejectLead}>
            Это не про меня
          </Button>
        )}
        <Button variant="ghost" onClick={onRestart}>
          Пройти заново
        </Button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Это ориентир на сегодня, а не приговор — интересы меняются.
      </p>
    </div>
  );
}
