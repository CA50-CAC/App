# CLAUDE.md: Boomerang (school lost-and-found)
 
Working title. Congressional App Challenge 2026 entry (CA-50). Deadline is roughly Oct 26, 2026; the real target is to submit by Oct 23. **VERIFY** the exact CA-50 deadline.
 
This file tells you what to build next and how to work. The student author owns this project. You are the pair programmer.
 
---
 
## 1. Read first
 
- If `SPEC.md` exists, read it for the product context, privacy principles, matching and evaluation plan, and contest checklist.
- **Where `SPEC.md` and this file disagree, this file wins.** Overrides:
  1. **A browsable "store" gallery replaces search-only.** Search stays as a filter box. The matching engine (SPEC Section 6) is a separate, later ticket. Do not build it now, but leave the hook described in Section 5.
  2. **No ID upload, ever.** Claims are a request plus in-person staff verification. Do not build student accounts now. Put authentication behind an interface so login can be added later.
  3. **Multi-school self-serve admin setup is in scope** (SPEC listed it as a stretch).
  4. **Per-item visibility levels** replace the "restricted categories" list (Section 4).
- **Before writing code:** reply with a short plan, the list of files you'll add or change, and any questions. Wait for approval.
## 2. Current task: build two things
 
### A. Admin setup wizard
A school admin signs up and configures a school from scratch, then gets everything needed to launch.
 
### B. Test store (demo school)
A seeded demo school with a student-facing gallery, a claim request flow, and a minimal staff view, so the prototype can be demoed and tested without any real data.
 
Both are described in detail below.
 
---
 
## 3. Admin setup wizard
 
**Route:** `/setup` (resumable; each step is its own route, e.g. `/setup/1`).
**Principles:** progress saved after every step, back and forward navigation, inline validation, no dead ends, finishes in under 5 minutes.
 
### Steps
1. **Account.** Email magic link (no passwords). Show a soft note if the email domain doesn't look like a school domain, but do not block it. Many schools use unusual domains. Flag it for manual review instead.
2. **School profile.** Name, district (optional), time zone, optional logo upload (strip EXIF).
3. **Campus locations.** Quick-add chips from templates (Front office, Gym, Cafeteria, Library, Field, Main hall, Classroom wing, Bus loop) plus custom entries. Reorderable. Optional "nearby" links between locations (used later by matching).
4. **Categories and privacy defaults.** For each category, set the default visibility (see Section 4). Offer presets: **Standard**, **Strict**, **Open**, then let the admin adjust per category. Categories: Clothing, Water bottle or lunchbox, Bag or backpack, Books and stationery, Calculator or school supplies, Sports gear, Phone, tablet, or laptop, Earbuds or headphones, Keys, Wallet, ID, or cards, Glasses or medical item, Jewelry or watch, Musical instrument, Other. **Wallet, ID, or cards can never be set to Full.**
5. **Policies.** Photo retention days after resolution (default 7), donate-after days (default 30), pickup location and hours, claim verification mode (in-person only for now, shown as the only option, with "login-based claims" as a disabled "coming soon" item).
6. **Staff.** Invite staff by email with roles `owner` and `staff`. In demo mode and local dev, display the invite link instead of sending email.
7. **Review and launch.** Summary, then launch. Output: a **join code**, a **shareable link**, a **QR code**, and a **print-ready poster page** (`/s/[slug]/poster`, print CSS, no PDF dependency).
### Live preview
On desktop, show a right-hand panel on steps 3 to 5 that renders a sample item card exactly as students would see it under the current privacy settings. Seeing the same item as Full, Limited, and Staff-only is the key moment of the wizard. Make it good.
 
### School verification and approval
- New schools start as `pending_review`. While pending: the admin can use all staff tools and preview the student view, but the student join code is disabled.
- A **platform admin** (emails in the `PLATFORM_ADMIN_EMAILS` env var) approves schools at `/platform/schools`.
- When `DEMO_MODE=true`, schools are auto-approved.
- Rate-limit signups per IP and per email. Add a honeypot field. Collect no data beyond what is listed above.
### Settings
Everything in the wizard must also be editable later at `/admin/settings`, reusing the same components.
 
### Wizard acceptance criteria
- [ ] A new user can complete all 7 steps and land on a launch screen with join code, link, QR, and poster.
- [ ] Closing the browser mid-wizard and returning resumes at the right step with saved data.
- [ ] Preview panel reflects changes immediately.
- [ ] Wallet, ID, or cards cannot be set to Full.
- [ ] Pending schools cannot be joined by students; approved ones can.
- [ ] Fully keyboard-navigable; no accessibility errors from an automated check.
---
 
## 4. Visibility levels (core privacy feature)
 
Every item has a visibility, defaulting from its category and overridable per item by staff with a clear switch ("Private item").
 
| Level | What students see | Staff see |
|---|---|---|
| **Full** | Photo, category, colors, note, found location, found date | Everything |
| **Limited** | Category icon and color swatch, found location, found date. **No photo, no note.** | Everything |
| **Staff-only** | Not listed at all | Everything |
 
- Photos for Limited and Staff-only items are never sent to student clients. Enforce this **on the server and in the database access layer**, not just in the UI. Write a test that fetches a Limited item as a student and asserts that no photo URL or note is in the response.
- Limited items still need a claim request with an identifying detail the student types in (for example, "what's on the lock screen").
- An optional **staff-only owner hint** field (for example, a name on a label). Never shown to students. Students see only a "has a name label" badge.
---
 
## 5. Test store (demo school)
 
### Demo school
- Created by `pnpm seed:demo` (idempotent). Name: "Demo High School". Fixed join code `DEMO2026` (documented in the README; real schools get random codes).
- `DEMO_MODE=true` shows a visible "Demo" banner and a staff-only "Reset demo data" button.
### Seed data (about 24 items)
- Spread across all categories and all three visibility levels (at least 5 Limited, 2 Staff-only).
- **Include confusable groups:** 3 black water bottles, 3 gray hoodies, 3 earbud cases, 3 calculators. These are useful for demos and for later matching tests.
- Found dates spread over the last 30 days; at least 3 older than the donate-after threshold so the "ready to donate" state is visible.
- Locations drawn from the demo school's location list.
- **Images:** generate simple, deterministic SVG illustrations per category with color variants (`scripts/gen-demo-images`). No real photos, no people, no licensing issues.
- Note for later: synthetic images are fine for demos but are **not** valid for the matching evaluation. That uses real photos collected per SPEC Section 7.
### Student-facing gallery (`/s/[slug]`)
- Entered via join code (or the QR link). Session scoped to that one school.
- Grid of item cards with filters (category, location, date range) and a text box that filters by category, color, and note.
- **Hook for later matching:** put all search behind one function, `searchItems(schoolId, query, filters)`, returning ranked item ids. Today it is a simple filter. Do not implement matching.
- Item detail view. "This might be mine" opens a claim form: identifying detail (required), optional contact email.
- After submitting, show a **claim code / status link** so the student can check the claim without an account.
- Mobile-first. Block search-engine indexing on all school pages (`noindex` meta and `X-Robots-Tag` header).
### Minimal staff view (`/admin`)
- Intake form: photo upload (strip EXIF), category (suggest default visibility), colors, note, found location, "Private item" switch, staff-only owner hint.
- Item list with filters; change status (available, claimed, returned, donated, removed).
- Claims queue: see each claim's detail next to the item, approve or reject, mark picked up. In-person verification happens offline; the app only records the outcome.
- "Ready to donate" list for items older than the donate-after threshold; staff confirms in bulk.
### Test store acceptance criteria
- [ ] `pnpm seed:demo` then `pnpm dev` gives a working demo with no external services beyond the local DB.
- [ ] A student entering `DEMO2026` sees Full items with photos, Limited items without photos or notes, and no Staff-only items.
- [ ] The visibility test in Section 4 passes.
- [ ] Submitting a claim creates a pending claim visible in the staff queue, and the student can check its status with the claim code.
- [ ] Flipping "Private item" on a Full item immediately removes its photo from the student view.
- [ ] "Reset demo data" restores the seeded state.
---
 
## 6. Architecture rules
 
- **Stack (defaults, **VERIFY** versions and limits before relying on them):** Next.js (App Router), TypeScript, Tailwind, Supabase (Postgres, Storage, Auth). Use the repo layout in `SPEC.md` Section 8.
- **Data access goes through a repository interface** so a local or in-memory adapter can run the demo if Supabase setup blocks progress. Prefer real Supabase locally if it works.
- **Multi-tenant from day one.** Every tenant-owned table has `school_id`. Staff access is enforced with Row Level Security. Student actions go through server routes that derive `school_id` from the signed session, never from client input.
- **Write a test proving cross-school isolation:** an admin of School A cannot read or modify School B's items, claims, settings, or members.
- **Students never talk to the database directly.** Server routes validate input and rate-limit.
- **Join codes:** random, 8 characters from an unambiguous alphabet (no 0/O, 1/I/l), rate-limited attempts, rotatable by the admin.
- **Migrations:** propose them and show me before applying. Likely additions beyond SPEC Section 9: `schools.slug`, `schools.status`, `schools.setup_step`, `school_members(school_id, user_id, role)`, `school_categories(school_id, category, default_visibility)`, `items.visibility`, `items.owner_hint`, and a hashed claim code on `claims`.
- Keep auth behind an `AuthProvider`-style interface so student login can be added later without rewriting.
## 7. Privacy and safety (non-negotiable)
 
- No student names, student IDs, or ID images stored. No ID upload feature.
- Strip EXIF (including GPS) from every uploaded image.
- Face blur on-device before upload is specified in `SPEC.md` (spike T0.4). For this task, leave a clearly marked hook in the upload pipeline and a TODO. Don't fake it.
- Retention: delete photos N days after an item is resolved (N from school policy). Implement as a scheduled or callable job.
- No secrets in the repo. `.env.example` only.
- Staff can remove any item; log removals.
## 8. Design
 
Design quality is a judging criterion. Follow `SPEC.md` Section 11. If a frontend design skill or guide is available in your environment, use it.
 
- Calm, modern, high contrast, one accent color, generous spacing, rounded components, light and dark themes.
- Touch targets at least 44px, WCAG AA contrast, respect reduced motion.
- Skeleton loaders, good empty states, friendly errors.
- All user-facing strings go through an i18n layer (English only for now).
- The wizard and the student gallery are the two screens judges will see first. Spend the polish budget there.
## 9. Working agreement
 
- **Plan first, then code.** Small commits, tests green.
- **Explain as you go.** Leave short comments or README sections the student can use to explain each non-trivial module aloud.
- **Log AI assistance** in `docs/AI_USAGE.md` (what, which tool, roughly how). The contest may require disclosure. **VERIFY** the CA-50 rule.
- **Log decisions** in `docs/DECISIONS.md` (choice, alternatives, reason, date).
- **Don't invent APIs or limits.** Check current docs for anything marked VERIFY.
- **Ask before** adding a heavy dependency, changing the data model beyond Section 6, or choosing something hard to reverse.
- **No scope creep.** The matching engine, evaluation harness, email alerts, and student login are not part of this task. The student writes the matching package and evaluation code himself.
## 10. Build order
 
1. Scaffold, tooling, CI (typecheck, lint, tests), `.env.example`, README.
2. Migrations (shown for approval), RLS, repository interface, seed script for locations and categories.
3. Auth (magic link) and the multi-tenant session model, plus the isolation test.
4. Wizard steps 1 to 5 with persistence and live preview.
5. Wizard steps 6 and 7, launch outputs (join code, QR, poster), platform approval page.
6. Demo seed (items, generated SVGs) and `DEMO_MODE`.
7. Student gallery, visibility enforcement and its test, claim flow.
8. Minimal staff view (intake, claims queue, donate list).
9. Settings page reusing wizard components.
10. Accessibility and design pass, then docs.
**Cut order if time runs short (cut from the top):** staff invite emails, poster page, category presets, dark mode, settings page. **Never cut:** visibility enforcement, tenant isolation, EXIF stripping, the isolation and visibility tests.
 
## 11. Questions to ask me before starting
 
- Do I already have a Supabase project, or should local-first be the default?
- Package manager preference (pnpm assumed)?
- Preferred accent color or any brand direction?
- Is the matching package already started in this repo?