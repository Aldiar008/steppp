"use client";

import { useId } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * Rules applied everywhere: label above the control, helper text in the markup
 * whether or not it is filled, error text below and tied to the input with
 * `aria-describedby`. No placeholder ever does a label's job.
 */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-critical-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-[15px] text-foreground " +
  "placeholder:text-muted-foreground/70 transition-colors " +
  "focus:border-ring focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-ring/30 " +
  "aria-[invalid=true]:border-critical";

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Single-select rendered as tappable cards. Real radios underneath for a11y. */
export function ChoiceGroup<T extends string>({
  legend,
  hint,
  value,
  options,
  onChange,
  columns = 2,
}: {
  legend: string;
  hint?: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      {hint && <p className="-mt-1 mb-1 text-xs text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          "grid gap-2",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-3",
        )}
      >
        {options.map((option) => {
          const selected = option.value === value;
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
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-foreground bg-foreground" : "border-border-strong",
                )}
              >
                {selected && <span className="size-1.5 rounded-full bg-background" />}
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
      </div>
    </fieldset>
  );
}

/** Multi-select chips. Used for target countries. */
export function ChipGroup({
  legend,
  hint,
  values,
  options,
  onToggle,
  max,
}: {
  legend: string;
  hint?: string;
  values: readonly string[];
  options: readonly { value: string; label: string; flag?: string }[];
  onToggle: (value: string) => void;
  max?: number;
}) {
  const atMax = max !== undefined && values.length >= max;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      {hint && <p className="-mt-1 mb-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value);
          const disabled = atMax && !selected;
          return (
            <label
              key={option.value}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled}
                onChange={() => onToggle(option.value)}
                className="sr-only"
              />
              {option.flag && <span aria-hidden>{option.flag}</span>}
              {option.label}
              {selected && <CheckIcon weight="bold" className="size-3.5" aria-hidden />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
