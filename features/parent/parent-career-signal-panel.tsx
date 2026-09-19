"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form";
import { useAuthSession } from "@/features/auth/use-auth-session";
import type { ParentCareerSignal } from "@/lib/career/parent-signal";
import { createClient } from "@/lib/supabase/client";

/**
 * Part 9.1's three parent questions — the real, separate submission the
 * document requires ("родитель заходит по своей ссылке, в своей сессии"),
 * not a proxy the student fills in on their behalf. Written once, upserted
 * on every save (`parent_career_signal` has no delete policy — an update in
 * place is the whole edit story, same reasoning as `student_state`).
 *
 * Never shown to the student directly: the comparison screen in
 * `features/profession/parent-comparison-screen.tsx` reads this data through
 * `buildParentComparison`, which only ever reveals a computed fact, never
 * the parent's raw words verbatim to the student's own interview flow.
 */
export function ParentCareerSignalPanel({
  studentId,
  initial,
}: {
  studentId: string;
  initial: ParentCareerSignal | null;
}) {
  const { user } = useAuthSession();
  const [direction, setDirection] = useState(initial?.parent_direction ?? "");
  const [priorities, setPriorities] = useState(initial?.parent_priorities ?? "");
  const [support, setSupport] = useState(initial?.parent_support ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (user === null) return;
    setBusy(true);
    setError(undefined);
    setSaved(false);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("parent_career_signal").upsert({
      parent_user_id: user.id,
      student_user_id: studentId,
      parent_direction: direction.trim() || null,
      parent_priorities: priorities.trim() || null,
      parent_support: support.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setBusy(false);
    if (upsertError) {
      setError("Не получилось сохранить. Попробуй ещё раз.");
      return;
    }
    setSaved(true);
  }

  return (
    <section className="card-surface mt-6 p-5 sm:p-6">
      <h2 className="text-sm font-medium">Что думаете вы</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Три коротких вопроса. Ребёнок не увидит твои ответы, пока сам не закончит своё интервью — и увидит их
        только как сравнение, а не дословно.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="parent_direction" className="mb-1.5 block text-sm font-medium">
            Какое направление вы видите для ребёнка
          </label>
          <textarea
            id="parent_direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Например: медицина, потому что…"
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="parent_priorities" className="mb-1.5 block text-sm font-medium">
            Что для вас принципиально
          </label>
          <textarea
            id="parent_priorities"
            value={priorities}
            onChange={(event) => setPriorities(event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Деньги, город, безопасность, престиж — своими словами"
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label htmlFor="parent_support" className="mb-1.5 block text-sm font-medium">
            Что вы готовы поддержать финансово
          </label>
          <textarea
            id="parent_support"
            value={support}
            onChange={(event) => setSupport(event.target.value)}
            rows={2}
            maxLength={300}
            className={`${inputClass} resize-y`}
          />
        </div>

        {error !== undefined && (
          <p role="alert" className="text-xs font-medium text-critical-ink">
            {error}
          </p>
        )}
        {saved && <p className="text-xs text-open-ink">Сохранено.</p>}

        <Button type="submit" size="sm" className="min-h-9" disabled={busy}>
          Сохранить
        </Button>
      </form>
    </section>
  );
}
