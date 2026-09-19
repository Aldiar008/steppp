/**
 * A parent's short note, addressed to one linked student.
 *
 * One direction only: a parent writes, a student reads — there is no reply
 * and no edit, only delete-and-repost, matching the narrow write surface of
 * `parent_notes` (`supabase/migrations/0002_parent_notes.sql`).
 */
export type NoteTargetType = "door" | "action" | "general";

export interface ParentNote {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  target_type: NoteTargetType;
  /** program_id or ActionStep id from the catalogue; null for "general". */
  target_id: string | null;
  body: string;
  created_at: string;
}
