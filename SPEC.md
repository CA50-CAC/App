# LostBox: School Lost-and-Found with Visual Search
 
Congressional App Challenge 2026 entry, CA-50.
Status: v1 draft for review. Save as `SPEC.md` in the repo root.
 
---
 
## 0. How to use this doc (instructions for Claude Code)
 
1. Read the whole doc before writing code. Then reply with a short plan and the questions you need answered. Do not start building until the plan is agreed.
2. Work through the backlog in Section 13 in order. One ticket per branch or commit group, with tests.
3. Anything marked **VERIFY** is an assumption. Check current docs, versions, limits, and licenses instead of trusting this doc or your memory.
4. Record every non-trivial technical choice in `DECISIONS.md` (choice, alternatives, reason, date).
5. Follow the working agreement in Section 15. The student author must understand and be able to explain the core modules, and AI assistance must be logged for contest disclosure.
---
 
## 1. Context and hard constraints
 
- **Contest:** Congressional App Challenge (CAC), district CA-50. Judges score purpose, concept, technicality, creativity, and design.
- **Deadline:** most districts use Oct 26, 2026, 12:00 PM ET. **VERIFY** the exact CA-50 date and time on the district page. Plan to submit by **Oct 23** to leave buffer.
- **Today:** Sep 30, 2026. About 3.5 weeks of build time.
- **Author:** an advanced high-school coder (the student). Claude Code acts as pair programmer.
- **Submission needs** (typical): working app and source code, app name, target audience, how it works, the technical challenge faced and how it was solved, and a demo video. **VERIFY** the CA-50 rules, including the AI-use disclosure rule and video length.
- **Budget:** free tiers only. **VERIFY** limits before relying on them.
- **No native apps.** A web app that works well on phones.
## 2. Problem and users
 
**Problem.** School lost-and-found is a box or a shelf. Owners can't search it and rarely look through it. Staff don't have time to match items to owners. Most unclaimed items end up donated or thrown out.
 
**Users**
| User | Need | Frequency |
|---|---|---|
| Finder (student or staff) | Log a found item in seconds | Occasional |
| Owner (student, sometimes a parent) | Describe a lost item and see likely matches | A few times a year each |
| Front-office staff | Verify claims, hand items back, clear old items | Daily |
 
**Why this is not a generic app:** the interesting part is matching a *vague human description* ("black water bottle, dented, sticker on the bottom") to a *casual photo taken by someone else*, with privacy built in, and **measuring** how well it works.
 
## 3. Concept and differentiation
 
**One-line pitch:** Describe what you lost the way you'd tell a friend, and the app finds the likely matches from what your school has found.
 
**Proposed modifications vs. the original pitch (change any of these):**
1. **Search, don't browse.** No public feed of found items. Owners search by description or photo. This protects privacy and prevents false claims.
2. **Privacy-first pipeline.** Faces blurred on-device before upload, EXIF stripped, sensitive categories hidden from search results.
3. **Evaluation harness is the technical centerpiece.** Compare baselines (keyword filter vs. CLIP vs. hybrid reranking) on a dataset the student collects, and report real numbers.
4. **Web app, no install, no student accounts.** Join by QR code at the lost-and-found spot.
5. **Watch alerts.** An owner's lost report can stay open and notify them when a matching item is logged.
6. **Staff dashboard with metrics** (return rate, time to return) and auto-expiry of old items.
7. **A real pilot at the student's school** with measured results. Fallback is a staged pilot, clearly labeled as such.
**Related winners to be aware of (honest framing in the write-up):**
- "Lost It? Loc8 It!" (CA-36, 2023) helps people, especially those with visual impairments, find misplaced personal items. Different problem and approach.
- CheckPoint Student (CA-50, 2024) fixed a campus annoyance the authors lived with, and won. Same spirit as this project.
**Mapping to the judging criteria**
| Criterion | How this project addresses it |
|---|---|
| Purpose | Everyday school problem, real pilot, measured return rate |
| Concept | Description-to-photo retrieval with privacy built in |
| Technicality | Vision-language embeddings, hybrid reranking, on-device privacy, evaluation harness |
| Creativity | Closing the gap between how owners describe items and how finders photograph them |
| Design | 20-second finder flow, conversational search, polished staff view |
 
## 4. Scope (MoSCoW)
 
**Must**
- Finder flow: photo, privacy pass, auto-suggested attributes, location, submit
- Owner search by text description
- Matching engine (stage 1 retrieval + stage 2 rerank)
- Claim request and staff approval
- Staff login, intake list, state changes, basic metrics
- EXIF stripping and face blur
- Evaluation harness with baselines and a results table
- Anonymous pilot metrics logging
- Deployment, demo script, write-up
**Should**
- Search by photo
- Lost-report watch with email alerts
- Restricted-category masking
- Retention and auto-expiry jobs
- Accessibility audit and dark mode
**Could**
- Text and ID detection blur
- Spanish translation (keep strings i18n-ready from the start)
- QR poster generator
- Multi-school support
**Won't**
- Native apps, student accounts, in-app chat, public feeds, payments, ads
**Cut order if behind schedule (cut from the top):** email alerts, image search, dark mode, text blur, i18n.
 
## 5. User flows
 
### 5.1 Finder (target: 20 seconds, 4 taps after the photo)
1. Scan the QR code or open the link, enter the school code (once per device).
2. Tap "I found something."
3. Take 1 to 2 photos. A guide overlay says: plain surface, no people in frame.
4. On-device privacy pass: strip EXIF, blur detected faces. Show the finder the result before upload.
5. Auto-suggest category and colors (editable chips). Optional short note, e.g. "has a sticker."
6. Pick where it was found (campus location chips) and where it is now ("dropped at front office" or "I'm holding it").
7. If the category is ID, card, or wallet: show "Please hand this to the office instead of photographing it," and do not upload a photo.
8. Submit. Show a success state.
### 5.2 Owner
1. Open the app and tap "I lost something."
2. Type a description, as vague as they like. Optionally add a rough location and day.
3. Optionally upload a reference photo (stretch).
4. See ranked candidate cards. Normal items show photo, category, found location, and day. Restricted items show only category, color, and found location.
5. Tap "This might be mine," then describe one identifying detail and optionally leave an email for updates.
6. Staff reviews the claim. The owner brings ID or recognizes the item in person at the office. Staff marks it returned.
7. If nothing matches, offer "Keep watching for this" (stores the report and alerts on future matches).
### 5.3 Staff
1. Magic-link login (allowlisted emails).
2. Intake list with filters (status, age, category).
3. Item detail view with the claims queue.
4. Mark returned, mark donated, remove an item.
5. Metrics page: items logged, searches, claims, returns, median time to return, searches with no good result.
6. Weekly nudge: items older than N days are ready to donate (staff confirms).
## 6. Matching engine (technical core)
 
Build it as **pure, unit-tested functions** in a shared package, used by both the app and the evaluation harness, so the numbers reported are the numbers shipped.
 
### 6.1 Representations
- **Image embedding** per item (vision tower of a CLIP-style model).
- **Text embedding** of the item's structured description (category, colors, note).
- **Structured attributes:** category (fixed taxonomy of about 15), primary and secondary colors, optional brand or note text.
- **Context:** found location, found time, location adjacency (which campus locations are near each other).
Model: a small CLIP-style model, e.g. CLIP ViT-B/32 (typically 512-dimensional embeddings). **VERIFY** the exact model, license, size, and runtime options in the Section 8 spike.
 
### 6.2 Query handling
- **Text query:** embed with the text tower. Also parse light hints (color words, location, day) with simple rules, not an LLM, so the pipeline is deterministic and testable.
- **Image query (Should):** embed with the image tower.
### 6.3 Two-stage ranking
**Stage 1: retrieval.** Filter by school and status = available. Apply a time gate (item found no earlier than the lost time minus a slack). Take the top N (e.g. 30) by embedding similarity. At pilot scale (hundreds of rows), brute-force cosine similarity is fine and an ANN index is unnecessary.
 
**Stage 2: rerank.** Combine:
- embedding similarity (text-to-image and, if both exist, text-to-text)
- attribute agreement (category match, color overlap)
- location prior (closer to the stated loss location scores higher)
- optional keyword overlap on the note text
Score = weighted sum. Weights are **tuned on a dev split and reported on a held-out test split** (no tuning on the test set).
 
### 6.4 Attribute suggestion for finders
- Category: zero-shot over the taxonomy using the same embeddings, with a confidence threshold. Below the threshold, show "Other" and let the finder choose.
- Colors: simple dominant-color extraction from the photo (center-weighted), mapped to a small named palette.
- Both are editable. Log how often finders change them (a useful accuracy metric).
### 6.5 Watch alerts (Should)
When a new item is added, score it against open lost reports for that school. Notify only above a high-precision threshold chosen from the evaluation data.
 
## 7. Evaluation plan (this is what makes the project credible)
 
### 7.1 Systems compared
| ID | System | Purpose |
|---|---|---|
| B0 | Recency list (what a physical box effectively is) | Floor |
| B1 | Category and color filter only | "Normal" app baseline |
| B2 | Embedding similarity only | Does the model help? |
| B3 | Hybrid: retrieval + rerank | Full system |
| Ablations | B3 without location prior; B3 without attributes | What matters |
 
### 7.2 Metrics
Recall@1, Recall@3, Recall@5, MRR, and "median candidates a student must scan before finding their item" (compare with scanning the whole box). Report with the dataset size and how queries were written.
 
### 7.3 Dataset collection protocol (a human task, schedule it in Week 1)
- Gather **60 to 120 distinct items** from classmates, teachers, and home. Get consent and return everything afterward.
- At least **30% should be confusable groups** (e.g. 6 black water bottles, 5 gray hoodies, several earbud cases, calculators, binders).
- **Finder-side photos** are taken casually, 1 to 2 per item, by someone other than the owner.
- **Owner-side queries** are written by the owner the next day, **from memory, without seeing the photo.** Get 2 queries per item from different people where possible.
- Store a manifest: item_id, photo files, queries, ground-truth attributes.
- **Privacy:** keep raw photos out of the public repo. Publish only aggregate results and, if useful, anonymized embeddings.
- Split items into dev (about 50%) and test (about 50%) before tuning anything.
### 7.4 Harness requirements
- Lives in `eval/`. One command runs everything and prints a results table and saves plots.
- Uses the same embedding pipeline as production. If production uses browser ONNX and eval uses another runtime, results may differ slightly, so document it or run eval through the same code path.
- Fixed random seeds, results written to `eval/results/` with the date and commit hash.
## 8. Architecture and stack (recommended defaults; swap if the spike says so)
 
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, built as a PWA. Mobile-first for students, desktop-first for staff.
- **Backend:** Next.js server routes. **Students never talk to the database directly.** All student actions go through server routes that validate input and rate-limit.
- **Database and storage:** Supabase (Postgres + pgvector + private Storage bucket with signed URLs). Staff authenticate with Supabase Auth (magic link) and use Row Level Security. **VERIFY** free-tier limits and current pgvector support.
- **Embeddings:** decided by a spike (T0.3). Two candidates: (A) in-browser model via a JS ML runtime such as transformers.js, or (B) a small server-side service. **Privacy does not depend on this choice**, because images are blurred on-device *before* upload either way.
- **Email (Should):** any transactional provider on a free tier. **VERIFY.**
- **Hosting:** Vercel or equivalent. **VERIFY.**
- **Testing:** unit tests for the matching package, a few end-to-end tests of the three flows, and an accessibility check in CI.
### Suggested repo layout
```
/apps/web           Next.js app (student + staff UI, server routes)
/packages/matching  pure matching + scoring functions (unit-tested)
/eval               dataset manifest tooling, harness, results
/supabase           migrations, seed, RLS policies
/docs               DECISIONS.md, AI_USAGE.md, PILOT.md, SUBMISSION.md
```
 
## 9. Data model (sketch; refine in T0.2)
 
```
schools(id, name, join_code, retention_days, donate_after_days)
locations(id, school_id, name, near_location_ids[], sort)
items(id, school_id, status[available|claimed|returned|donated|removed],
      category, colors[], note, found_location_id, found_at,
      current_location[office|with_finder], sensitivity[normal|restricted],
      image_path[], image_embedding vector, text_embedding vector,
      created_at, resolved_at)
lost_reports(id, school_id, query_text, query_image_path?, query_embedding,
             lost_location_id?, lost_at_start?, lost_at_end?,
             notify_email?, watching bool, created_at, closed_at)
claims(id, item_id, lost_report_id?, claimant_detail, status[pending|approved|rejected|picked_up],
       reviewed_by?, created_at)
events(id, school_id, type, payload_json, created_at)   -- anonymous metrics only
```
Embedding dimension depends on the chosen model.
 
**Anonymous events to log (no PII):** item_created, search_performed (query length, result count, top score), result_clicked (rank), claim_created, item_returned (time since creation), attribute_edited.
 
## 10. Privacy, safety, abuse
 
**Principles:** collect the minimum. Students are minors. Do not store student names, student IDs, or phone numbers. This is a design goal, not legal advice. Ask the school about its policy before the pilot.
 
- **EXIF stripped** from every upload (including GPS).
- **Face blur on-device** before upload. It is best-effort, so also tell finders to keep people out of frame, and let staff remove items.
- **Restricted categories** (phones, laptops, earbuds, wallets, keys, bags with ID, medical items): search results show category, color, and found location only, with no photo. Claims go through staff. **Decide the list with the school.**
- **ID and cards:** never photograph. Route to the office.
- **No public feed, no enumeration:** results only appear for a query.
- **Join gate:** school code via QR. Rate-limit by session and IP.
- **Claims:** staff verifies in person. The system never marks something returned on its own.
- **Email addresses** are optional, used only for alerts, and deleted when the report closes or after 30 days.
- **Retention:** delete photos N days after an item is returned or donated (default 7). Make N configurable.
- **Moderation:** staff can remove any item. Log removals.
- **Secrets:** none in the repo. `.env.example` only.
## 11. UX and design direction
 
Design quality is a judging criterion, so budget real time for it (T3.4).
 
**Principles**
- Finder flow: 20 seconds, thumb-reachable, one primary action per screen.
- Search feels conversational. Placeholder text such as "Describe it however you remember it."
- Result cards are visual: large photo, found-where chips, one clear button.
- Show progress and success states. A small moment of delight when a likely match appears.
- Staff view is dense and fast: table, keyboard shortcuts, bulk actions.
**Visual**
- Calm, modern, high contrast, one accent color, generous spacing, rounded components.
- Light and dark themes, WCAG AA contrast, touch targets at least 44px, respect reduced-motion.
- Skeleton loaders, thoughtful empty states, friendly error messages.
- Accessibility: auto-generated alt text from attributes, full keyboard support, never rely on color alone.
- All user-facing strings go through an i18n layer from day one (English only at launch).
If a frontend design skill or guide is available in your environment, use it for the design pass.
 
## 12. Pilot plan and metrics
 
**Get permission early (by Oct 6):** front office or an administrator, plus a teacher sponsor. Explain: no student data collected, only found items, staff stay in control. Offer a 10-minute staff walkthrough and a QR poster.
 
**Baseline (before launch):** ask staff how items are currently returned and how many sit unclaimed. If possible, count items in the box for a week.
 
**Window:** about Oct 14 to Oct 22 (7 school days). Shift earlier if possible.
 
**Measure**
- items logged, searches run, claim requests, items returned
- median hours from logging to return
- % of searches where a result was clicked, and the rank of the clicked result
- staff time per item (short 3-question survey)
- 3 to 5 short user quotes (with consent, anonymous)
**Fallback if the school says no:** a staged pilot in a team, club, or class with 40 to 60 donated items and a set of volunteer testers. Label it clearly as a simulation in the write-up. Do not present it as a school deployment.
 
## 13. Milestones and backlog
 
| Milestone | Target date |
|---|---|
| M0 Setup and spikes | Oct 2 |
| M1 Finder flow + staff basics | Oct 6 |
| M2 Search, matching, eval running | Oct 13 |
| M3 Polish, privacy, deploy, pilot starts | Oct 14 to 18 |
| M4 Pilot results, video, write-up, submit | Oct 19 to 23 (hard stop Oct 26) |
 
### Phase 0: Setup and spikes
- [ ] **T0.1** Scaffold repo (Next.js, TS, Tailwind, lint, format, CI for typecheck, lint, tests), `.env.example`, README.
- [ ] **T0.2** Supabase project, migrations from Section 9, RLS for staff, private storage, seed school and locations.
- [ ] **T0.3 SPIKE:** embeddings. Compare (A) in-browser and (B) server-side on model download size, first-load time, per-image latency on a mid-range phone, and sanity quality on about 10 items. *Done when:* `DECISIONS.md` has the choice and measured numbers.
- [ ] **T0.4 SPIKE:** on-device face blur. Pick a library, measure speed and miss rate on about 20 photos, check license. *Done when:* decision recorded with numbers.
### Phase 1: Finder flow and staff basics
- [ ] **T1.1** Join gate (school code or QR), anonymous session, rate limiting.
- [ ] **T1.2** Finder flow per 5.1, including EXIF strip, face blur, restricted-category redirect. *Done when:* median under 20 seconds in a 5-person test, works on iOS Safari and Android Chrome.
- [ ] **T1.3** Attribute suggestion (category, colors) per 6.4. *Done when:* category accuracy measured on the first 30 collected items.
- [ ] **T1.4** Staff auth (magic link, allowlist), intake list, item detail, status changes.
### Phase 2: Search, matching, evaluation
- [ ] **T2.1** Search UI (text query, optional location and day hints).
- [ ] **T2.2** Matching package per Section 6, pure functions with unit tests.
- [ ] **T2.3** Evaluation harness per Section 7, with B0 to B3 and ablations, dev/test split, one-command run.
- [ ] **T2.4** *(Human task)* Run the dataset collection session; build the manifest.
- [ ] **T2.5** Claim flow and staff approval queue.
- [ ] **T2.6** Restricted-category masking in results.
*Gate on Oct 13:* if B3 does not beat B1 on the test split, stop and diagnose before building more features.
 
### Phase 3: Polish, privacy, pilot-ready
- [ ] **T3.1** Staff metrics page and anonymous CSV export.
- [ ] **T3.2** *(Should)* Lost-report watch and email alerts.
- [ ] **T3.3** Retention and auto-expiry jobs.
- [ ] **T3.4** Design pass: states, empty and error screens, motion, dark mode, accessibility audit.
- [ ] **T3.5** Production deploy, real locations seeded, QR poster (Could).
- [ ] **T3.6** Security pass: RLS tests, rate limits, input validation, dependency audit, secrets check.
### Phase 4: Pilot and submission
- [ ] **T4.1** Pilot analysis script and figures.
- [ ] **T4.2** Demo video (Section 14).
- [ ] **T4.3** Write-up (Section 14).
- [ ] **T4.4** Submit by Oct 23. Confirm the submission is received.
## 14. CAC submission checklist
 
- [ ] Public or accessible source repo, with no secrets and no student photos or personal data.
- [ ] App name, target audience, "how it works" paragraph.
- [ ] **Technical challenge paragraph, written by the student in his own words.** Suggested angle: owners describe items vaguely, finders photograph them casually, so matching is hard. Show baseline vs. final numbers, and the privacy pipeline.
- [ ] Demo video.
**Demo video outline (target 2 to 2.5 minutes, VERIFY the limit)**
1. 0:00 Hook: the box of unclaimed hoodies, or the real situation at his school.
2. Finder logs an item in about 15 seconds.
3. Owner describes it vaguely; the right item appears.
4. Staff approves; item returned.
5. Results slide: baseline vs. final, plus pilot numbers.
6. Privacy slide: blur, no accounts, restricted items.
7. Close: what he learned and what's next.
## 15. Working agreement with Claude Code
 
- **Explain as you go.** For every non-trivial module, leave a short comment or a README section a student can use to explain it aloud.
- **The student writes the core.** The matching package and the evaluation harness are authored by the student, with Claude Code as reviewer, pair, and test writer. Claude Code can freely scaffold UI, config, migrations, and boilerplate.
- **Log AI assistance** in `docs/AI_USAGE.md`: what was AI-assisted, which tool, and roughly how. This supports honest disclosure under the contest rules.
- **Don't invent APIs.** Check docs for library versions and signatures. Mark uncertain items in `DECISIONS.md`.
- **Small steps.** Commit often with clear messages. Keep tests green.
- **Ask before** adding a heavy dependency, changing the data model, or choosing something hard to reverse.
- **No scope creep.** If a task isn't in the backlog, propose it and wait.
### Suggested `CLAUDE.md` for the repo root
```
# LostBox
Read SPEC.md first. Follow Section 0 and Section 15.
- Plan before coding; ask for approval.
- Student authors packages/matching and eval/. You review and write tests.
- Log AI assistance in docs/AI_USAGE.md. Log decisions in docs/DECISIONS.md.
- Never commit secrets or student photos/data.
- Anything marked VERIFY in SPEC.md must be checked against current docs.
```
 
## 16. Open decisions
 
- [ ] App name
- [ ] Which school, who the staff sponsor is, and whether permission is secured
- [ ] Restricted-category list (agree with the school)
- [ ] Embeddings: browser or server (decided by T0.3)
- [ ] Image search: in or out
- [ ] Email alerts: in or out, and which provider
- [ ] Retention defaults (photo deletion days, donate-after days)
- [ ] Languages beyond English
