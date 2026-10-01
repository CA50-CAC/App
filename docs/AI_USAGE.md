# AI usage log

What AI tools helped with, and roughly how. Kept for contest disclosure.
**VERIFY** the CA-50 disclosure rule.

| Date | Tool | What | How |
|---|---|---|---|
| 2026-09-30 | Claude Code (Claude Opus 5.5) | Supabase connection: `src/lib/supabase/*`, `src/proxy.ts`, env var changes | Adapted Supabase's quickstart to this repo (pnpm, Next 16 `proxy.ts`, no browser client, session refresh fix). The student reviewed the plan and chose to keep PGlite alongside Supabase and use the Supabase CLI for migrations. |
| 2026-09-30 | Claude Code (Claude Opus 5.5) | Migration runner for PGlite, database test harness, isolation and schema-guard tests, Supabase CLI setup | Wrote the code after review feedback asked whether local tests really check the deployed security rules. Found and fixed a missing sequence revoke in the draft migration. |

<!-- Earlier work (the scaffold, commit 597ef33) isn't logged yet. Add it here. -->
