"use client";

import { useState } from "react";

import { QUESTION_CATALOG } from "@/data/questions";
import {
  isProfileFieldKnown,
  readProfileFieldValue,
  type QuestionDefinition,
} from "@/lib/engine";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FIELD_LABEL, formatFieldValue } from "./diff-overlay";

/**
 * Changing your mind, from the screen where it matters.
 *
 * The board is where an applicant realises the budget is wrong, so the edit
 * belongs here rather than three taps away. Each control is the same question
 * the interview would have asked, so an edit and an answer can never mean two
 * different things, and the recalculation is the same one the interview runs.
 *
 * Only the fields that actually move a board are offered: money, funding,
 * language, countries. A settings page of every field would be a form again.
 */
const QUICK_FIELDS = [
  "budget_per_year",
  "constraints.needs_full_funding",
  "languages",
  "countries",
] as const;

export function QuickEdit({
  profile,
  onAnswer,
}: {
  profile: Profile;
  onAnswer: (questionId: string, value: unknown) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const questions = QUICK_FIELDS.map((field) =>
    QUESTION_CATALOG.find((question) => question.field === field),
  ).filter((question): question is QuestionDefinition => question !== undefined);

  return (
    <section className="border-t border-border pt-4">
      <h2 className="text-sm font-medium">Поменять условия</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Доска пересчитается сразу и покажет, что изменилось.
      </p>

      <div className="mt-3 space-y-2">
        {questions.map((question) => {
          const known = isProfileFieldKnown(profile, question.field);
          const current = readProfileFieldValue(profile, question.field);
          const expanded = open === question.id;

          return (
            <div key={question.id} className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : question.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm leading-snug">
                    {FIELD_LABEL[question.field] ?? question.field}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {known ? formatFieldValue(current) : "не указано"}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-xs text-muted-foreground">
                  {expanded ? "Свернуть" : "Изменить"}
                </span>
              </button>

              {expanded && (
                <div className="flex flex-wrap gap-2 border-t border-border p-3">
                  {question.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onAnswer(
                          question.id,
                          question.type === "multi" ? [option.value] : option.value,
                        );
                        setOpen(null);
                      }}
                      className={cn(
                        "min-h-9 rounded-full border border-border bg-background px-3 py-1.5 text-sm",
                        "transition-colors hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
