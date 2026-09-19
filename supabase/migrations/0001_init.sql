-- Stepwise: accounts, parent invites, student state.
--
-- Design in one sentence per table:
--   users              — who exists and what role they hold (mirror of auth.users,
--                         because auth.users itself is never exposed to PostgREST).
--   parent_invites     — one-time codes a student generates; closed table, touched
--                         only through the functions below, never directly.
--   parent_child_links — who is allowed to read whose student_state.
--   student_state      — the computed profile/doors/roadmap JSON, one row per student.
--
-- The one policy that matters for the whole feature: student_state has no INSERT/
-- UPDATE policy for anyone but the student themselves. A parent's JWT can SELECT a
-- linked student's row and nothing else — there is no code path, RPC or otherwise,
-- that lets a parent write into it. That is enforced here, not in the UI.

create extension if not exists pgcrypto;

/* -------------------------------------------------------------------------- */
/* Tables                                                                      */
/* -------------------------------------------------------------------------- */

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Nullable as a defensive fallback, not because any sign-up path in this app
  -- leaves it unset: `handle_new_user()` always reads `role` from the sign-up
  -- call's own metadata, and both sign-up screens always supply it. A row
  -- created outside that path (an admin action in the dashboard, a future
  -- auth method) should still insert rather than fail the whole account
  -- creation — every consumer of this column already treats null the same
  -- as "signed out" (`lib/auth/route-guard.ts` and the RPCs below).
  role text check (role in ('student', 'parent')),
  email text not null,
  name text not null default '',
  auth_provider text not null default 'email' check (auth_provider = 'email'),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.parent_child_links (
  parent_user_id uuid not null references public.users (id) on delete cascade,
  student_user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  invite_code_used text,
  primary key (parent_user_id, student_user_id)
);

create index idx_links_parent on public.parent_child_links (parent_user_id);
create index idx_links_student on public.parent_child_links (student_user_id);

create table public.parent_invites (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  -- `on delete set null`, not the default (no action): without it, deleting a
  -- parent account who has ever redeemed an invite fails outright — the
  -- invite row would otherwise point at a user that no longer exists. The
  -- invite stays on record as used; only the "used by whom" reference clears.
  used_by_parent_id uuid references public.users (id) on delete set null
);

create index idx_invites_student on public.parent_invites (student_user_id);

create table public.student_state (
  student_user_id uuid primary key references public.users (id) on delete cascade,
  schema_version integer not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* Row level security                                                          */
/* -------------------------------------------------------------------------- */

alter table public.users enable row level security;
alter table public.parent_child_links enable row level security;
alter table public.parent_invites enable row level security;
alter table public.student_state enable row level security;

-- users: you, or anyone you're linked to in either direction (a parent needs the
-- student's name to render anything; a student is shown who has access to them).
create policy users_select on public.users
  for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.parent_child_links l
      where (l.parent_user_id = auth.uid() and l.student_user_id = users.id)
         or (l.student_user_id = auth.uid() and l.parent_user_id = users.id)
    )
  );
-- Deliberately no insert/update/delete policy: the row is created by the trigger
-- below, and the only fields a client may ever change (name, onboarding_completed,
-- role-once) go through the SECURITY DEFINER functions further down.

create policy links_select on public.parent_child_links
  for select
  using (auth.uid() = parent_user_id or auth.uid() = student_user_id);
-- No write policy here either: a link is created only inside redeem_parent_invite,
-- removed only inside revoke_parent_link, both SECURITY DEFINER.

-- parent_invites carries no policy at all: every access — including the student
-- reading their own outstanding codes — goes through the functions below, which
-- run as the table owner and so are unaffected by RLS. Zero policies + RLS
-- enabled means a direct REST call from any client role sees nothing and writes
-- nothing, which is exactly the point: a code's validity is decided in one place.

-- student_state: this pair of policies is the actual guarantee. A parent has a
-- SELECT path via the link; there is no INSERT or UPDATE policy that ever
-- mentions a parent, so no request authenticated as a parent can affect this
-- table, no matter what it targets.
create policy student_state_select on public.student_state
  for select
  using (
    student_user_id = auth.uid()
    or exists (
      select 1 from public.parent_child_links l
      where l.parent_user_id = auth.uid() and l.student_user_id = student_state.student_user_id
    )
  );

create policy student_state_insert on public.student_state
  for insert
  with check (student_user_id = auth.uid());

create policy student_state_update on public.student_state
  for update
  using (student_user_id = auth.uid())
  with check (student_user_id = auth.uid());

/* -------------------------------------------------------------------------- */
/* New-account trigger                                                        */
/* -------------------------------------------------------------------------- */

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, role, email, name, auth_provider)
  values (
    new.id,
    new.raw_user_meta_data ->> 'role',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    'email'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* -------------------------------------------------------------------------- */
/* RPCs — the only way to write to the tables above besides the trigger        */
/* -------------------------------------------------------------------------- */

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  -- No 0/O/1/I/L: a code a teenager reads out loud to a parent over the phone
  -- should not depend on a font to tell the letters apart from the digits.
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  -- Schema-qualified rather than relying on search_path: Supabase installs
  -- pgcrypto into `extensions`, not `public`, and a plain `gen_random_bytes(8)`
  -- 404s at call time with "function ... does not exist" — caught only by
  -- actually calling this function against a real project, since `create
  -- extension if not exists pgcrypto` succeeds either way and gives no signal
  -- about which schema it landed in.
  raw bytea := extensions.gen_random_bytes(8);
begin
  for i in 0..7 loop
    result := result || substr(chars, (get_byte(raw, i) % length(chars)) + 1, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.rename_self(p_name text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set name = p_name where id = auth.uid();
$$;

create or replace function public.mark_onboarding_complete()
returns void
language sql
security definer
set search_path = public
as $$
  update public.users set onboarding_completed = true where id = auth.uid() and role = 'student';
$$;

create or replace function public.create_parent_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_code text;
  v_expires timestamptz := now() + interval '7 days';
begin
  select role into v_role from public.users where id = auth.uid();
  if v_role is distinct from 'student' then
    raise exception 'only a student account can invite a parent';
  end if;

  loop
    v_code := public.generate_invite_code();
    -- Table-qualified on purpose: `code` is both this function's own OUT
    -- parameter (from `returns table (code text, ...)`, implicitly a plpgsql
    -- variable in scope here) and a real column on parent_invites — an
    -- unqualified `where code = v_code` is genuinely ambiguous to Postgres,
    -- not just to a reader, and fails at call time with error 42702.
    exit when not exists (select 1 from public.parent_invites where parent_invites.code = v_code);
  end loop;

  insert into public.parent_invites (student_user_id, code, expires_at)
  values (auth.uid(), v_code, v_expires);

  return query select v_code, v_expires;
end;
$$;

-- Callable while signed out — an invite link is opened before the parent has any
-- account at all. Returns the smallest amount of information that lets the
-- landing screen decide what to show: never the student's email, never the code
-- of any *other* invite.
create or replace function public.get_invite_info(p_code text)
returns table (valid boolean, reason text, student_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  select i.*, u.name as s_name into v_invite
  from public.parent_invites i
  join public.users u on u.id = i.student_user_id
  where i.code = upper(p_code);

  if not found then
    return query select false, 'not_found', null::text;
  elsif v_invite.used_at is not null then
    return query select false, 'used', v_invite.s_name;
  elsif v_invite.expires_at <= now() then
    return query select false, 'expired', v_invite.s_name;
  elsif auth.uid() is not null and v_invite.student_user_id = auth.uid() then
    return query select false, 'self', v_invite.s_name;
  else
    return query select true, 'ok', v_invite.s_name;
  end if;
end;
$$;

-- The core state transition: one code, consumed exactly once, into exactly one
-- link. Every branch returns a status instead of raising, so the caller —
-- `features/parent/join-screen.tsx`, directly after sign-up or sign-in — can
-- show a precise, honest reason rather than a generic failure.
create or replace function public.redeem_parent_invite(p_code text)
returns table (status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_invite record;
begin
  select role into v_role from public.users where id = auth.uid();
  if v_role is null then
    return query select 'not_ready'; return;
  end if;
  if v_role <> 'parent' then
    return query select 'wrong_role'; return;
  end if;

  select * into v_invite from public.parent_invites where code = upper(p_code);
  if not found then
    return query select 'not_found'; return;
  end if;
  if v_invite.student_user_id = auth.uid() then
    return query select 'self'; return;
  end if;
  if v_invite.used_at is not null then
    return query select 'used'; return;
  end if;
  if v_invite.expires_at <= now() then
    return query select 'expired'; return;
  end if;

  -- The WHERE clause re-checks used_at/expires_at at the moment of the write, so
  -- two tabs redeeming the same code at once cannot both win.
  update public.parent_invites
  set used_at = now(), used_by_parent_id = auth.uid()
  where id = v_invite.id and used_at is null and expires_at > now();

  if not found then
    return query select 'used'; return;
  end if;

  insert into public.parent_child_links (parent_user_id, student_user_id, invite_code_used)
  values (auth.uid(), v_invite.student_user_id, v_invite.code)
  on conflict (parent_user_id, student_user_id) do nothing;

  return query select 'ok';
end;
$$;

create or replace function public.revoke_parent_link(p_parent_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.parent_child_links
  where student_user_id = auth.uid() and parent_user_id = p_parent_id;
$$;

/* -------------------------------------------------------------------------- */
/* Grants                                                                      */
/* -------------------------------------------------------------------------- */

grant select on public.users to authenticated;
grant select on public.parent_child_links to authenticated;
grant select, insert, update on public.student_state to authenticated;
-- parent_invites: no table grant at all — RPC-only, see the comment above.

revoke all on function public.get_invite_info (text) from public;
grant execute on function public.get_invite_info (text) to anon, authenticated;

revoke all on function public.create_parent_invite () from public;
grant execute on function public.create_parent_invite () to authenticated;

revoke all on function public.redeem_parent_invite (text) from public;
grant execute on function public.redeem_parent_invite (text) to authenticated;

revoke all on function public.revoke_parent_link (uuid) from public;
grant execute on function public.revoke_parent_link (uuid) to authenticated;

revoke all on function public.rename_self (text) from public;
grant execute on function public.rename_self (text) to authenticated;

revoke all on function public.mark_onboarding_complete () from public;
grant execute on function public.mark_onboarding_complete () to authenticated;
