# Decisions

One entry per non-trivial technical choice: the choice, what else was considered, why, and when.

---

### 2026-09-30: Local-first database with PGlite; Supabase for the real deployment

- **Choice:** Prototype uses PGlite (`@electric-sql/pglite`), Postgres compiled to WebAssembly, running inside Node and saving to `.data/`. The real deployment should use Supabase.
- **Alternatives:** local Supabase (needs Docker, not available on the dev machine); a hosted Supabase project now (no account yet); a JSON-file or in-memory store (simplest, but can't run our real SQL, RLS policies, or constraints).
- **Reason:** PGlite runs the same SQL migrations and Row Level Security policies as Supabase, so the tenant-isolation and visibility tests exercise the real rules, not a copy of them. A throwaway run on 2026-09-30 confirmed that the RLS policies, column grants, and CHECK constraints all behave correctly in PGlite. A small shim (`supabase/local/auth_shim.sql`) stands in for Supabase's `auth` schema and roles.
- **Known limits:** PGlite allows a single connection per data directory, so `pnpm seed:demo` must not run while `pnpm dev` is running (the in-app "Reset demo data" button covers that case). Uploaded photos are stored on local disk under `.data/uploads/`; Supabase Storage replaces that later.
- **To move to Supabase:** apply `supabase/migrations/*` (not the local shim), write a `supabase` adapter for `src/lib/repo/interface.ts` and an `AuthProvider` backed by Supabase Auth, and set `DATA_ADAPTER=supabase`.

### 2026-09-30: Monorepo layout from SPEC Section 8

- **Choice:** pnpm workspace with `apps/web` (Next.js) and `packages/*`. `supabase/` and `docs/` at the root.
- **Reason:** keeps the matching engine (`packages/matching`, written by the student later) separate from the app and reusable by the evaluation harness.

### 2026-09-30: Toolchain versions

- **Choice:** Node 24 LTS, pnpm 12, Next.js 16.3 (App Router), React 19.2, TypeScript 5.9, Tailwind 4, ESLint 9, Vitest 5, Zod 4.
- **Reason:** Next.js and TypeScript versions are what `create-next-app@16.3.7` installs, so they are known to work together. TypeScript 7 (the native port) is out but Next's template still uses 5.9.
- **Next.js 16 notes:** `middleware.ts` is now `proxy.ts`. We set `X-Robots-Tag: noindex` with `headers()` in `next.config.ts` instead of a proxy because it's simpler and static.

### 2026-09-30: Privacy enforced in the database, not just the UI

- **Choice:** Students are served from a `student_items` view that only returns available, non-staff-only items and blanks the photo path and note unless the item is Full. Application code also projects items through `toStudentView()`.
- **Alternatives:** filter only in application code.
- **Reason:** CLAUDE.md requires enforcement "on the server and in the database access layer." Two independent guards mean one bug doesn't leak a photo.

### 2026-09-30: Composite foreign keys for tenant integrity

- **Choice:** `locations`, `items` have `unique (school_id, id)`, and child rows reference `(school_id, id)`.
- **Reason:** makes it impossible at the database level for an item to point at another school's location, or a claim at another school's item.

### 2026-09-30: Join code and claim code format

- **Choice:** 8-character join codes and 10-character claim codes from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L), generated with rejection sampling from `crypto.getRandomValues`. Claim codes and invite tokens are stored only as SHA-256 hashes.
- **Note:** the demo school's fixed code `DEMO2026` contains `0` and `O`. That's fine: it's documented and fixed, and code input is only uppercased, never "corrected."

### 2026-09-30: Accent color

- **Choice:** teal (`#0f766e` light, `#5eead4` dark). Student had no preference.
- **Reason:** calm, not "alert" colored, and passes WCAG AA on both themes (5.47:1 light, 12.77:1 dark, measured).

### 2026-09-30: Hosted Supabase project, alongside PGlite

- **Choice:** The team now has a hosted Supabase project. It's used when `DATA_ADAPTER=supabase`. PGlite stays the default for tests, CI, and the offline demo.
- **Alternatives:** replace PGlite with Supabase everywhere (tests and CI would then need network access and secrets, and the demo would no longer run with "no external services beyond the local DB").
- **Details:**
  - Keys use Supabase's newer format: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, safe to expose; RLS protects the data) replaces the old anon key, and `SUPABASE_SECRET_KEY` (`sb_secret_…`, server-only) replaces the service-role key.
  - No browser Supabase client. Students never touch the database, and staff screens go through server code, so the database is only reachable through code we control.
  - `src/proxy.ts` refreshes the staff session on each request (Next 16 renamed middleware to proxy). It calls `supabase.auth.getClaims()`, which is what actually triggers the refresh, and copies the cache-control headers `@supabase/ssr` 0.12 passes to `setAll`. Supabase's dashboard quickstart snippet does neither.
- **Migrations:** applied to the hosted project with the Supabase CLI, not by pasting into the SQL editor, so the hosted database can't drift from `supabase/migrations/`. The repo had no migration runner yet to reuse. PGlite reads the same files.
