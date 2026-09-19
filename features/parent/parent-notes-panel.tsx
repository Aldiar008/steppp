"use client";

import { useCallback, useEffect, useState } from "react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/form";
import type { NoteTargetType, ParentNote } from "@/features/notes/types";
import { useAuthSession } from "@/features/auth/use-auth-session";
import { formatDateRu } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";

export interface NoteOption {
  id: string;
  label: string;
}

/**
 * The one write path a parent has, and only this one: a short note, tied to
 * a specific open door, a specific plan step, or general — never to the
 * student's profile or progress itself. `parent_notes`'s RLS is what actually
 * enforces the "only a linked student" and "parent can only touch their own
 * notes" rules; this panel just gives them a form.
 */
export function ParentNotesPanel({
  studentId,
  doorOptions,
  actionOptions,
}: {
  studentId: string;
  doorOptions: readonly NoteOption[];
  actionOptions: readonly NoteOption[];
}) {
  const { user } = useAuthSession();
  const [notes, setNotes] = useState<ParentNote[] | null>(null);
  const [target, setTarget] = useState("general");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(async (): Promise<ParentNote[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("parent_notes")
      .select("*")
      .eq("student_user_id", studentId)
      .order("created_at", { ascending: false });
    return data ?? [];
  }, [studentId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await load();
      if (!cancelled) setNotes(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0 || user === null) return;

    setBusy(true);
    setError(undefined);

    const [kind, id] = target.split(":") as [NoteTargetType | "general", string | undefined];
    const targetType: NoteTargetType = kind === "door" || kind === "action" ? kind : "general";

    const supabase = createClient();
    const { error: insertError } = await supabase.from("parent_notes").insert({
      parent_user_id: user.id,
      student_user_id: studentId,
      target_type: targetType,
      target_id: targetType === "general" ? null : (id ?? null),
      body: trimmed,
    });

    if (insertError) {
      setError("Не получилось сохранить заметку. Попробуй ещё раз.");
      setBusy(false);
      return;
    }

    setBody("");
    setNotes(await load());
    setBusy(false);
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("parent_notes").delete().eq("id", id);
    setNotes((current) => current?.filter((note) => note.id !== id) ?? current);
  }

  function labelFor(note: ParentNote): string {
    if (note.target_type === "general") return "Общая заметка";
    const options = note.target_type === "door" ? doorOptions : actionOptions;
    const match = options.find((option) => option.id === note.target_id);
    return match ? `К «${match.label}»` : note.target_type === "door" ? "К пути" : "К шагу плана";
  }

  return (
    <section className="mt-8 border-t border-border pt-4">
      <h2 className="text-sm font-medium">Заметки для ученика</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Коротко и по делу — заметка появится у него в приложении, рядом с тем, к чему её оставили.
        Изменить профиль или отметки о сделанном отсюда нельзя.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-2">
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className={inputClass}
          aria-label="К чему заметка"
        >
          <option value="general">Общая заметка</option>
          {doorOptions.length > 0 && (
            <optgroup label="К открытому пути">
              {doorOptions.map((option) => (
                <option key={option.id} value={`door:${option.id}`}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          )}
          {actionOptions.length > 0 && (
            <optgroup label="К шагу плана">
              {actionOptions.map((option) => (
                <option key={option.id} value={`action:${option.id}`}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Например: давай в субботу вместе посмотрим требования по языку"
          className={`${inputClass} resize-y`}
        />
        {error !== undefined && (
          <p role="alert" className="text-xs font-medium text-critical-ink">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" className="min-h-9" disabled={busy || body.trim().length === 0}>
          Оставить заметку
        </Button>
      </form>

      {notes === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Загружаем…</p>
      ) : notes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Пока ничего не оставлено.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="panel-inset flex items-start gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {labelFor(note)} · {formatDateRu(note.created_at.slice(0, 10))}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed">{note.body}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-8 shrink-0 text-muted-foreground"
                onClick={() => void remove(note.id)}
                aria-label="Удалить заметку"
              >
                <TrashIcon className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
