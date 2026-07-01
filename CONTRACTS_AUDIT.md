# Emit Points Audit — Smart Domain Contracts

> **Phase 1 — Architecture audit only. No code changes, no event wiring.**
>
> Last updated: 2026-03-11

---

## Purpose

Identify where domain events **should** be emitted in the EduLink platform, based on a scan of all state-changing operations (inserts, updates, status changes) across the four contract domains: Hiring, Training, Trust, and Intelligence.

---

## 🟡 Hiring Domain — 2 mutation points detected

**File:** `src/hooks/useApplications.ts`

| # | Mutation | Location | Current behavior |
|---|---|---|---|
| 1 | `applications.insert(...)` | L92 | Inserts a new row with `status: "applied"` |
| 2 | `applications.update({ status: newStatus })` | L119 | Updates status; currently only supports `"applied"` or `"withdrawn"` |

**Tentative event labels (placeholders — not finalized):**

- `hiring.application.created` — maps to mutation #1
- `hiring.application.status_changed` — maps to mutation #2

> ⚠️ These labels are based on the scan only. Final domain-fact names will be normalized in Step 3. They may change.

**Rejection status support (Phase 3.3a — completed):**

- `useUpdateApplicationStatus` now accepts `"applied" | "withdrawn" | "rejected"` via the `ApplicationStatus` type
- `ApplicationStatusChangedPayload` includes optional `rejectionReasonTermId` field (to be wired in 3.3b)
- No rejection UI, taxonomy selector, or event emission is implemented yet — this is foundational status support only

**Reject action UI (Phase 3.3b — completed):**

- School users can reject applications via `RejectApplicationDialog` on the Applicants page
- Rejection reason is mandatory — sourced from `rejection_reasons` taxonomy domain
- No free-text rejection allowed
- RLS policies added for school roles to read/update applications on their jobs
- `rejectionReasonTermId` is passed through `useUpdateApplicationStatus` as structured metadata
- Event emission and feedback loop are NOT implemented yet — deferred to 3.3c+

**Taxonomy domain verified (Phase 3.3c — completed):**

- `rejection_reasons` domain exists in `taxonomy_term_types` with `is_system_domain = true`
- 14 seed terms present and retrievable (missing-certification, insufficient-experience, etc.)
- `useRejectionReasons` hook loads from `fetchTermsByDomain("rejection_reasons")`
- `validate_application_status()` DB trigger updated to accept `'rejected'` status
- No hardcoded rejection reasons in UI — all loaded from taxonomy

**Rejection payload context (Phase 3.3d — completed):**

- `useUpdateApplicationStatus` mutation vars now carry optional `teacherId` and `jobId` alongside `rejectionReasonTermId`
- Applicants page passes all three IDs when rejecting: `applicationId`, `teacherId`, `jobId`, `rejectionReasonTermId`
- Sufficient structured context for precise `hiring.application_rejected` domain event

**Rejection event emission (Phase 3.3e — completed):**

- `hiring.application_rejected` registered in `EVENT_NAMES` and `EventPayloadMap`
- `ApplicationRejectedPayload` includes: `applicationId`, `teacherId`, `jobId`, `rejectionReasonTermId`, `rejectedAt`
- Event emitted from `useUpdateApplicationStatus.onSuccess` only when `newStatus === "rejected"` with all required IDs present
- Non-rejection status updates do not emit this event
- Smart Glue consumption not yet wired — deferred to next step

**Rejection clarification (updated):**

- `useUpdateApplicationStatus` now accepts `"applied" | "withdrawn" | "rejected"` via `ApplicationStatus` type
- School-side reject action exists on the Applicants page with mandatory taxonomy-backed reason
- `"rejected"` status triggers precise `hiring.application_rejected` event, distinct from generic `hiring.application.status_changed`

---

## 🔴 Training Domain — No mutation points found

- ✅ `training_items` table exists in the database (courses, packages, pathways)
- ❌ No enrollment mutation found
- ❌ No progress mutation found
- ❌ No completion mutation found
- ❌ No certificate generation mutation found

**Status:** Potential future emit points only — not yet implemented. No Training event names are finalized at this stage.

---

## 🔴 Trust Domain — Read-only, no emit points

- `teacher_certifications` — only **SELECT** queries exist (`useTeacherCertifications.ts`)
- `teacher_licenses` — only **SELECT** queries exist
- Current certification and license data represents **teacher-entered profile information**, not credentials issued by a trust workflow
- No verification completion mutation exists
- No trust emit points are active yet

**Status:** Entirely read-only. Trust domain events will only become relevant when issuance and verification workflows are built.

**Verified badge (Phase 3.5a — completed):**

- `TeacherResultCard` fake "Verified Profile" badge (based on `teaching_license_ids.length > 0`) has been removed
- Replaced with real `VerifiedStateBadge` component consuming `useTeacherVerifiedStateSnapshot` hook
- Badge now reflects `overallStatus` from `intelligence_verified_state_snapshots` table: `full`, `partial`, or `none`
- Missing/empty snapshots gracefully hide the badge (no crash)
- Verification workflow itself remains future scope

**Verified filter in Talent Search (Phase 3.5b — completed):**

- `verifiedOnly` boolean filter added to `TalentFilters` state
- URL-synced via `?verified=true` query parameter
- Filter queries `intelligence_verified_state_snapshots` for teachers with `overall_status = 'full'`
- Pre-fetches verified teacher IDs to avoid N+1 queries
- Toggle UI added in `TalentFilterSidebar` under "Verification" section
- Default state: OFF — all teachers shown
- Existing filters remain unchanged

**Unified verification source (Phase 3.5c — completed):**

- Badge and filter now share one canonical source: `intelligence_verified_state_snapshots`
- Search hook batch-fetches verification snapshots for all result teachers (single query, not N+1)
- `verificationMap` returned from `useTalentSearch` and passed as prop to `TeacherResultCard`
- Per-card `useTeacherVerifiedStateSnapshot` hook removed from search results
- `toVerifiedResult()` utility converts map entries to `VerifiedStateConsumptionResult` for badge
- Missing verification state degrades to "empty" (no badge shown, no crash)
- Trust workflow implementation remains outside this step

---

## 🔴 Intelligence Domain — No emit points

- `teacher_skills` has INSERT/UPDATE/DELETE mutations in `SkillsProficiencyEditor.tsx`
- **These are profile-edit mutations belonging to the Identity/Profile domain** — they allow teachers to manage their own skill entries
- They are **not** Intelligence emit points
- No skill gap detection logic exists
- No match score calculation or update logic exists

**Status:** Domain not implemented. No emit points.

---

## Step 2 Readiness for Step 3

### Ready for event identification now

- ✅ **Hiring** — 2 mutation points confirmed in `useApplications.ts`. These can proceed to Step 3 for formal event definition.

### Deferred domains (no mutations to map)

- 🔴 Training — awaiting enrollment/completion flows
- 🔴 Trust — awaiting issuance/verification workflows
- 🔴 Intelligence — awaiting detection/scoring logic

### Naming cautions for Step 3

1. Current placeholder labels (`hiring.application.created`, `hiring.application.status_changed`) are tentative — Step 3 should evaluate whether these align with the existing `EVENT_NAMES` registry or require normalization
2. The existing `EVENT_NAMES.hiring.jobApplied` and `EVENT_NAMES.hiring.rejected` in the contracts layer were defined speculatively — Step 3 must reconcile them against actual mutation behavior
3. Do not create events for mutations that do not yet exist (e.g., rejection, training completion)

---

## Phase 4A — Intelligence Exposure Layer ✅

**Completed:** 2026-03-12

### Summary

Added an Intelligence Exposure Layer that governs how intelligence outputs are surfaced to different audiences (teacher, school, public, admin). The layer enforces audience-scoped data transformations between the Consumption Layer and UI components.

### Key deliverables

- **Exposure types & DTOs** — `src/intelligence/exposure/types/exposure.types.ts`
- **Exposure matrix & rules** — `src/intelligence/exposure/rules/exposure-rules.ts`
- **5 exposure adapters** — CRI, Match, Gap, Recommendation, Verification
- **Audience resolution hook** — `useExposureAudience` + pure `resolveExposureAudience`
- **23 passing tests** — `src/test/intelligence-exposure.test.ts`
- **Architecture docs** — `docs/architecture/intelligence-exposure-model.md`

### Exposure matrix

| Output          | Teacher | School  | Public | Admin |
|-----------------|---------|---------|--------|-------|
| CRI             | Full    | Summary | Hidden | Full  |
| Match Score     | Summary | Full    | Hidden | Full  |
| Skill Gaps      | Full    | Summary | Hidden | Full  |
| Recommendations | Full    | Hidden  | Hidden | Full  |
| Verification    | Full    | Badge   | Badge  | Full  |

### Safe defaults

- Unknown audience → `"public"` (most restrictive)
- Failed lookup → `"hidden"`
