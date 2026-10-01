-- =============================================================================
-- 0001_init.sql: Boomerang initial schema
--
-- DRAFT FOR REVIEW. Not applied anywhere yet.
--
-- Runs on Supabase as-is. For the local prototype (PGlite, no Docker) we first
-- run supabase/local/auth_shim.sql, which fakes the bits of Supabase this file
-- relies on: the auth.users table, auth.uid(), and the anon/authenticated roles.
--
-- Security model in one paragraph:
--   * Staff sign in and query AS the `authenticated` role, so Row Level Security
--     (RLS) decides which rows they can see. A staff member only sees rows whose
--     school_id belongs to a school they are a member of.
--   * Students never touch the database. Server routes read the `student_items`
--     view on their behalf, using the school id from a signed cookie.
--   * Anything only the platform should do (approve schools, create claims for
--     students, rate limiting) runs as the server's service role.
-- =============================================================================

-- ---------- Enums (mirror src/lib/domain/types.ts) ----------

create type public.school_status as enum ('pending_review', 'approved', 'rejected');
create type public.member_role   as enum ('owner', 'staff');
create type public.visibility    as enum ('full', 'limited', 'staff_only');
create type public.item_status   as enum ('available', 'claimed', 'returned', 'donated', 'removed');
create type public.claim_status  as enum ('pending', 'approved', 'rejected', 'picked_up');
create type public.category as enum (
  'clothing', 'bottle_lunchbox', 'bag', 'books_stationery', 'calculator_supplies',
  'sports_gear', 'electronics', 'earbuds_headphones', 'keys', 'wallet_id',
  'glasses_medical', 'jewelry_watch', 'instrument', 'other'
);

-- ---------- Schools ----------

create table public.schools (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 48),
  name                 text not null check (char_length(name) between 2 and 120),
  district             text check (char_length(district) <= 120),
  time_zone            text not null default 'America/Los_Angeles',
  logo_path            text,
  status               public.school_status not null default 'pending_review',
  setup_step           smallint not null default 0 check (setup_step between 0 and 7),
  join_code            text not null unique check (join_code ~ '^[A-Z0-9]{6,12}$'),
  photo_retention_days integer not null default 7  check (photo_retention_days between 0 and 365),
  donate_after_days    integer not null default 30 check (donate_after_days between 1 and 365),
  pickup_location      text check (char_length(pickup_location) <= 120),
  pickup_hours         text check (char_length(pickup_hours) <= 120),
  -- Only 'in_person' exists today. Login-based claims are a later feature.
  claim_verification   text not null default 'in_person' check (claim_verification = 'in_person'),
  -- Set when the signup email doesn't look like a school domain. Platform admin double-checks.
  needs_manual_review  boolean not null default false,
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  launched_at          timestamptz,
  reviewed_at          timestamptz,
  reviewed_by_email    text
);

create table public.school_members (
  school_id  uuid not null references public.schools (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (school_id, user_id)
);
create index school_members_user_idx on public.school_members (user_id);

create table public.staff_invites (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role        public.member_role not null default 'staff',
  token_hash  text not null unique,           -- sha256 hex of the invite token; the token itself is never stored
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);
create index staff_invites_school_idx on public.staff_invites (school_id);

-- ---------- Campus setup ----------

create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  unique (school_id, name),
  -- Lets other tables point at (school_id, id) so a row can never reference
  -- another school's location, even by mistake.
  unique (school_id, id)
);

-- "Nearby" links between two locations of the same school. Stored once per pair (a < b).
create table public.location_links (
  school_id uuid not null,
  a         uuid not null,
  b         uuid not null,
  primary key (a, b),
  check (a < b),
  foreign key (school_id, a) references public.locations (school_id, id) on delete cascade,
  foreign key (school_id, b) references public.locations (school_id, id) on delete cascade
);

create table public.school_categories (
  school_id          uuid not null references public.schools (id) on delete cascade,
  category           public.category not null,
  default_visibility public.visibility not null,
  primary key (school_id, category),
  constraint wallet_never_full check (not (category = 'wallet_id' and default_visibility = 'full'))
);

-- ---------- Items ----------

create table public.items (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools (id) on delete cascade,
  status            public.item_status not null default 'available',
  category          public.category not null,
  colors            text[] not null default '{}' check (cardinality(colors) <= 4),
  note              text check (char_length(note) <= 280),
  found_location_id uuid not null,
  found_at          timestamptz not null default now(),
  visibility        public.visibility not null,
  owner_hint        text check (char_length(owner_hint) <= 120),  -- staff-only, never shown to students
  photo_path        text,                                         -- storage path, never a public URL
  photo_deleted_at  timestamptz,                                  -- set by the retention job
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz,                                  -- when status left 'available'/'claimed'
  -- Embedding columns for matching are intentionally NOT here yet (separate ticket).
  unique (school_id, id),
  foreign key (school_id, found_location_id) references public.locations (school_id, id),
  constraint wallet_never_full check (not (category = 'wallet_id' and visibility = 'full'))
);
create index items_school_status_idx on public.items (school_id, status, found_at desc);

create table public.claims (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null,
  item_id         uuid not null,
  claimant_detail text not null check (char_length(claimant_detail) between 3 and 500),
  -- Optional, only for updates. To be deleted by the retention job when the claim closes.
  contact_email   text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  code_hash       text not null unique,     -- sha256 hex of the claim code; the code itself is never stored
  status          public.claim_status not null default 'pending',
  reviewed_by     uuid references auth.users (id) on delete set null,
  reviewed_at     timestamptz,
  picked_up_at    timestamptz,
  created_at      timestamptz not null default now(),
  foreign key (school_id, item_id) references public.items (school_id, id) on delete cascade
);
create index claims_school_status_idx on public.claims (school_id, status, created_at);

-- Who removed or bulk-changed what, and when. Required for "staff can remove any item; log removals".
create table public.audit_log (
  id         bigint generated always as identity primary key,
  school_id  uuid not null references public.schools (id) on delete cascade,
  actor_id   uuid references auth.users (id) on delete set null,
  action     text not null,                 -- e.g. 'item.removed', 'item.donated', 'join_code.rotated'
  item_id    uuid,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_school_idx on public.audit_log (school_id, created_at desc);

-- Fixed-window counters for signups, join-code attempts, and claim submissions.
-- Keys look like 'join:ip:203.0.113.5'. No personal data beyond the key itself.
create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  count        integer not null
);

-- ---------- Student view (privacy enforced in the database) ----------
--
-- The ONLY thing student-facing code reads. Staff-only and unavailable items
-- are filtered out, and the photo path and note are NULL unless the item is Full.
-- The owner hint never appears; students only get has_name_label.

create view public.student_items as
select
  i.id,
  i.school_id,
  i.category,
  i.colors,
  l.name                                                           as found_location_name,
  i.found_at,
  i.visibility,
  case when i.visibility = 'full' then i.photo_path end            as photo_path,
  case when i.visibility = 'full' then i.note end                  as note,
  (coalesce(btrim(i.owner_hint), '') <> '')                        as has_name_label
from public.items i
join public.locations l on l.id = i.found_location_id
where i.status = 'available'
  and i.visibility <> 'staff_only';

-- ---------- Helper functions for RLS ----------
-- SECURITY DEFINER so the check itself isn't blocked by RLS on school_members.
-- search_path is pinned so nobody can hijack the function with a fake table.

create function public.is_member(p_school_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.school_members m
    where m.school_id = p_school_id and m.user_id = auth.uid()
  );
$$;

create function public.is_owner(p_school_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.school_members m
    where m.school_id = p_school_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Creates a pending school and makes the caller its owner, in one step.
-- Status is always 'pending_review' here; only the platform can approve.
create function public.create_school(
  p_slug text, p_name text, p_district text, p_time_zone text,
  p_logo_path text, p_join_code text, p_needs_manual_review boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.schools (slug, name, district, time_zone, logo_path, join_code, needs_manual_review, created_by, setup_step)
  values (p_slug, p_name, p_district, p_time_zone, p_logo_path, p_join_code, p_needs_manual_review, auth.uid(), 2)
  returning id into v_id;
  insert into public.school_members (school_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end;
$$;

-- Accepts a staff invite if it's valid, unexpired, and addressed to the caller's email.
create function public.accept_staff_invite(p_token_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.staff_invites;
  v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  select * into v_invite from public.staff_invites
    where token_hash = p_token_hash and accepted_at is null and expires_at > now()
    for update;
  if v_invite.id is null or lower(v_invite.email) <> lower(v_email) then
    return null;
  end if;
  insert into public.school_members (school_id, user_id, role)
    values (v_invite.school_id, auth.uid(), v_invite.role)
    on conflict (school_id, user_id) do nothing;
  update public.staff_invites set accepted_at = now() where id = v_invite.id;
  return v_invite.school_id;
end;
$$;

-- ---------- Row Level Security ----------

alter table public.schools           enable row level security;
alter table public.school_members    enable row level security;
alter table public.staff_invites     enable row level security;
alter table public.locations         enable row level security;
alter table public.location_links    enable row level security;
alter table public.school_categories enable row level security;
alter table public.items             enable row level security;
alter table public.claims            enable row level security;
alter table public.audit_log         enable row level security;
alter table public.rate_limits       enable row level security;  -- no policies: service role only

-- Schools: members read; owners edit (only the columns granted below).
create policy schools_select on public.schools for select to authenticated using (public.is_member(id));
create policy schools_update on public.schools for update to authenticated
  using (public.is_owner(id)) with check (public.is_owner(id));

-- Members: members see who else is on staff; owners add/remove.
create policy members_select on public.school_members for select to authenticated using (public.is_member(school_id));
create policy members_insert on public.school_members for insert to authenticated with check (public.is_owner(school_id));
create policy members_delete on public.school_members for delete to authenticated using (public.is_owner(school_id));

-- Invites: owners only.
create policy invites_all on public.staff_invites for all to authenticated
  using (public.is_owner(school_id)) with check (public.is_owner(school_id));

-- Locations, links, category defaults: members read, owners write.
create policy locations_select on public.locations for select to authenticated using (public.is_member(school_id));
create policy locations_write  on public.locations for all    to authenticated
  using (public.is_owner(school_id)) with check (public.is_owner(school_id));
create policy links_select on public.location_links for select to authenticated using (public.is_member(school_id));
create policy links_write  on public.location_links for all    to authenticated
  using (public.is_owner(school_id)) with check (public.is_owner(school_id));
create policy categories_select on public.school_categories for select to authenticated using (public.is_member(school_id));
create policy categories_write  on public.school_categories for all    to authenticated
  using (public.is_owner(school_id)) with check (public.is_owner(school_id));

-- Items: any staff member of the school can read, add, and update. No hard deletes (use status 'removed').
create policy items_select on public.items for select to authenticated using (public.is_member(school_id));
create policy items_insert on public.items for insert to authenticated with check (public.is_member(school_id));
create policy items_update on public.items for update to authenticated
  using (public.is_member(school_id)) with check (public.is_member(school_id));

-- Claims: staff read and review. Students create claims through the server only.
create policy claims_select on public.claims for select to authenticated using (public.is_member(school_id));
create policy claims_update on public.claims for update to authenticated
  using (public.is_member(school_id)) with check (public.is_member(school_id));

-- Audit log: staff read their school's log and append entries as themselves.
create policy audit_select on public.audit_log for select to authenticated using (public.is_member(school_id));
create policy audit_insert on public.audit_log for insert to authenticated
  with check (public.is_member(school_id) and actor_id = auth.uid());

-- ---------- Grants ----------
-- Start from nothing, then grant only what each role needs. Column-level grants
-- stop an owner from approving their own school or a staff member from editing
-- a student's claim text.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;  -- Supabase grants these by default too
revoke all on all functions in schema public from public, anon;

grant select on public.schools to authenticated;
grant update (name, district, time_zone, logo_path, setup_step, join_code,
              photo_retention_days, donate_after_days, pickup_location, pickup_hours, launched_at)
  on public.schools to authenticated;

grant select, insert, delete on public.school_members to authenticated;
grant select, insert, update, delete on public.staff_invites to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, delete on public.location_links to authenticated;
grant select, insert, update, delete on public.school_categories to authenticated;

grant select, insert on public.items to authenticated;
grant update (status, category, colors, note, found_location_id, found_at, visibility,
              owner_hint, photo_path, updated_at, resolved_at)
  on public.items to authenticated;

grant select on public.claims to authenticated;
grant update (status, reviewed_by, reviewed_at, picked_up_at) on public.claims to authenticated;

grant select, insert on public.audit_log to authenticated;

grant execute on function public.is_member(uuid), public.is_owner(uuid),
  public.create_school(text, text, text, text, text, text, boolean),
  public.accept_staff_invite(text)
  to authenticated;

-- The student view is read by the server (service role) only.
revoke all on public.student_items from anon, authenticated;
