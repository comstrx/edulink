# Emit Points Audit Report

> **Phase 1 — Smart Domain Contracts**
>
> Architecture audit only. No events are wired yet.
>
> Last updated: 2026-03-11

---

## Approved Hiring Events

### 1. `hiring.job_applied`

| Field | Value |
|---|---|
| **Registry key** | `EVENT_NAMES.hiring.jobApplied` |
| **Semantics** | Emitted only on successful INSERT of a new application row |
| **Domain** | Hiring |
| **Source file** | `src/hooks/useApplications.ts` |
| **Hook** | `useApplyToJob` |
| **Mutation** | `applications.insert({ status: "applied", ... })` — L92 |
| **Emit location** | `onSuccess` callback — L100 |
| **Minimal payload** | `teacherId` ✅, `jobId` ✅ |
| **Optional enrichments** | `applicationId` (requires `.select().single()`), `schoolId` (via `jobs.school_id`), `appliedAt` (DB `created_at`) |
| **Re-apply rule** | Re-apply via status update does NOT emit this event |

---

### 2. `hiring.application.status_changed`

| Field | Value |
|---|---|
| **Registry key** | `EVENT_NAMES.hiring.applicationStatusChanged` |
| **Semantics** | Emitted on any status transition of an existing application (withdrawn, rejected, shortlisted, re-applied, etc.) |
| **Domain** | Hiring |
| **Source file** | `src/hooks/useApplications.ts` |
| **Hook** | `useUpdateApplicationStatus` |
| **Mutation** | `applications.update({ status: newStatus })` — L119 |
| **Emit location** | `onSuccess` callback — L125 |
| **Minimal payload** | `applicationId` ✅, `newStatus` ✅ |
| **Optional enrichments** | `teacherId` (via `applications.teacher_id`), `jobId` (via `applications.job_id`), `previousStatus` (requires pre-read) |

---

## Deferred Domains — No Mutation Points

| Domain | Status | Notes |
|---|---|---|
| Training | 🔴 No mutations | Awaiting enrollment/completion flows |
| Trust | 🔴 Read-only | Awaiting issuance/verification workflows |
| Intelligence | 🔴 Not implemented | Awaiting detection/scoring logic |

---

## Speculative Registry Entries (Not Yet Actionable)

These events exist in `EVENT_NAMES` but have **no corresponding mutation** in the codebase:

| Registry entry | Mutation exists? | Action |
|---|---|---|
| `EVENT_NAMES.training.completed` | ❌ | Deferred |
| `EVENT_NAMES.trust.credentialIssued` | ❌ | Deferred |
| `EVENT_NAMES.trust.verificationCompleted` | ❌ | Deferred |
| `EVENT_NAMES.intelligence.skillGapDetected` | ❌ | Deferred |
| `EVENT_NAMES.intelligence.matchScoreUpdated` | ❌ | Deferred |

---

## Readiness Summary

| Event | Payload ready | Emit location confirmed | Ready to wire |
|---|---|---|---|
| `hiring.job_applied` | 🟡 Partial (`applicationId` gap) | ✅ | 🟡 After minor mutation change |
| `hiring.application.status_changed` | ✅ Complete | ✅ | ✅ Yes |

---

## Architectural Notes

1. Events must only be emitted in `onSuccess` after the DB mutation succeeds.
2. Re-apply via status update emits `status_changed`, not `job_applied`.
3. `hiring.rejected` has been removed from the registry — rejection is handled as a `status_changed` event.
4. No client-side timestamps. Prefer DB-generated values.
