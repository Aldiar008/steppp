"use client";

import { useEffect, useState } from "react";
import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/ssr";

import { formatDateRu } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { NoteTargetType, ParentNote } from "./types";

/**
 * A parent's note, shown in the exact place it was left about.
 *
 * Reads `parent_notes` filtered to this target; row-level security already
 * restricts the result to notes addressed to the signed-in student (or, on a
 * parent's own screens, notes they wrote themselves) — no explicit
 * `student_user_id` filter is needed here for that reason.
 *
 * Renders nothing when there is nothing to show: an empty note list is not
 * worth a "no notes yet" callout on every door and every step.
 */
export function NotesFromParent({
  targetType,
  targetId,
  className,
  emptyLabel,
}: {
  targetType: NoteTargetType;
  /** Omit for `targetType: "general"`. */
  targetId?: string;
  className?: string;
  /** Shown instead of rendering nothing when there are no notes yet. */
  emptyLabel?: string;
}) {
  const [notes, setNotes] = useState<ParentNote[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const base = supabase
        .from("parent_notes")
        .select("*")
        .eq("target_type", targetType)
        .order("created_at", { ascending: false });
      const { data } = targetId === undefined ? await base.is("target_id", null) : await base.eq("target_id", targetId);
      if (!cancelled) setNotes(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  if (notes === null) return null;
  if (notes.length === 0) {
    return emptyLabel === undefined ? null : (
      <p className={cn("text-sm text-muted-foreground", className)}>{emptyLabel}</p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {notes.map((note) => (
        <div key={note.id} className="panel-inset flex items-start gap-2 px-3 py-2">
          <ChatCircleTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm leading-relaxed">{note.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Заметка от родителя · {formatDateRu(note.created_at.slice(0, 10))}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
