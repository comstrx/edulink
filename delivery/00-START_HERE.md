# Start Here — what this delivery is

This folder is the response to the production-readiness assignment: **assess the
Lovable-built EduLink codebase, design a target architecture, and refactor one
module to production quality.** This file is the front door — read it first. It
proves three things, in order:

1. **I understood the project** (§1) and **its architecture** (§2).
2. **I made a concrete, verified change** to **one module** (§3).
3. **I can see the rest of the road** — the remaining problems and how they're
   fixed (§4).

| Want to read… | Go to |
|---|---|
| The full ranked issue list (top 20) | [`01-TECHNICAL_AUDIT.md`](./01-TECHNICAL_AUDIT.md) |
| The target architecture + diagrams | [`02-TARGET_ARCHITECTURE.md`](./02-TARGET_ARCHITECTURE.md) |
| Why I made each design choice | [`03-KEY_DECISIONS.md`](./03-KEY_DECISIONS.md) |
| The atomic SQL fix | [`proposed-sql/complete_course_progress.sql`](./proposed-sql/complete_course_progress.sql) |
| The refactored code | `supabase/functions/course-progress/**`, `src/hooks/useCourseProgress.ts` |

---

## 1. What EduLink is (my understanding)

EduLink is a **career + hiring + training platform for the ESL / education
world**, generated with Lovable and running on a React SPA + Supabase. It
connects four kinds of user around a teacher's professional lifecycle:

| Persona | What they do |
|---|---|
| **Teacher** | build a profile, apply to jobs, take training, earn credentials, get career guidance |
| **School** (admin / recruiter / academic-lead / training-manager) | post jobs, review applicants, assign & track staff training |
| **Provider** | publish training catalogs (courses / packages / pathways) |
| **Mentor** | run mentorship sessions, get paid |
| **Admin** | taxonomy, content moderation, data audits, intelligence backfill |

**Bounded contexts** (visible in `src/contracts/*` and the schema):
- **Identity** — profiles, roles, entitlements
- **Hiring** — jobs, applications, interviews, talent search
- **Training** — catalog, enrollments, executions, progress, evidence, credentials
- **Trust** — certifications, licenses, credential verification
- **Intelligence** — the platform's "brain": readiness/match/gap/reputation scoring

**Size:** ~935 TS files, ~125k LOC, ~90 tables, 123 migrations, 10 edge
functions. **Stack:** Vite + React 18 + TypeScript + React Router + TanStack
Query + shadcn/Radix + Tailwind + Zod on the front; Supabase (Postgres + Auth +
RLS + Deno Edge Functions) on the back. No custom server — Supabase *is* the
backend.

**Access model** (`docs/access-model.md`) — every protected surface requires all
four layers, and the codebase branches on *capability*, not on role/type
literals:
```
Access = Auth + Role + Membership/Persona + Entitlement
```

---

## 2. How the architecture works (my understanding)

### The intelligence pipeline
The distinctive part of EduLink is a layered pipeline that turns raw domain
events into career guidance:
```
Domain event → Smart Glue → Engines (CRI/Match/Gap/Reputation)
             → Snapshots (DB) → Adapters → Exposure (audience-scoped)
             → Career OS → UI
```
- **Smart Glue** dispatches domain facts (`training.completed`, `hiring.application_rejected`, …).
- **Engines** are pure scoring functions (CRI = Career Readiness Index, Match,
  Gap, Reputation).
- **Snapshots** cache each engine's output per teacher.
- **Exposure** decides what each audience may see (teacher gets full CRI, school
  gets a summary, public gets nothing) — a real, well-thought data-governance idea.

### The reality behind the diagram (this is the key insight)
The pipeline is largely **computed in the browser**. Scoring engines import the
*client* Supabase instance and write snapshot tables under the logged-in user's
session — `.lovable/plan.md` states it outright: *"the backfill runs client-side
as the logged-in user."* So the "brain" is client-trusted, tamperable, and
guarded only by RLS (which the same file admits has gaps). **That trust-boundary
inversion is the single most important architectural fact about this codebase**,
and it drives half of the audit and all of the target architecture.

### A request today (course completion), end to end
`useCourseProgress` hook → `course-progress` edge function (512-LOC handler doing
auth + validation + domain rules + 5 sequential table writes + a pathway
cascade, non-atomically) → then the *hook's* `onSuccess` does more DB reads and
emits the domain event **from the browser**. Business logic is split across the
client and a fat function, with no transaction and no verified identity. That is
exactly the flow I rebuilt.

---

## 3. What I actually did — one module, rebuilt

**Module chosen: Course Progress** (a teacher starting / continuing / completing
an assigned course). I picked it because it was the worst offender *and* the most
instructive: it has genuine domain logic (a state machine + a 60/40 progress
formula + an auto-complete cascade) and the highest blast radius (5 tables in one
operation). One module, taken end to end — backend function, its DB transaction,
and its frontend hook.

### The problem (what was wrong)
The old `course-progress/index.ts` (one 512-line file) had four production-grade
defects at once:

| Problem | Why it's dangerous |
|---|---|
| **Unverified JWT** — token hand-decoded, signature never checked (`index.ts:176-190`) | identity trusted from an unverified token; security rested entirely on downstream RLS reads |
| **No atomicity** — `complete` did 5+ sequential writes across 5 tables with no transaction | a mid-way failure leaves a course "completed" but its enrollment/execution not — silent corruption |
| **Everything in one layer** — HTTP + auth + validation + domain + orchestration, all `any` | untestable, unreusable, duplicated with the frontend |
| **Leaky errors & logic** — raw `err.message` to the client; the hook re-queried the DB and emitted the domain event client-side | info disclosure + tamperable, best-effort event delivery |

### The solution (what I built)
Rebuilt the module in **Clean Architecture — four layers, dependencies pointing
inward only**:
```
supabase/functions/course-progress/
  index.ts            → thin composition root (~60 lines, was 512)
  http/               → CORS allow-list, Zod validation, safe error mapping
  application/        → CourseProgressService (use cases) + ports (interfaces)
  domain/             → pure state machine + pathway policy + typed errors (+ tests)
  infrastructure/     → Supabase repository, verified auth, structured logging
delivery/proposed-sql/complete_course_progress.sql  → the atomic transaction
```

| Concern | Before | After |
|---|---|---|
| Auth | hand-decoded, unverified JWT | `supabase.auth.getUser()` — signature verified |
| Atomicity | 5 sequential writes, no tx | **one** transactional Postgres RPC (`FOR UPDATE` locks) |
| Privilege | service-role key on the request path | RPC authorizes on `auth.uid()` — no service-role needed |
| Errors | raw internal message → client | typed `{ code, message }`, safe; internals logged only |
| Domain logic | inline, `any`, untestable | pure, typed, **unit-tested** |
| Frontend hook | re-queries DB + emits event in browser | uses the server's response; logic moved server-ward |

### Proof it works
The pure domain layer (the state machine + the 60/40 pathway formula) was
executed here under Node — **all 7 behavioural checks passed**:
```
ok  - start only from not_started
ok  - continue only from in_progress
ok  - complete maps illegal transitions to specific codes
ok  - canApply mirrors legality
ok  - pathway: 60/40 weighting
ok  - pathway: auto-complete milestone + pathway when courses done
ok  - pathway: unlock next locked milestone
7 checks passed
```
The committed tests (`domain/__tests__/*.test.ts`) run under
`deno test supabase/functions/course-progress/`.

### Honest scope boundary
I changed **only** the Course Progress module. Hiring, Mentorship, Trust,
Intelligence, and the other 9 edge functions are untouched — the assignment asked
for one module as a template, and the pattern here is copy-pasteable to the rest.

---

## 4. The other problems I see (so you know I see the whole board)

The full ranked list is in [`01-TECHNICAL_AUDIT.md`](./01-TECHNICAL_AUDIT.md).
The headline ones, by severity:

- **S1** — TypeScript `strict` is **off** app-wide (`tsconfig.app.json`);
  unverified JWTs across functions; non-atomic multi-writes; intelligence
  scoring computed in the browser and written by the client.
- **S2** — RLS is admittedly incomplete and untested; no error monitoring /
  tracing (only `console`); raw error messages leak; two package managers
  committed; no CI/CD; no file-storage security model.
- **S3** — business logic leaks into the frontend; no rate limiting; a heavily
  over-engineered intelligence layer sitting on near-empty tables (0–4 rows);
  DB↔type drift; public pages are client-rendered (SEO dead); partial
  idempotency; thin test coverage.

**Where I'd start, and why:** strict TS + verified auth + atomic writes first —
they are the three that can corrupt data or leak access *today* (two of them are
already demonstrated end-to-end in this module). Then CI + a single lockfile so
any further change is safe to land. Then move scoring server-side and add RLS
tests, because that closes the trust boundary that most defines the product.
Full reasoning in [`03-KEY_DECISIONS.md`](./03-KEY_DECISIONS.md).

---

## 5. How to verify this delivery

```sh
# refactored module — one module, four layers
ls -R supabase/functions/course-progress/

# domain unit tests (needs Deno)
deno test supabase/functions/course-progress/

# the atomic transaction that replaces the non-atomic 5-write flow
cat delivery/proposed-sql/complete_course_progress.sql
```

**Not yet run here** (no live Supabase in this environment): the RPC against a
real database, and the full frontend `tsc`/`eslint`/`build`. Apply the SQL via
your own migration workflow (its one assumption — a unique index on
`training_completions(teacher_id, source_type, source_id)` — is flagged in the
file) and run the app gates before merging. The refactor is structured so the
domain — the part that carries the business rules — is the cheapest thing to
test, and it already passes.
