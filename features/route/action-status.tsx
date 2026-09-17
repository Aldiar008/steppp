"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form";
import { formatDateRu } from "@/lib/date";
import type { ActionState, ActionStatus } from "@/lib/state/app-store";
import { cn } from "@/lib/utils";

/**
 * Where a step stands, in the applicant's own words.
 *
 * One "Сделано" button forces a lie: a step nobody has started has no honest
 * control, so the only way to interact with the plan is to claim work that did
 * not happen. Three states fix that — I mean to, I am doing it, it is done —
 * and a date turns an intention into something the applicant can look at later.
 *
 * None of it is evidence and none of it moves a deadline. The engine reads only
 * the finished list, and a programme's dates come from the catalogue: ticking a
 * box here cannot buy time, and the copy says so.
 */

const LABELS: Readonly<Record<ActionStatus, string>> = {
  planned: "Планирую",
  doing: "Делаю",
  done: "Сделано",
};

const HINTS: Readonly<Record<ActionStatus, string>> = {
  planned: "Поставил себе на дату",
  doing: "В работе",
  done: "Отмечено как сделанное",
};

const ORDER: readonly ActionStatus[] = ["planned", "doing", "done"];

export function ActionStatusControl({
  state,
  onSet,
  onClear,
  className,
}: {
  state: ActionState | undefined;
  onSet: (status: ActionStatus, plannedDate?: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const status = state?.status;

  return (
    <div className={cn("mt-3", className)}>
      <div
        role="group"
        aria-label="Что с этим шагом"
        className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1"
      >
        {ORDER.map((option) => {
          const active = status === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              title={HINTS[option]}
              onClick={() => {
                if (active) {
                  onClear();
                  setEditingDate(false);
                  return;
                }
                onSet(option, option === "planned" ? state?.planned_date : undefined);
                setEditingDate(option === "planned" && state?.planned_date === undefined);
              }}
              className={cn(
                "min-h-9 rounded-md px-3 text-sm transition-colors",
                active
                  ? "bg-card font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>

      {status === "planned" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {editingDate || state?.planned_date === undefined ? (
            <>
              <label htmlFor={`plan-${status}`} className="text-xs text-muted-foreground">
                Когда планируешь
              </label>
              <input
                id={`plan-${status}`}
                type="date"
                value={state?.planned_date ?? ""}
                onChange={(event) => onSet("planned", event.target.value)}
                onBlur={() => setEditingDate(false)}
                className={cn(inputClass, "h-9 w-auto")}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDate(true)}
              className="min-h-9 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Планируешь на {formatDateRu(state.planned_date)} — изменить
            </button>
          )}
        </div>
      )}

      {status === "done" && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 min-h-9 px-2 text-xs"
          onClick={onClear}
        >
          Вернуть в план
        </Button>
      )}
    </div>
  );
}
