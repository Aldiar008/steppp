"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { APP_CATALOG } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { countryName } from "@/data/countries";
import { languageName } from "@/data/languages";
import { formatDateRu } from "@/lib/date";
import type { RouteDiff } from "@/lib/engine";
import type { ProfileEdit } from "@/lib/state/app-store";
import { cn } from "@/lib/utils";
import { useDiffExplanation } from "./use-ai-text";
import { fieldLabel, money, plural } from "./ui";

/**
 * "Что изменилось?"
 *
 * The strongest thing the product does is answer an edit immediately and
 * honestly: two routes opened, one closed, the next step is now the SAT
 * registration. Every line below comes from `diffRoutes` — the overlay counts
 * nothing itself, and a section with nothing in it is not rendered at all,
 * because "0 закрылось" is noise dressed as information.
 *
 * A model may phrase the sentence at the top; it never produces the facts under
 * it, and its answer is only shown after passing the grounding check. With no
 * key or no network this view is already complete without it.
 *
 * The animation carries one idea — before, change, after — and nothing else.
 * Numbers never count up: a fact that animates reads like a prediction.
 */
export function DiffOverlay({
  edit,
  diff,
  onClose,
}: {
  edit: ProfileEdit;
  diff: RouteDiff;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * The counts below come from the diff; this is only the sentence above them.
   * It starts as the deterministic template and is replaced only by a model
   * answer that passed grounding.
   */
  const explanation = useDiffExplanation({
    diff: {
      opened: diff.opened,
      closed: diff.closed,
      became_data_missing: diff.became_data_missing,
      became_data_available: diff.became_data_available,
      deadline_changes: diff.deadline_changes,
      next_action_changed: diff.next_action_changed,
      ...(diff.old_next_action_id === undefined
        ? {}
        : { old_next_action: diff.old_next_action_id }),
      ...(diff.new_next_action_id === undefined
        ? {}
        : { new_next_action: diff.new_next_action_id }),
    },
    changed_field: fieldLabel(edit.field),
    old_value: formatFieldValue(edit.old_value),
    new_value: formatFieldValue(edit.new_value),
    tone: "friendly",
  });

  const opened = diff.opened;
  const closed = diff.closed;
  const deadlines = diff.deadline_changes;
  const nextChanged = diff.next_action_changed;
  const nothing =
    opened.length === 0 && closed.length === 0 && deadlines.length === 0 && !nextChanged;

  // Focus lands on the only control, and Escape closes: the overlay must never
  // be a thing somebody is stuck inside.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-title"
      >
        <motion.div
          className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-4 sm:rounded-2xl"
          initial={reduced ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <h2 id="diff-title" className="text-lg font-semibold">
            Что изменилось
          </h2>

          {/* What the applicant changed, in their own terms. */}
          <div className="mt-3 rounded-lg border border-border bg-muted p-3">
            <p className="text-xs text-muted-foreground">Изменилось:</p>
            <p className="mt-0.5 text-sm font-medium">{fieldLabel(edit.field)}</p>
            <p className="mt-1 text-sm leading-snug">
              <span className="text-muted-foreground">{formatFieldValue(edit.old_value)}</span>
              {" → "}
              <span>{formatFieldValue(edit.new_value)}</span>
            </p>
          </div>

          {/* When nothing moved, the paragraph below already says so — two
              sentences saying it twice reads like a stutter. */}
          {explanation !== null && !nothing && (
            <p className="mt-3 text-sm leading-relaxed">
              {explanation.value.headline}
              {explanation.fromModel && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Сформулировано из рассчитанных данных
                </span>
              )}
            </p>
          )}

          {nothing ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Набор путей и сроки остались прежними. Это тоже ответ: изменение не сдвинуло ни одну
              дату и не открыло новых вариантов.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {opened.length > 0 && (
                <Section
                  tone="open"
                  title={`+ ${opened.length} ${plural(opened.length, "путь открылся", "пути открылись", "путей открылись")}`}
                  items={opened.map(programName)}
                  reduced={reduced ?? false}
                />
              )}

              {closed.length > 0 && (
                <Section
                  tone="closed"
                  title={`− ${closed.length} ${plural(closed.length, "путь закрылся", "пути закрылись", "путей закрылись")}`}
                  items={closed.map(programName)}
                  reduced={reduced ?? false}
                />
              )}

              {deadlines.length > 0 && (
                <Section
                  tone="neutral"
                  title={`Срок изменился: ${deadlines.length} ${plural(deadlines.length, "путь", "пути", "путей")}`}
                  items={deadlines.map((change) => {
                    const from = change.old_date ? formatDateRu(change.old_date) : "не было даты";
                    const to = change.new_date ? formatDateRu(change.new_date) : "даты больше нет";
                    return `${programName(change.program_id)}: ${from} → ${to}`;
                  })}
                  reduced={reduced ?? false}
                />
              )}

              {nextChanged && (
                <Section
                  tone="neutral"
                  title="Следующий шаг изменился"
                  items={[
                    `${actionTitle(diff.old_next_action_id)} → ${actionTitle(diff.new_next_action_id)}`,
                  ]}
                  reduced={reduced ?? false}
                />
              )}
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Посчитано на твоём устройстве тем же движком, что строит доску. Ни одна дата здесь не
            придумана.
          </p>

          <Button ref={closeRef} className="mt-4 w-full" onClick={onClose}>
            Понятно
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({
  title,
  items,
  tone,
  reduced,
}: {
  title: string;
  items: string[];
  tone: "open" | "closed" | "neutral";
  reduced: boolean;
}) {
  return (
    <section>
      <h3
        className={cn(
          "text-sm font-medium",
          tone === "open" && "text-open-ink",
          tone === "closed" && "text-closed-ink",
        )}
      >
        {title}
      </h3>
      <ul className="mt-1 space-y-1">
        {items.map((item, index) => (
          <motion.li
            key={item}
            className="text-sm leading-snug text-muted-foreground"
            initial={reduced ? false : { opacity: 0, x: tone === "closed" ? 8 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduced ? 0 : 0.05 * index, duration: 0.2 }}
          >
            {item}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A profile value as a person would read it.
 *
 * Deterministic and total: anything unexpected falls back to a plain string
 * rather than throwing inside an overlay somebody opened to understand
 * something.
 */
export function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "не указано";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "number") return String(value);
  // A bare two-letter code is a country in this product — and "KZ" on a screen
  // is a database talking, not a person.
  if (typeof value === "string") return /^[A-Z]{2}$/.test(value) ? countryName(value) : value;

  if (Array.isArray(value)) {
    if (value.length === 0) return "пусто";
    return value.map((item) => formatFieldValue(item)).join(", ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.amount === "number" && typeof record.currency === "string") {
      return money(record.amount, record.currency);
    }
    if (typeof record.code === "string") {
      const name = languageName(record.code);
      return typeof record.level === "string" ? `${name} (${record.level})` : name;
    }
    if (typeof record.id === "string") {
      return typeof record.score === "number" ? `${record.id}: ${record.score}` : record.id;
    }
  }

  return String(value);
}

function programName(programId: string): string {
  return APP_CATALOG.programs.find((item) => item.id === programId)?.name ?? programId;
}

function actionTitle(actionId: string | undefined): string {
  if (actionId === undefined) return "нет шага";
  return APP_CATALOG.actions.find((item) => item.id === actionId)?.title ?? actionId;
}
