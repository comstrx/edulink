# Production Readiness Checklist — EduLink

## UI Reality

- [x] Public marketplace pages (`/jobs`, `/training/*`, `/schools`) fetch real database data
- [x] Teacher Dashboard uses real DB queries for stats (applications, credentials)
- [x] Teacher Training page uses real execution/progress data (no mock arrays)
- [x] Teacher Certificates page queries `earned_credentials` table
- [x] Teacher Applications page fetches from `applications` table with proper loading/empty states
- [x] School Hiring Jobs page fetches from `jobs` table scoped to school
- [x] School Applicants page fetches from `applications` with teacher profiles
- [x] School Training Overview fetches real team stats from DB
- [x] Mock data arrays removed from Dashboard (`PROFILE_VIEWS`, `QUICK_STATS`, `PROFILE_VIEW_STATS`)
- [x] Mock data arrays removed from Training page (`recommended`, `skillsToStrengthen`, `recentCredentials`, `savedItems`)
- [x] Mock data arrays removed from School Training Overview (`mandatoryTraining`, `overdueItems`, etc.)
- [x] Placeholder Certificates page replaced with real `earned_credentials` query
- [ ] Static content pages (Terms, Privacy, Contact, About) — intentional placeholders for legal/marketing content (non-blocking)

## Route Protection

- [x] Teacher routes (`/app/teacher/*`) require `teacher` role via `RequireAuth`
- [x] Teacher routes gated by `RequireTeacherOnboarding` for profile completion
- [x] School start route requires `school_admin` role
- [x] School routes require `school_admin`, `school_recruiter`, `school_academic_lead`, `school_training_manager`
- [x] Admin routes (`/admin/*`) require `admin` role
- [x] School hiring actions gated by `SchoolHiringGate` / `useSchoolHiringGuard`
- [x] `/access-denied` route exists for unauthorized access attempts
- [x] `NotFound` catch-all route configured

## RLS Policies

- [x] `teacher_profiles` — RLS enabled, teachers access own profile
- [x] `applications` — RLS enabled, teacher sees own, school sees own jobs
- [x] `jobs` — RLS enabled, school sees own jobs, public sees published
- [x] `training_assignments` — RLS enabled, scoped to school + teacher
- [x] `training_executions` — RLS enabled, scoped to teacher
- [x] `earned_credentials` — RLS enabled, scoped to teacher
- [x] `user_roles` — RLS enabled with `has_role()` security definer function

## Query Safety

- [x] All teacher queries filter by `teacher_id` or `user_id`
- [x] All school queries filter by `school_id`
- [x] Talent search uses pagination with `MAX_PAGE_SIZE` (100)
- [x] Job search uses pagination with bounded page sizes
- [x] `.in()` filter arrays capped at `MAX_IN_FILTER_IDS` (500)
- [x] `trackQueryPerf()` wraps search queries for observability

## Loading / Error / Empty States

- [x] Teacher Dashboard — profile loading handled
- [x] Teacher Applications — loading skeleton, empty state, error state
- [x] Teacher Training — loading state per section, empty states for all sections
- [x] Teacher Certificates — loading skeleton, error card, empty state
- [x] School Hiring Jobs — loading/empty states
- [x] School Applicants — loading skeletons, empty state
- [x] School Training Overview — loading skeletons, empty states
- [x] Talent Search — loading/empty/error states
- [x] Public Job listings — loading/empty states

## Score Engines

- [x] CRI Engine — pure deterministic logic in `src/intelligence/scoring/cri/`
- [x] Matching Score Engine — pure logic in `src/intelligence/scoring/matching/`
- [x] Reputation Score Engine — pure logic in `src/intelligence/scoring/reputation/`
- [x] Explainability Layer — structured explanations in `src/intelligence/explainability/`

## Data Integrity

- [x] Taxonomy integrity audit available (`src/admin/audit/auditTaxonomyIntegrity.ts`)
- [x] Required fields audit available (`src/admin/audit/auditRequiredFields.ts`)
- [x] Foreign key integrity audit available (`src/admin/audit/auditForeignKeyIntegrity.ts`)
- [x] Duplicate record detection available (`src/admin/audit/auditDuplicateRecords.ts`)
- [x] Scoring readiness audit available (`src/admin/audit/auditScoringReadiness.ts`)
- [x] Full audit runner available (`src/admin/audit/runFullDataAudit.ts`)

## Performance

- [x] Database indexes: 40+ indexes (GIN, trgm, composite) on critical tables
- [x] Pagination enforced on all search surfaces
- [x] Stale times configured per data category (React Query)
- [x] N+1 prevention: batch fetching for verification, taxonomy, teacher data
- [x] Performance observability via `trackQueryPerf()`

## Debug Artifacts

- [x] Operational logging retained (intelligence handlers, smart-glue dispatcher) — structured and intentional
- [x] Dev-only warnings gated behind `import.meta.env.DEV`
- [ ] Console statements in intelligence layer are structured logging (acceptable for production debugging)

## Security Baseline

- [x] Role-based access via `has_role()` security definer function
- [x] No anonymous signups — standard email/password authentication
- [x] Contact data isolation — email/phone/CV restricted from public layer
- [x] Contact reveal audit logging enabled
- [x] Secrets managed via environment variables (not in code)

---

**Status**: Production-Ready  
**Next Phase**: Phase 6 — Monetization + Security Finalization
