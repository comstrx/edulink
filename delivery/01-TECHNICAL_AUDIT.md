# EduLink — Technical Audit

**Scope:** production-readiness review of the current Lovable-generated codebase
(935 TS/TSX files, ~125k LOC, 123 migrations, ~90 tables, 10 Supabase Edge
Functions). No rebuild — assess, prioritise, and start hardening.

**Method:** static read of `src/`, `supabase/`, `docs/`, `.lovable/plan.md`,
`CONTRACTS_AUDIT.md`, migrations, and the real request paths (edge functions +
the hooks that call them). Every finding below cites a concrete file.

**Verification limits:** the environment has no `node_modules`, no Deno, and no
live Supabase project, so lint/typecheck/test/build gates were **not** executed.
Findings are from code reading; severity assumes the code runs as written.

---

## Severity model

| Level | Meaning |
|---|---|
| **S1 Critical** | Data loss, auth bypass, or silent corruption possible in prod |
| **S2 High** | Breaks under real load/failure, or blocks safe operation |
| **S3 Medium** | Correctness/maintainability debt that will bite within weeks |
| **S4 Low** | Hygiene; cheap to fix, low blast radius |

---

## Top 20 issues (ranked)

### 1. `tsconfig.app.json` disables `strict` and `strictNullChecks` — S1
**Where:** `tsconfig.app.json` (`"strict": false`), `tsconfig.json`
(`"strictNullChecks": false`).
**Impact:** the entire app compiles with null-safety and implicit-`any` checks
off. This is the root enabler of the `any` sprawl and of "cannot read property
of undefined" classes of runtime bugs that TS is supposed to prevent. Every
guarantee the type system appears to give is unenforced.
**Fix:** turn `strict: true` on, fix the fallout module-by-module behind
`// @ts-expect-error` budgets, gate CI on `tsc --noEmit`. Start with leaf
modules (domain/pure logic), finish with UI. Non-negotiable before "production".

### 2. Edge functions trust an **unverified** JWT — S1
**Where:** `supabase/functions/course-progress/index.ts:176-190` (same pattern
across the training functions).
**Impact:** the token is split, the payload base64-decoded, and only `exp`/`sub`
are checked — **the signature is never verified**. Security currently survives
only because each path also does an anon-client read that PostgREST re-verifies.
The moment any handler uses the `service_role` admin client off the decoded
`sub` without a prior RLS-checked read, it becomes full user impersonation.
**Fix:** replace manual decode with `supabase.auth.getUser(token)` (verifies
signature server-side) and derive identity only from the verified user. Prefer
SECURITY DEFINER RPCs keyed on `auth.uid()` over the service-role client.

### 3. Multi-write flows have **no atomicity** — S1
**Where:** `course-progress/index.ts:398-493` (complete = updates to
`course_progress`, `training_executions`, `training_assignments`,
`training_enrollments` + insert into `training_completions` + pathway cascade,
all sequential, no transaction). Same shape in `training-enrollments`,
`pathway-runtime`.
**Impact:** a failure or timeout mid-sequence leaves inconsistent state — course
marked complete but enrollment still active, or a completion recorded with no
execution update. No rollback, no reconciliation.
**Fix:** move each multi-write use case into a single Postgres function
(transactional). The pattern already exists in the repo —
`complete_mentor_session_with_outcome()`, `review_mentorship_evidence()` — the
training paths simply never adopted it. (Implemented for `complete` in this
delivery: `delivery/proposed-sql/complete_course_progress.sql`.)

### 4. Intelligence scores are computed **in the browser** and written by the client — S1
**Where:** `src/intelligence/gaps/writers/gap-snapshot-writer.ts` (imports
`@/integrations/supabase/client` and writes `intelligence_gap_snapshots`);
`src/intelligence/backfill/intelligence-backfill.ts`; confirmed by
`.lovable/plan.md`: *"The backfill runs client-side as the logged-in user."*
**Impact:** CRI / match / gap / reputation scores are produced by untrusted
client code and persisted under the user's session. A user can tamper with their
own readiness/match scores; RLS is the only guard and (per `.lovable/plan.md`)
it has gaps. There is no server-side recomputation or verification.
**Fix:** relocate scoring to server workers (queue-driven). Snapshot tables
become writable by `service_role` / SECURITY DEFINER jobs only; clients read.
See target architecture, §Queues/Jobs.

### 5. Fat edge functions — HTTP + auth + validation + domain + orchestration in one handler — S2
**Where:** `course-progress/index.ts` (512 LOC), `pathway-runtime/index.ts`
(524), `course-progress` again for the cascade.
**Impact:** business rules (state machine, 60/40 progress formula, auto-complete
cascade) are inlined in the request handler — untestable, unreusable, and
duplicated against the frontend. `any` throughout; no input schema.
**Fix:** layer it (done here for `course-progress`): domain (pure) → application
(services + ports) → infrastructure (repository/auth/logger) → http
(validation/error-mapping). See `delivery/03-KEY_DECISIONS.md`.

### 6. RLS correctness is unverified and admittedly incomplete — S2
**Where:** `.lovable/plan.md` documents 4 intelligence snapshot tables with **no
admin INSERT/UPDATE policy**, causing the backfill to *"silently fail for any
teacher whose `user_id != auth.uid()`."* 123 migrations were applied in ~3 weeks
with no policy test suite.
**Impact:** silent authorization failures (writes that no-op), and unknown
read-exposure risk on a data-rich marketplace. Security posture is asserted, not
tested.
**Fix:** add a pgTAP / SQL policy test suite that asserts each table's
read/write matrix per role; run it in CI. Treat RLS as code with tests.

### 7. No error monitoring, structured logging, or tracing — S2
**Where:** repo-wide: only `console.error`/`console.warn`. No Sentry/OTel dep in
`package.json`. `course-progress/index.ts:454,487` swallow errors as
*"non-blocking"* with a bare `console.error`.
**Impact:** in production these failures are invisible — the pathway cascade or
completion insert can fail forever with no alert and no trace. No way to answer
"why did this user's completion not register."
**Fix:** structured JSON logging (pino), Sentry for errors, OpenTelemetry spans
across edge/DB; dead-letter + alerting for the async paths. Stop swallowing.

### 8. Raw internal error messages returned to the client — S2
**Where:** `course-progress/index.ts:505-511` (`err.message` → 500 body); repeated
in every function's catch.
**Impact:** information disclosure (DB/constraint/internal detail leaks to
callers) and no error taxonomy for the client to branch on.
**Fix:** typed error hierarchy mapped to safe HTTP codes + stable machine codes;
log the internal detail server-side only. (Done for `course-progress`.)

### 9. Two package managers committed — non-deterministic installs — S2
**Where:** `bun.lockb` **and** `package-lock.json` both present; scripts are npm,
`bun.lock` also present.
**Impact:** CI vs local can resolve different dependency trees → "works on my
machine" and unreproducible builds. Supply-chain surface doubled.
**Fix:** pick one (bun given Lovable), delete the other lockfile(s), pin in CI.

### 10. No CI/CD and no enforced quality gates — S2
**Where:** no `.github/`, no pipeline config anywhere; `package.json` has `lint`
and `test` but nothing enforces them.
**Impact:** lint/typecheck/test/build can rot silently; every merge is
unguarded. For a codebase this size that is the fastest path to decay.
**Fix:** pipeline: install → typecheck (`tsc --noEmit`) → lint → test →
build → RLS policy tests → migration dry-run. Block merge on red.

### 11. File storage strategy is undefined — S2
**Where:** the product handles CVs, training evidence, and certificates
(`teacher_degrees`, `training_evidence`, `earned_credentials`,
`contact_reveal_audit`) but no bucket policy, signed-URL flow, size/type limits,
or malware scanning is defined in code/config.
**Impact:** unbounded/insecure uploads, public object exposure, or PII leakage of
CVs on a hiring marketplace.
**Fix:** Supabase Storage (or S3) with per-object RLS/bucket policies, short-TTL
signed URLs, upload validation, and virus scan on ingest. See architecture.

### 12. Business logic leaks into the presentation layer (the hook) — S3
**Where:** `src/hooks/useCourseProgress.ts:82-114` — after a completion the hook
does **extra DB reads** (`course_progress`, `teacher_skills`) and dispatches the
`training.completed` domain event **client-side**.
**Impact:** the completion side-effects (event emission, skill resolution) run in
the browser and can be dropped/tampered; extra round-trips; the rule is
duplicated and divergent from the server. Domain event delivery is best-effort
from an untrusted client.
**Fix:** the server owns the transaction and returns the identifiers the client
needs; event emission moves server-side (queue). (Hook trimmed in this delivery;
edge function now returns `course_id`/`teacher_id`.)

### 13. No rate limiting / abuse protection on edge functions — S3
**Where:** all functions in `supabase/functions/*`; notably contact-reveal and
talent-search read paths.
**Impact:** scraping/enumeration of teacher PII and contact data, and brute-force
against auth-adjacent endpoints, with no throttle.
**Fix:** Redis token-bucket rate limiting at the gateway/function edge; per-user
and per-IP; audit + alert on spikes.

### 14. Over-engineered intelligence layer with near-empty data — S3
**Where:** `src/intelligence/**` plus `career/`, `mobility/`, `workforce/`,
`reputation/` — dozens of "layers" (exposure, consumption, freshness, injection,
observability, verified-state, career-os), most explicitly *in-memory /
read-only* (`docs/architecture/career-operating-system-layer.md`). `.lovable/plan.md`
shows the snapshot tables holding **0–4 rows**.
**Impact:** ~125k LOC of scaffolding for a marketplace whose surface is teacher
jobs + training. High maintenance cost, unclear ownership, layers with no live
data. This is the biggest long-term drag on velocity.
**Fix:** collapse to the layers that carry live data (CRI, match, gap +
exposure). Delete or park the rest behind a feature flag until there is demand.
Measure before adding.

### 15. DB ↔ frontend type drift, hand-maintained — S3
**Where:** `src/hooks/useCourseProgress.ts:10-30` hand-writes
`CourseProgressRecord`; `any` casts (`(r: any)`, `(i: any)`) throughout the edge
functions and hooks bypass generated `integrations/supabase/types`.
**Impact:** schema changes don't surface as type errors; silent shape mismatches
at runtime. Compounded by #1 (strict off).
**Fix:** generate types from the DB (`supabase gen types`), ban `any` via lint,
derive row types from the generated schema.

### 16. Public marketplace pages are client-rendered — SEO is dead — S3
**Where:** `src/main.tsx` + `App.tsx` — pure Vite SPA, no SSR/SSG for
`src/pages/public/*` (jobs, courses, schools, teacher/provider profiles).
**Impact:** a discovery-driven marketplace is invisible to organic search; every
public page is an empty shell until JS hydrates. Directly caps growth.
**Fix:** move the public surface to SSR/ISR (Next.js) or prerender; keep the
authed app as SPA. Product-level but production-relevant.

### 17. Idempotency is partial — retries can double-apply — S3
**Where:** `training_completions` has a unique index (good —
`course-progress/index.ts:441`), but the surrounding execution/enrollment/
assignment updates and the pathway cascade are not idempotent and not keyed.
**Impact:** a client retry (network flap on a 6-write path) can re-run side
effects — double events, inconsistent partial re-application.
**Fix:** idempotency keys on mutating endpoints; make the RPC the single
idempotent unit (it is, in the delivered SQL).

### 18. Thin, uneven test coverage; core logic untestable where it lives — S3
**Where:** `vitest` configured; some tests in `src/test`, `src/smart-glue/__tests__`,
`src/actions/__tests__` — but edge functions and hooks are largely untested, and
the domain rules are buried in handlers (#5) so they *can't* be unit-tested.
**Impact:** refactors are blind; the highest-risk paths (money, completion,
scoring) have the least coverage.
**Fix:** extract pure domain (done for course-progress) and unit-test it; add
integration tests for the RPCs. Coverage gate in CI on the domain layer.

### 19. Single environment, hardcoded project config — S4
**Where:** `supabase/config.toml` (`project_id` only), `.env` with a single
`VITE_SUPABASE_*` set; no staging/prod separation, no secret rotation story.
**Impact:** no safe place to test migrations/policies before prod; blast radius
of any change is production.
**Fix:** staging + prod projects, env-scoped config, migration promotion flow,
secret rotation.

### 20. CORS wildcard on every function — S4
**Where:** `Access-Control-Allow-Origin: "*"` in every `supabase/functions/*`.
**Impact:** any origin can call the functions from a browser context. Low blast
radius today (auth still required) but wrong default for prod, and blocks safe
use of cookies/credentials later.
**Fix:** allow-list the known app origins per environment.

---

## What I would change first, and why

Order chosen to **stop the bleeding, then make change safe, then improve**:

1. **#1 strict TS + #2 verified auth + #3 atomic writes** — these are the three
   that can corrupt data or leak access *today*. #2 and #3 are demonstrated end
   to end in this delivery on the `course-progress` module, so the pattern is
   copy-pasteable to the other functions.
2. **#10 CI + #9 one lockfile** — you cannot safely land any of the above
   without a gate that proves you didn't regress. Cheap, unblocks everything
   else.
3. **#4 move scoring server-side + #6 RLS tests** — closes the trust boundary on
   the feature that most defines the product, and makes authorization testable
   rather than asserted.
4. **#7/#8 observability + safe errors** — you can't operate what you can't see;
   needed before real traffic.

Everything else (SEO, over-engineering cleanup, storage hardening) is important
but sequenced after the correctness/safety floor is in place.

The refactor in this delivery (`course-progress`) is deliberately the vehicle
for #2, #3, #5, #8, #12, #17 at once — one vertical slice proving the target
pattern rather than twenty shallow patches.
