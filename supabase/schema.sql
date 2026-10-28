-- ============================================================================
-- QR Attendance - database schema, RLS policies and RPC functions
-- Run this whole file in Supabase > SQL Editor. It is safe to re-run, and it
-- upgrades the earlier version of this project in place.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'student',
  id_number  text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len
  check (full_name is null or char_length(full_name) between 2 and 80);

create table if not exists public.events (
  id                 uuid primary key default gen_random_uuid(),
  event_code         text not null unique
                     default upper('EVT-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 6)),
  title              text not null,
  description        text,
  venue              text,
  start_time         timestamptz,
  end_time           timestamptz,
  status             text not null default 'open',
  late_after_minutes integer not null default 15,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.events add column if not exists description text;
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists status text not null default 'open';
alter table public.events add column if not exists late_after_minutes integer not null default 15;
alter table public.events add column if not exists updated_at timestamptz not null default now();
alter table public.events alter column event_code set default
  upper('EVT-' || to_char(now(), 'YYYY') || '-' || substr(md5(random()::text), 1, 6));

-- created_by now points at profiles so the app can embed the creator's name
alter table public.events drop constraint if exists events_created_by_fkey;
alter table public.events add constraint events_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check check (status in ('open', 'closed'));
alter table public.events drop constraint if exists events_title_len;
alter table public.events add constraint events_title_len check (char_length(title) between 3 and 100);
alter table public.events drop constraint if exists events_time_order;
alter table public.events add constraint events_time_order
  check (start_time is null or end_time is null or end_time > start_time);
alter table public.events drop constraint if exists events_late_range;
alter table public.events add constraint events_late_range check (late_after_minutes between 0 and 240);

-- The secret QR token lives in its OWN table so students can never read it.
create table if not exists public.event_qr_tokens (
  event_id   uuid primary key references public.events (id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  rotated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null,
  event_id    uuid not null references public.events (id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  status      text not null default 'present',
  recorded_by uuid references public.profiles (id) on delete set null,
  note        text,
  unique (student_id, event_id)          -- duplicate attendance prevention
);
alter table public.attendance add column if not exists status text not null default 'present';
alter table public.attendance add column if not exists recorded_by uuid references public.profiles (id) on delete set null;
alter table public.attendance add column if not exists note text;
alter table public.attendance drop constraint if exists attendance_student_id_fkey;
alter table public.attendance add constraint attendance_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete cascade;
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status in ('present', 'late', 'excused', 'absent'));

create index if not exists idx_events_created_by   on public.events (created_by);
create index if not exists idx_attendance_event    on public.attendance (event_id);
create index if not exists idx_attendance_student  on public.attendance (student_id);

-- ---------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS (SECURITY DEFINER so policies do not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() in ('teacher', 'admin'), false)
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

-- ---------------------------------------------------------------------------
-- 3. TRIGGERS
-- ---------------------------------------------------------------------------
-- New sign-ups are ALWAYS students. Teachers/admins are promoted by an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, id_number, role)
  values (
    new.id,
    new.email,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'id_number', '')), 30), ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Stops privilege escalation: only an admin may change role / is_active.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'Not allowed to change role, status or email.' using errcode = '42501';
    end if;
  end if;
  if auth.uid() is not null and new.id = auth.uid()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'You cannot change your own role or status.' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute procedure public.protect_profile_columns();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_touch_events on public.events;
create trigger trg_touch_events before update on public.events
  for each row execute procedure public.touch_updated_at();

-- Every event automatically gets its own secret QR token.
create or replace function public.create_event_token()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_qr_tokens (event_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists trg_event_token on public.events;
create trigger trg_event_token after insert on public.events
  for each row execute procedure public.create_event_token();
-- back-fill tokens for events created by the old version
insert into public.event_qr_tokens (event_id)
  select id from public.events on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.events         enable row level security;
alter table public.event_qr_tokens enable row level security;
alter table public.attendance     enable row level security;

-- drop every policy from the earlier version, then recreate cleanly
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public'
             and tablename in ('profiles', 'events', 'event_qr_tokens', 'attendance')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- profiles
create policy "profiles: read own"        on public.profiles for select using (auth.uid() = id);
create policy "profiles: admin read all"  on public.profiles for select using (public.is_admin());
create policy "profiles: teacher reads attendees" on public.profiles for select using (
  public.current_app_role() = 'teacher' and exists (
    select 1 from public.attendance a join public.events e on e.id = a.event_id
    where a.student_id = profiles.id and e.created_by = auth.uid()));
create policy "profiles: update own"      on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: admin update"    on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- events
create policy "events: read (signed-in, active)" on public.events for select
  using (public.is_active_user());
create policy "events: staff create" on public.events for insert
  with check (public.is_staff() and created_by = auth.uid());
create policy "events: owner or admin update" on public.events for update
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()))
  with check (public.is_admin() or (public.is_staff() and created_by = auth.uid()));
create policy "events: admin or empty-owner delete" on public.events for delete using (
  public.is_admin() or (public.is_staff() and created_by = auth.uid()
    and not exists (select 1 from public.attendance a where a.event_id = events.id)));

-- QR tokens: only the event owner or an admin can read them. Never writable directly.
create policy "tokens: owner or admin read" on public.event_qr_tokens for select using (
  public.is_admin() or exists (
    select 1 from public.events e where e.id = event_id and e.created_by = auth.uid()
      and public.is_staff()));

-- attendance
create policy "attendance: student reads own" on public.attendance for select
  using (auth.uid() = student_id);
create policy "attendance: teacher reads own events" on public.attendance for select using (
  public.is_staff() and exists (
    select 1 from public.events e where e.id = attendance.event_id and e.created_by = auth.uid()));
create policy "attendance: admin reads all"   on public.attendance for select using (public.is_admin());
-- Students have NO direct insert policy: they must go through record_attendance().
create policy "attendance: admin insert" on public.attendance for insert with check (public.is_admin());
create policy "attendance: admin update" on public.attendance for update
  using (public.is_admin()) with check (public.is_admin());
create policy "attendance: admin delete" on public.attendance for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. RPC FUNCTIONS (all validation happens on the server)
-- ---------------------------------------------------------------------------
-- Student scans a QR -> this function validates everything and records it.
create or replace function public.record_attendance(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_token  uuid;
  v_event  public.events%rowtype;
  v_status text;
  v_row    public.attendance%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthorized', 'message', 'Please sign in first.');
  end if;
  if coalesce(public.current_app_role(), '') <> 'student' then
    return jsonb_build_object('ok', false, 'code', 'unauthorized',
      'message', 'Only active student accounts can record attendance.');
  end if;

  begin
    v_token := p_token::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid_qr', 'message', 'This is not a valid attendance QR code.');
  end;

  select e.* into v_event
  from public.events e join public.event_qr_tokens t on t.event_id = e.id
  where t.token = v_token;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_qr',
      'message', 'This QR code is not recognised or has been replaced.');
  end if;

  if v_event.status <> 'open' then
    return jsonb_build_object('ok', false, 'code', 'closed',
      'message', 'This event is closed. Attendance can no longer be recorded.', 'event_title', v_event.title);
  end if;
  if v_event.start_time is not null and now() < v_event.start_time - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'code', 'not_started',
      'message', 'This event has not started yet. Check-in opens 15 minutes before the start.',
      'event_title', v_event.title);
  end if;
  if v_event.end_time is not null and now() > v_event.end_time then
    return jsonb_build_object('ok', false, 'code', 'closed',
      'message', 'This event has already ended.', 'event_title', v_event.title);
  end if;

  v_status := case
    when v_event.start_time is not null
     and now() > v_event.start_time + make_interval(mins => v_event.late_after_minutes)
    then 'late' else 'present' end;

  insert into public.attendance (student_id, event_id, status)
  values (v_uid, v_event.id, v_status)
  on conflict (student_id, event_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.attendance where student_id = v_uid and event_id = v_event.id;
    return jsonb_build_object('ok', false, 'code', 'duplicate',
      'message', 'You are already checked in for this event.',
      'event_title', v_event.title, 'scanned_at', v_row.scanned_at, 'status', v_row.status);
  end if;

  return jsonb_build_object('ok', true, 'code', 'recorded', 'message', 'Attendance recorded.',
    'event_title', v_event.title, 'venue', v_event.venue,
    'scanned_at', v_row.scanned_at, 'status', v_row.status);
end;
$$;

-- Teacher/admin replaces an event's QR (old printed copies stop working).
create or replace function public.rotate_event_token(p_event uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_new uuid := gen_random_uuid();
begin
  if not (public.is_admin() or exists (
      select 1 from public.events e where e.id = p_event and e.created_by = auth.uid() and public.is_staff()))
  then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  update public.event_qr_tokens set token = v_new, rotated_at = now() where event_id = p_event;
  return v_new;
end;
$$;

revoke all on function public.record_attendance(text)  from public, anon;
revoke all on function public.rotate_event_token(uuid) from public, anon;
grant execute on function public.record_attendance(text)  to authenticated;
grant execute on function public.rotate_event_token(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. REAL-TIME (teacher screen updates the moment a student checks in)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance') then
    alter publication supabase_realtime add table public.attendance;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. CREATE YOUR FIRST ADMIN (run once, after that account has registered)
-- ---------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'your.admin@school.edu';
