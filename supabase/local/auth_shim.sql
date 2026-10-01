-- =============================================================================
-- auth_shim.sql: LOCAL PROTOTYPE ONLY. Never run this on Supabase.
--
-- Supabase gives us an `auth` schema, an auth.uid() function, and the roles
-- `anon`, `authenticated`, and `service_role`. PGlite (Postgres in Node) has
-- none of that, so this file creates minimal stand-ins with the same names.
-- That lets 0001_init.sql run unchanged in both places.
--
-- How a staff request runs locally:
--   set local role authenticated;
--   select set_config('request.jwt.claim.sub', '<user uuid>', true);
--   ... queries ...   -- RLS sees auth.uid() = that user
-- =============================================================================

create schema if not exists auth;

create table auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- One-time magic-link tokens. Only the hash is stored.
create table auth.magic_links (
  token_hash text primary key,
  email      text not null,
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- Same contract as Supabase: the current user's id, or null if anonymous.
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to authenticated;
grant select (id, email) on auth.users to authenticated;
grant execute on function auth.uid() to anon, authenticated;
