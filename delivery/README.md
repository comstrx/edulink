# Delivery — EduLink production-readiness assignment

> **New here? Read [`00-START_HERE.md`](./00-START_HERE.md) first** — it explains
> the project, the architecture, exactly what changed and in which module, and
> the problems that remain.

| # | Deliverable | Path |
|---|---|---|
| 1 | Technical audit — top 20 issues, ranked, with impact + fix + start order | [`01-TECHNICAL_AUDIT.md`](./01-TECHNICAL_AUDIT.md) |
| 2 | Target architecture — monolith vs microservices, Redis, queues, jobs, storage, auth, perf, observability (+ Mermaid) | [`02-TARGET_ARCHITECTURE.md`](./02-TARGET_ARCHITECTURE.md) |
| 3 | Key technical decisions | [`03-KEY_DECISIONS.md`](./03-KEY_DECISIONS.md) |
| 4 | Refactored module (code) | `supabase/functions/course-progress/**` + `src/hooks/useCourseProgress.ts` |
| 5 | Atomic completion RPC (proposed migration) | [`proposed-sql/complete_course_progress.sql`](./proposed-sql/complete_course_progress.sql) |

## Refactored module layout

```
supabase/functions/course-progress/
  index.ts                              composition root (thin HTTP adapter)
  http/
    cors.ts                             origin allow-list
    schema.ts                           zod request validation
    responses.ts                        json + safe error mapping
  application/
    ports.ts                            repository + logger interfaces
    course-progress.service.ts          use cases (no Supabase, no HTTP, no any)
  domain/
    errors.ts                           typed error hierarchy
    progress-status.ts                  state machine (pure)
    pathway-progress.policy.ts          60/40 progress policy (pure)
    __tests__/
      progress-status.test.ts
      pathway-progress.policy.test.ts
  infrastructure/
    supabase.factory.ts                 user (RLS) + admin clients
    auth.ts                             verified identity (getUser)
    logger.ts                           structured JSON logging
    course-progress.repository.ts       Supabase adapter; complete() → RPC
```

## Run the domain tests
```sh
deno test supabase/functions/course-progress/
```

## Before/after (the `complete` flow)

| | Before | After |
|---|---|---|
| Layers | 1 (512-LOC handler) | 4 (http/app/domain/infra) |
| Auth | hand-decoded, **unverified** JWT | `getUser()` verified |
| Atomicity | 5 sequential writes, no tx | single transactional RPC |
| Privilege | service-role on request path | RPC keyed on `auth.uid()` |
| Errors | raw `err.message` → client | typed `{ code, message }`, safe |
| Domain logic | inline, `any`, untestable | pure, typed, unit-tested |
| Client hook | re-queries DB in onSuccess | uses server response |

> Verification: no `node_modules`/Deno/live Supabase in this environment, so
> gates were not executed. See `03-KEY_DECISIONS.md` § Verification status.
