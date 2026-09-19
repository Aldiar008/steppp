-- One-directional notes: a parent can leave a short, visible note for a
-- linked student — on a specific open door, a specific plan action, or
-- general. The student can read; there is no path for the student (or an
-- unlinked parent) to write here at all, symmetric with `student_state`
-- being writable only by the student.

create table public.parent_notes (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references public.users (id) on delete cascade,
  student_user_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('door', 'action', 'general')),
  -- program_id or ActionStep id from the (static, non-DB) catalogue; null for
  -- 'general'. Not a foreign key on purpose — the catalogue lives in
  -- data/catalog.ts, not in Postgres, exactly like the rest of this schema
  -- never re-implements engine data.
  target_id text,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index idx_notes_student on public.parent_notes (student_user_id);
create index idx_notes_parent on public.parent_notes (parent_user_id);

alter table public.parent_notes enable row level security;

create policy notes_select on public.parent_notes
  for select
  using (student_user_id = auth.uid() or parent_user_id = auth.uid());

-- The only write path, and it requires an existing link — a parent cannot
-- address a note to a student they are not linked to, even by guessing an id.
create policy notes_insert on public.parent_notes
  for insert
  with check (
    parent_user_id = auth.uid()
    and exists (
      select 1 from public.parent_child_links l
      where l.parent_user_id = auth.uid() and l.student_user_id = parent_notes.student_user_id
    )
  );

create policy notes_delete on public.parent_notes
  for delete
  using (parent_user_id = auth.uid());
-- No update policy: a note is short-lived enough that "delete and re-add" is
-- the whole edit story, and it keeps this table's write surface as narrow as
-- student_state's.

grant select, insert, delete on public.parent_notes to authenticated;
