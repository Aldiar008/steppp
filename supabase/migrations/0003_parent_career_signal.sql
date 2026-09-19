-- Part 9 of the Career Interview Content Package: the parent's own signal,
-- collected in the parent's own session and never fed into the student's
-- scoring — see lib/career/parent-signal.ts. One row per parent-student
-- link, upserted (the parent's current answer, not a running log), mirroring
-- student_state's "one row per student" shape rather than parent_notes'
-- append-only log.

create table public.parent_career_signal (
  parent_user_id uuid not null references public.users (id) on delete cascade,
  student_user_id uuid not null references public.users (id) on delete cascade,
  -- §9.1's three questions, free text exactly as the parent wrote them.
  parent_direction text check (char_length(parent_direction) <= 300),
  parent_priorities text check (char_length(parent_priorities) <= 300),
  parent_support text check (char_length(parent_support) <= 300),
  updated_at timestamptz not null default now(),
  primary key (parent_user_id, student_user_id)
);

create index idx_career_signal_student on public.parent_career_signal (student_user_id);

alter table public.parent_career_signal enable row level security;

-- Symmetric with parent_notes: either side of the link can read.
create policy career_signal_select on public.parent_career_signal
  for select
  using (student_user_id = auth.uid() or parent_user_id = auth.uid());

-- The only write path, and only for an existing link — same guard as
-- parent_notes' insert policy.
create policy career_signal_upsert_insert on public.parent_career_signal
  for insert
  with check (
    parent_user_id = auth.uid()
    and exists (
      select 1 from public.parent_child_links l
      where l.parent_user_id = auth.uid() and l.student_user_id = parent_career_signal.student_user_id
    )
  );

-- Unlike parent_notes, this is meant to be updated in place — it is the
-- parent's current answer, not a dated message in a feed.
create policy career_signal_update on public.parent_career_signal
  for update
  using (parent_user_id = auth.uid())
  with check (parent_user_id = auth.uid());

grant select, insert, update on public.parent_career_signal to authenticated;
