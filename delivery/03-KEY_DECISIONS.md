# Key Technical Decisions — Course Progress refactor

The refactor is one **vertical slice** (`supabase/functions/course-progress/`)
chosen to prove the target pattern against the highest-risk real flow, rather
than spreading shallow edits. It resolves audit items #2, #3, #5, #8, #12, #17
in one coherent change.

## 1. Why this module
`course-progress` was the worst offender and the most instructive: 512 LOC mixing
HTTP, auth, validation, domain rules, and a **5-table non-atomic** write with a
pathway cascade. It has real domain logic (a state machine + a 60/40 progress
formula + auto-complete rules) — enough to justify layering, unlike a CRUD
endpoint.

## 2. Clean Architecture, four layers
```
http/            adapter: CORS allow-list, zod validation, error→HTTP mapping
application/     use cases (CourseProgressService) + ports (interfaces)
domain/          pure: state machine, pathway policy, typed error hierarchy
infrastructure/  Supabase repository, verified auth, structured logging
```
Dependencies point inward only. `domain/` and `application/` import no Supabase,
no Deno HTTP, no `any` — so they are unit-testable and would **lift unchanged**
into the modular monolith. The edge function becomes a ~60-line composition root.

## 3. Atomicity via a Postgres RPC, not app-level sequencing
`complete` is a cross-aggregate operation (progress + execution + assignment +
enrollment + completion). App-level sequential writes cannot be atomic. I moved
it into `complete_course_progress` — one transaction, `FOR UPDATE` locks,
validation + writes together. This matches the repo's existing convention
(`complete_mentor_session_with_outcome`). `start`/`continue` stay app-level: they
touch a **single aggregate** (the course-progress row and its own execution), so
the DDD aggregate boundary — not dogma — decides where the transaction line is.

## 4. Verified auth + least privilege
`getUser()` replaces the hand-rolled, **unverified** JWT decode (audit #2). The
completion RPC is `SECURITY DEFINER` but authorizes against `auth.uid()`
internally, so the request path needs **no service-role key**. The service-role
client is confined to the derived pathway projection.

## 5. Domain rules expressed twice, deliberately
The state machine lives in TS (`progress-status.ts`, unit-tested) *and* in the
completion RPC. This is intentional, not accidental duplication: TS gives fast,
typed pre-validation and a single readable spec for `start`/`continue`; SQL is
the atomic authority for `complete`. The two are small, aligned, and each has a
distinct job. The 60/40 pathway formula, by contrast, lives in **exactly one**
place (`pathway-progress.policy.ts`, pure + tested) and the repository just
persists its output.

## 6. Pathway refresh is eventually consistent, and honest about it
The pathway projection recompute is best-effort and **logged on failure, never
swallowed** (audit #7 was the opposite). It can't fail an already-committed
completion. The code comments mark it as the thing that becomes a queue worker
in the target architecture — I did not fake a queue inside an edge function.

## 7. Safe errors + structured logs
Typed `DomainError` → stable `{ code, message }` with correct HTTP status;
internal detail is logged server-side only (audit #8). Logging is one-line JSON
with a per-request id (audit #7), sink swappable for pino/OTel.

## 8. Frontend: business logic pulled out of the hook
`useCourseProgress.ts` no longer re-queries the DB in `onSuccess` to reconstruct
identity (audit #12); the server returns `{ courseId, teacherId }`. Event
emission is documented as belonging server-side (queue) and kept as a thin
bridge only until that exists.

## What I intentionally did NOT do
- **No new queue/Redis in the edge function** — that belongs to the monolith
  migration, not a Deno function. Faking it here would be theater.
- **No rewrite of the other 9 functions** — the pattern is now copy-pasteable;
  the task rewards the pattern, not the volume.
- **Did not apply the SQL migration** — DB/git are yours. The RPC ships in
  `delivery/proposed-sql/` with its assumptions flagged, to apply through your
  own workflow.

## Verification status (honest)
Environment had no `node_modules`, no Deno, and no live Supabase — so I could
**not** run `deno test`, `tsc`, `eslint`, or exercise the RPC. The pure domain
tests are written to run under `deno test supabase/functions/course-progress/`.
Everything else is verified by reading, not execution. Run the gates before
merging; the layering makes the domain the cheap, high-value thing to test first.
