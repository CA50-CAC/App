# Boomerang

A school lost-and-found that students can actually browse, with privacy built in.
Congressional App Challenge 2026 entry (CA-50).

> **Status:** early prototype. The domain rules and database schema exist; the
> wizard, gallery, and staff screens are being built next. See `CLAUDE.md` for
> the build order.

## Quick start

Requires Node 24 (see `.nvmrc`) and pnpm.

```bash
nvm use                      # or install Node 24 any way you like
corepack enable              # makes the pinned pnpm version available
pnpm install
cp .env.example apps/web/.env.local   # then set SESSION_SECRET
pnpm dev                     # http://localhost:3000
```

Checks (the same ones CI runs):

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Prototype vs. real deployment

The prototype runs with **no Docker and no cloud accounts**. The database is
[PGlite](https://pglite.dev), real Postgres compiled to WebAssembly, running
inside the Node process and saving to `.data/`.

**For the real deployment, use Supabase** (hosted Postgres, Storage, and Auth).
The SQL migrations in `supabase/migrations/` are written for Supabase and run
unchanged there. Locally, `supabase/local/auth_shim.sql` fakes the few Supabase
pieces they depend on (`auth.users`, `auth.uid()`, and the database roles). Code
reaches the database only through the repository interface in
`apps/web/src/lib/repo/interface.ts`, so switching to Supabase means writing one
new adapter, not changing pages. See `docs/DECISIONS.md`.

### Supabase setup (hosted project)

Migrations go to the hosted database through the Supabase CLI (installed as a
dev dependency), never by pasting into the dashboard, so the database always
matches `supabase/migrations/`.

```bash
pnpm exec supabase login                                   # once per machine, opens a browser
pnpm exec supabase link --project-ref <your-project-ref>   # once per clone; asks for the DB password
pnpm db:status                                             # which migrations the hosted DB has
pnpm db:push                                               # apply new migrations (ask the team first)
```

Migration files must be named `<number>_<name>.sql` (the CLI skips anything
else). Keep them zero-padded: `0002_...`, `0003_...`.

In the Supabase dashboard, under Authentication > URL Configuration, add your
app URL (for example `http://localhost:3000/**`) to the redirect allowlist, or
magic links won't return to the app.

### Are the local tests testing what's deployed?

The database tests in `apps/web/tests/db/` (tenant isolation, plus a schema
guard that fails if anything in `public` is open to the public API) run on
PGlite by default. To run the exact same tests against a hosted project:

```bash
# fill in SUPABASE_TEST_* in apps/web/.env.local (see .env.example)
pnpm test:supabase
```

Use a separate Supabase project for this if you can. Test data uses a
`zz-test-` slug and is deleted afterwards.

## Demo school

Not built yet. When it is: `pnpm seed:demo` creates **Demo High School** with
the fixed join code **`DEMO2026`**. Real schools get random 8-character codes.

## Repository layout

```
apps/web            Next.js app (student gallery, setup wizard, staff view, server routes)
  src/lib/domain    Pure rules: categories, visibility, codes, search filter (unit-tested)
  src/lib/repo      Repository interface (all database access goes through here)
  src/lib/auth      Auth interface and signed cookies
  src/lib/i18n      All user-facing strings
packages/           Shared packages (the matching engine will live in packages/matching)
supabase/
  migrations/       SQL schema, Row Level Security policies
  local/            Shims that let the migrations run locally in PGlite
  config.toml       Supabase CLI settings
apps/web/tests/db   Database tests (isolation, schema guard); run on PGlite or Supabase
docs/               DECISIONS.md
```

## How the privacy rules work (for explaining the project)

**Visibility levels.** Every item is Full, Limited, or Staff-only. Students see
the photo and note only for Full items. Limited items show just the category,
color, place, and date. Staff-only items aren't listed at all. This is enforced
twice:

1. `toStudentView()` in `src/lib/domain/visibility.ts` builds the student
   version of an item field by field, so a private field can't slip through.
2. The database view `student_items` blanks out the photo and note for anything
   that isn't Full. Student pages only ever read from this view.

**Tenant isolation.** Each school's data has a `school_id`. Staff queries run
as a limited database role with Row Level Security, so a staff member at School A
gets zero rows from School B even if our app code had a bug. Students never
query the database; the server does it for them using the school id inside a
signed cookie, which they can't forge without the server's secret.
