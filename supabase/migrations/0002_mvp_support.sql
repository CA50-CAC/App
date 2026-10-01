-- =============================================================================
-- 0002_mvp_support.sql: what the MVP needs on top of 0001_init.sql
--
-- NOT YET APPLIED to the hosted project. Apply with `pnpm db:push` after review.
--
-- 1. items.staff_note: private notes for staff ("scratch on the back, found
--    with a blue case"). Students never see it: the student_items view lists
--    its columns by name and doesn't include this one, and toStudentView()
--    doesn't copy it. We don't reuse owner_hint for this, because any value in
--    owner_hint shows students a "has a name label" badge.
-- 2. photo_path must live in the item's own school folder ("<school_id>/...").
--    The server always builds the path itself, but staff can update items
--    directly through the API, and this stops anyone pointing an item at
--    another school's photo.
-- 3. hit_rate_limit(): one atomic step for "count this attempt and tell me if
--    it's over the limit". Through Supabase's API, a read-then-write from the
--    app would let two requests at the same moment both slip through.
--    Server (secret key) only.
-- 4. list_school_members(): members with their emails. On Supabase, signed-in
--    users can't read auth.users, so the staff list needs a small function that
--    only answers for schools the caller belongs to.
-- 5. A private Storage bucket for item photos (Supabase only; skipped on
--    PGlite, which has no storage schema). No Storage policies are added on
--    purpose: only the server, with the secret key, can read or write photos.
--    Browsers get short-lived signed URLs, and only for photos they may see.
-- =============================================================================

-- 1. Private staff notes ------------------------------------------------------

alter table public.items
  add column staff_note text check (char_length(staff_note) <= 500);

-- Table-level SELECT and INSERT (granted in 0001) already cover new columns.
-- UPDATE was granted column by column, so add this one.
grant update (staff_note) on public.items to authenticated;

-- 2. Photos stay inside their school's folder ---------------------------------
-- NOT VALID: existing rows aren't re-checked (there are none we know of), but
-- every insert and update from now on is.

alter table public.items
  add constraint photo_in_school_folder
  check (photo_path is null or starts_with(photo_path, school_id::text || '/')) not valid;

-- 3. Rate limiting --------------------------------------------------------------
-- Fixed window: the first hit starts a window of p_window_seconds; hits inside
-- it are counted; the first hit after it ends starts a new window.

create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql volatile set search_path = '' as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end,
    count        = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                        then 1 else r.count + 1 end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default. This one is for the server only.
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;

-- 4. Staff list with emails -----------------------------------------------------

create function public.list_school_members(p_school_id uuid)
returns table (user_id uuid, email text, role public.member_role, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from public.school_members m
  join auth.users u on u.id = m.user_id
  where m.school_id = p_school_id
    and public.is_member(p_school_id)
  order by m.created_at, u.email;
$$;

revoke all on function public.list_school_members(uuid) from public, anon, authenticated;
grant execute on function public.list_school_members(uuid) to authenticated;

-- 5. Photo bucket (Supabase only) -------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end
$$;
