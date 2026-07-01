# Mentor Marketplace — Architecture Freeze Document

**Domain:** Mentor Marketplace  
**Status:** FROZEN  
**Date:** 2026-03-14  
**Version:** 1.0  
**Authority:** This document is the official reference for all future mentor marketplace work in EduLink.

---

## Section 1 — Domain Purpose

The Mentor Marketplace domain is responsible for:

| Concern | Description |
|---|---|
| **Mentor Identity** | Core mentor entity, profile data, status lifecycle, affiliation (independent vs provider-linked) |
| **Mentor Expertise** | Specializations via taxonomy linkage, languages, years of experience |
| **Mentor Availability** | Recurring weekly availability patterns |
| **Mentor Sessions** | Session records between mentors and teachers |
| **Mentor Reviews** | Evidence-based reviews of teacher work by mentors, with approval workflow |
| **Mentor Public Discovery** | Public directory and profile pages for browsing active mentors |
| **Mentor Booking** | Session request, confirmation, cancellation lifecycle (partially implemented) |
| **Mentor Reputation** | Trust signals: review counts, experience, specializations (no numeric rating system exists) |
| **Future Mentor Commerce** | Pricing, payouts, commissions (not implemented) |

### Explicitly Outside This Domain

| Concern | Owning Domain |
|---|---|
| Provider-owned training catalog | Provider Catalog domain |
| Transactions, payouts, billing | Commerce domain |
| School subscription billing | Commerce domain |
| Public course/training marketplace | Training Discovery domain |
| Credential issuance engine | Credentials domain |
| Evidence submission and execution lifecycle | Training Execution domain |

---

## Section 2 — Current Evidence Audit

### 2.1 Mentor Identity

**Status: Implemented**

| Evidence | Detail |
|---|---|
| Table | `mentors` exists with columns: `id`, `user_id`, `bio`, `years_experience`, `languages`, `is_independent`, `primary_provider_id`, `status` |
| Status enum | `mentor_status` enum: values include `active` (confirmed in queries; full enum values defined in DB) |
| Affiliation validation | Trigger `validate_mentor_affiliation()` enforces: independent mentors must have `primary_provider_id = NULL`; affiliated mentors must have a provider |
| Profile UI | Public profile page exists at `/mentors/:id` (`src/pages/public/MentorProfile.tsx`). Teacher-facing mentor list at `/app/teacher/mentors` (`src/pages/app/teacher/Mentors.tsx`) |
| Verification capability | **Missing.** No `is_verified` or `verification_status` field on `mentors` table. No verification workflow exists |
| Name resolution | Mentor names are resolved via `teacher_profiles.full_name` (public directory) or `profiles.email` (teacher app hook) — inconsistent |

### 2.2 Mentor Expertise

**Status: Implemented**

| Evidence | Detail |
|---|---|
| Table | `mentor_specializations` with `mentor_id`, `term_id` linking to `taxonomy_terms` |
| Taxonomy linkage | Fully wired. Terms resolved via `taxonomy_terms.name` in both directory and profile hooks |
| Search/filter readiness | Implemented in `useMentorDirectory.ts`: client-side specialization filter and search across specialization names |

### 2.3 Mentor Availability

**Status: Implemented (pattern-based)**

| Evidence | Detail |
|---|---|
| Table | `mentor_availability` with `mentor_id`, `day_of_week` (0-6), `start_time`, `end_time`, `is_active` |
| Model | Recurring weekly pattern. NOT slot-based. NOT generated bookable slots |
| UI consumption | Public profile shows availability summary (weekdays/weekends). Teacher booking dialog shows availability badges |
| Management | `useUpdateMentorAvailability()` in `useMentorSessions.ts` — deactivates existing, inserts new |

### 2.4 Mentor Sessions

**Status: Partial**

| Evidence | Detail |
|---|---|
| Table | `mentor_sessions` with `mentor_id`, `teacher_id`, `scheduled_at`, `duration_minutes`, `status`, `notes`, `session_type` |
| Status values | Validated by trigger: `scheduled`, `completed`, `cancelled`, `no_show` |
| Session creation UI | Exists in teacher app (`/app/teacher/mentors`) — simple datetime picker + notes, inserts directly as `scheduled` |
| Booking confirmation | **Missing.** No `requested` → `confirmed` flow. Teacher inserts directly as `scheduled` without mentor approval |
| Cancellation UI | **Missing.** `useUpdateMentorSessionStatus()` exists as mutation but no cancel button in UI |
| Rescheduling | **Missing.** No rescheduling capability exists |
| Completion logic | **Missing.** No UI or automation to mark sessions as `completed` |

### 2.5 Mentor Reviews

**Status: Implemented**

| Evidence | Detail |
|---|---|
| Table | `mentor_reviews` with `mentor_id`, `teacher_id`, `evidence_id`, `execution_id`, `review_decision`, `review_notes`, `reviewed_at` |
| Review decision enum | `mentor_review_decision`: `approved`, `rejected`, `needs_revision` |
| Rating field | **Missing.** No numeric rating (1-5 stars) exists on `mentor_reviews`. All trust signals are count-based |
| Approval workflow | Reviews are evidence-based. Trigger `validate_mentor_review()` enforces: evidence must exist, belong to teacher, and mentor cannot review own work. Trigger `apply_mentor_review_to_evidence()` propagates decision to evidence status |
| Public display | `/mentors/:id` shows approved reviews only (`review_decision = 'approved'`). Correctly governance-safe |
| Edge function | `mentor-review` edge function handles review submission and queue retrieval |

### 2.6 Public Discovery

**Status: Implemented**

| Evidence | Detail |
|---|---|
| Routes | `/mentors` → `MentorsDirectory.tsx`, `/mentors/:id` → `MentorProfile.tsx` |
| Hook | `useMentorDirectory()` in `src/hooks/useMentorDirectory.ts` — fetches active mentors with specializations, review counts, provider names |
| Filters | Specialization (taxonomy), language, experience range (0-3, 3-7, 7-15, 15+) |
| Rating filter | **Missing.** Sprint spec called for 4+ / 4.5+ rating filter, but no numeric rating field exists in schema. Cannot implement without schema change |
| Auth scope | Public. No authentication required. Queries filter `status = 'active'` only |
| Search | Client-side search across name, bio, specialization names |

### 2.7 Booking Readiness

**Status: Partial (schema exists, UX incomplete)**

| Capability | Status |
|---|---|
| Booking request creation | **Partial.** Teacher can insert `mentor_sessions` row directly as `scheduled`. No request/confirmation flow |
| Mentor confirmation | **Missing.** No confirmation step exists |
| Cancellation | **Schema-ready** (`cancelled` status exists). **No UI** |
| Rescheduling | **Missing** |
| Session completion | **Schema-ready** (`completed` status exists). **No UI or automation** |

### 2.8 Commerce Readiness

**Status: Missing**

| Capability | Status |
|---|---|
| Mentor pricing | Not implemented. No `price`, `rate`, or `pricing_type` fields on `mentors` or `mentor_sessions` |
| Payment processing | Not implemented |
| Payout model | Not implemented |
| Commission model | Not implemented |

---

## Section 3 — Mentor Marketplace Architecture Map

### 3.1 Mentor Identity Layer

| Attribute | Value |
|---|---|
| **Primary responsibility** | Owns mentor entity, status, affiliation, bio, experience |
| **Core tables** | `mentors` |
| **Current status** | Implemented |
| **Future extension points** | Add `is_verified` field for verification badge; add `headline` field for short professional tagline |

### 3.2 Mentor Expertise Layer

| Attribute | Value |
|---|---|
| **Primary responsibility** | Links mentors to taxonomy-based specializations |
| **Core tables** | `mentor_specializations`, `taxonomy_terms` |
| **Current status** | Implemented |
| **Future extension points** | Weighted specializations (primary vs secondary); endorsement counts per specialization |

### 3.3 Mentor Availability Layer

| Attribute | Value |
|---|---|
| **Primary responsibility** | Stores recurring weekly availability patterns |
| **Core tables** | `mentor_availability` |
| **Current status** | Implemented |
| **Future extension points** | Slot generation from patterns; timezone support; exception dates (unavailable overrides) |

### 3.4 Mentor Booking Layer

| Attribute | Value |
|---|---|
| **Primary responsibility** | Session request creation, confirmation, lifecycle management |
| **Core tables** | `mentor_sessions` |
| **Current status** | Partial — direct insertion exists, no request/confirm flow |
| **Future extension points** | `requested` status addition; mentor confirmation UI; automated reminders; rescheduling |

### 3.5 Mentor Reputation Layer

| Attribute | Value |
|---|---|
| **Primary responsibility** | Trust signals: review counts, approval history, experience display |
| **Core tables** | `mentor_reviews` |
| **Current status** | Implemented (count-based). No numeric rating |
| **Future extension points** | Add numeric `rating` field (1-5); compute average rating; rating-based filtering; reputation score aggregation |

### 3.6 Mentor Commerce Layer

| Attribute | Value |
|---|---|
| **Primary responsibility** | Pricing, payments, payouts, commissions |
| **Core tables** | None exist |
| **Current status** | Missing |
| **Future extension points** | Session pricing on `mentor_sessions` or `mentors`; Stripe integration; payout ledger; commission model |

---

## Section 4 — Canonical Tables and Responsibilities

### `mentors`

| Aspect | Freeze |
|---|---|
| **Owns** | Mentor identity, status, bio, experience, languages, affiliation type, provider link |
| **Must NOT own** | Session records, review decisions, pricing, booking slots, availability patterns |
| **Key constraint** | `is_independent = true` requires `primary_provider_id = NULL` (trigger-enforced) |
| **Visibility rule** | Only rows with `status = 'active'` appear in public queries |

### `mentor_specializations`

| Aspect | Freeze |
|---|---|
| **Purpose** | Junction table linking `mentors.id` to `taxonomy_terms.id` |
| **Cardinality** | Many-to-many. One mentor has many specializations |
| **Taxonomy domain** | Uses `skills` taxonomy domain (confirmed by filter UI usage of `domainKey="skills"`) |

### `mentor_availability`

| Aspect | Freeze |
|---|---|
| **Purpose** | Recurring weekly availability pattern. NOT booked slots |
| **Model** | Pattern-based: `day_of_week` (0=Sunday through 6=Saturday) + `start_time` / `end_time` |
| **Interpretation** | Represents when a mentor is generally available. Does NOT represent confirmed bookable time slots |
| **`is_active` flag** | Allows soft-delete of availability without row deletion |
| **Must NOT be confused with** | Actual booked session times (those live in `mentor_sessions.scheduled_at`) |

### `mentor_sessions`

| Aspect | Freeze |
|---|---|
| **Current role** | Operational session record. Created directly by teacher with `status = 'scheduled'` |
| **Intended role (frozen)** | Booking record AND operational session record (single table) |
| **Lifecycle states** | `scheduled`, `completed`, `cancelled`, `no_show` (trigger-validated) |
| **Gap** | Missing `requested` and `confirmed` states for proper booking flow |
| **Recommendation** | Add `requested` and `confirmed` to status validation trigger in Sprint B2-B |
| **Relationships** | `mentor_id` → `mentors.id`, `teacher_id` → `teacher_profiles.id` |

### `mentor_reviews`

| Aspect | Freeze |
|---|---|
| **Purpose** | Evidence-based reviews of teacher training work by assigned mentors |
| **Decision values** | `approved`, `rejected`, `needs_revision` |
| **Public display rule** | Only `review_decision = 'approved'` reviews appear publicly |
| **Rating** | No numeric rating field exists. Reviews are binary (approved/rejected/revision) |
| **Side effects** | `apply_mentor_review_to_evidence()` trigger propagates decision to `training_evidence.review_status` |
| **Self-review prevention** | `validate_mentor_review()` trigger prevents mentor from reviewing own evidence |

---

## Section 5 — Lifecycle Freezes

### 5.1 Mentor Status Lifecycle

```
pending → active → suspended
                 → inactive
```

| Status | Meaning | Public Visibility |
|---|---|---|
| `pending` | Mentor registered, not yet approved | Hidden |
| `active` | Mentor approved and visible | **Visible** |
| `suspended` | Temporarily removed from marketplace | Hidden |
| `inactive` | Voluntarily deactivated | Hidden |

**Note:** The `mentor_status` enum exists in DB. Current codebase only queries `status = 'active'`. Full enum values should be confirmed but the above represents the recommended freeze.

### 5.2 Session Lifecycle

**Current (implemented):**

```
scheduled → completed
          → cancelled
          → no_show
```

**Recommended freeze (for Sprint B2-B):**

```
requested → confirmed → completed
                      → cancelled
                      → no_show
          → declined
          → cancelled (by requester before confirmation)
```

| Status | Meaning | Created By |
|---|---|---|
| `requested` | Teacher requests a session | Teacher |
| `confirmed` | Mentor accepts the request | Mentor |
| `declined` | Mentor declines the request | Mentor |
| `completed` | Session took place | Mentor (or system) |
| `cancelled` | Session cancelled after confirmation | Either party |
| `no_show` | One party did not attend | Mentor (or system) |

**Current gap:** `requested`, `confirmed`, and `declined` do not exist. Teacher currently inserts directly as `scheduled` (equivalent to confirmed without consent).

### 5.3 Review Lifecycle

```
(created) → approved
          → rejected
          → needs_revision → (resubmit evidence) → approved
```

| Status | Public Display |
|---|---|
| `approved` | **Yes** |
| `rejected` | No |
| `needs_revision` | No |

**Note:** Reviews do not have a separate `pending` state. They are created with a decision (`review_decision`). This is intentional — reviews happen as a direct action, not a queued workflow.

---

## Section 6 — Public Route Contract Freeze

### Existing Routes

| Route | Component | Status |
|---|---|---|
| `/mentors` | `MentorsDirectory.tsx` | **Existing** |
| `/mentors/:id` | `MentorProfile.tsx` | **Existing** |
| `/training/mentors` | `TrainingMentors.tsx` | **Existing** (marketing/landing page with hardcoded data) |
| `/app/teacher/mentors` | `Mentors.tsx` | **Existing** (teacher app — auth-scoped) |
| `/app/school/training/mentors` | `SchoolMentors.tsx` | **Existing** (school app — auth-scoped) |

### Planned Future Routes

| Route | Purpose | Status |
|---|---|---|
| `/app/mentor/dashboard` | Mentor workspace home | **Missing — future scope** |
| `/app/mentor/sessions` | Mentor's session management | **Missing — future scope** |
| `/app/mentor/profile` | Mentor profile editing | **Missing — future scope** |
| `/app/mentor/reviews` | Mentor's review queue/history | **Missing — future scope** |

**Freeze note:** Mentor workspace routes are not in scope until after Sprint B2-B booking engine is operational.

---

## Section 7 — Booking Architecture Freeze

### 7.1 Source of Availability

**Frozen decision:** Availability is derived from **recurring weekly patterns** stored in `mentor_availability`.

- The system does NOT generate discrete bookable slots
- The availability pattern is advisory — it indicates general availability
- Booking validation against availability is NOT currently enforced (teacher can book any time)
- **Recommendation for B2-B:** Validate `scheduled_at` against `mentor_availability` patterns on booking request

### 7.2 Booking Record

**Frozen decision:** A booking is a row in `mentor_sessions`.

- No separate `bookings` table will be created
- `mentor_sessions` serves as both booking record and session record
- The `status` field governs the booking lifecycle

### 7.3 Booking Actor

**Frozen decision:** The **teacher** initiates a booking request.

- Current implementation: teacher creates session directly
- Recommended for B2-B: teacher creates with `status = 'requested'`, mentor confirms
- School users: **deferred** — not in scope for B2-B

### 7.4 Booking Lifecycle (Canonical)

**Frozen statuses:**

| Status | Description |
|---|---|
| `requested` | Teacher submitted booking request |
| `confirmed` | Mentor accepted |
| `declined` | Mentor declined |
| `cancelled` | Cancelled by either party |
| `completed` | Session occurred |
| `no_show` | Session was missed |

### 7.5 Completion Logic

**Frozen decision:** Session completion is a manual status update by the mentor.

- No automated completion based on time passing
- Mentor marks session as `completed` after it occurs
- Future: automated completion 24h after `scheduled_at` (deferred)

### 7.6 Cancellation Logic

**Frozen rules:**

- Either teacher or mentor can cancel
- Cancellation is allowed only for `requested` or `confirmed` sessions
- `completed` and `no_show` sessions cannot be cancelled
- Cancellation reason field: **deferred** — not required for B2-B MVP
- Cancellation window/policy: **deferred** — no time-based restriction for MVP

### 7.7 Rescheduling

**Frozen decision:** Rescheduling is **deferred** beyond Sprint B2-B.

- Workaround: cancel and create new request
- Native rescheduling (update `scheduled_at` on existing session) is future scope

---

## Section 8 — Governance and Visibility Rules

### Public Visibility Rules

| Rule | Enforcement |
|---|---|
| Only `status = 'active'` mentors appear in public directory | Enforced in `useMentorDirectory` query filter |
| Only `review_decision = 'approved'` reviews display publicly | Enforced in `MentorProfile.tsx` query filter |
| Availability summary can be displayed publicly | Currently displayed on `/mentors/:id` |
| Mentor bio, specializations, languages, experience are public | Currently exposed in directory and profile |
| Mentor `user_id` is exposed in queries but not in UI | Acceptable — used for profile resolution only |

### Internal Operational Rules

| Rule | Enforcement |
|---|---|
| Session data (`mentor_sessions`) is auth-scoped | Accessed only via authenticated hooks (`useTeacherMentorSessions`, `useMentorOwnSessions`) |
| Session creation requires authentication | `useScheduleMentorSession` checks `user` before mutation |
| Review submission requires mentor role | Edge function `mentor-review` validates via auth token |
| Mentor cannot review own evidence | DB trigger `validate_mentor_review()` enforces |

### Future Commercial Rules (Not Yet Implemented)

| Rule | Status |
|---|---|
| Session pricing must not appear publicly until commerce layer exists | **Not applicable** — no pricing fields exist |
| Payout data is internal only | **Not applicable** — no payout model exists |
| Commission rates are platform-internal | **Not applicable** — no commission model exists |

---

## Section 9 — Event Surface Freeze

The following domain events are frozen as the canonical event contracts for the Mentor Marketplace. They are not fully wired yet but define the integration surface for future Smart Glue and notification systems.

| Event | Trigger Condition | Payload Intent |
|---|---|---|
| `mentor.session_requested` | Teacher creates a session with `status = 'requested'` | `{ session_id, mentor_id, teacher_id, scheduled_at }` |
| `mentor.session_confirmed` | Mentor changes session status to `confirmed` | `{ session_id, mentor_id, teacher_id, scheduled_at }` |
| `mentor.session_declined` | Mentor changes session status to `declined` | `{ session_id, mentor_id, teacher_id, reason? }` |
| `mentor.session_completed` | Session status changes to `completed` | `{ session_id, mentor_id, teacher_id, duration_minutes }` |
| `mentor.session_cancelled` | Session status changes to `cancelled` | `{ session_id, cancelled_by, reason? }` |
| `mentor.review_added` | New row inserted in `mentor_reviews` | `{ review_id, mentor_id, teacher_id, evidence_id, decision }` |
| `mentor.review_approved` | `mentor_reviews` row inserted with `review_decision = 'approved'` | `{ review_id, mentor_id, teacher_id, evidence_id }` |

**Current wiring status:** `mentor.review_approved` is partially wired — `useSubmitMentorReview` calls `onEvidenceApproved()` on success. All other events are not wired.

---

## Section 10 — Phase Execution Order After Freeze

| Phase | Name | Prerequisites | Scope |
|---|---|---|---|
| **Sprint B2-A** | Mentor Public Discovery | None | `/mentors`, `/mentors/:id`, directory, search, filters. **COMPLETE** |
| **Sprint B2-B** | Mentor Booking Engine | B2-A complete, architecture freeze | Add `requested`/`confirmed`/`declined` to session lifecycle. Build booking request UI. Build mentor confirmation UI. Validate availability on booking |
| **Sprint B2-C** | Mentor Reputation Layer | B2-B complete | Add numeric rating to reviews. Compute average rating. Rating-based filtering. Reputation score card |
| **Sprint B3** | Mentor Commerce Layer | B2-C complete | Session pricing. Payment integration. Payout model. Commission structure |

**Critical constraint:** Commerce (B3) must NOT begin until Discovery (B2-A), Booking (B2-B), and Reputation (B2-C) are all complete and stable.

---

## Section 11 — Gap Table

| Area | Current Status | Needed Before B2-B | Notes |
|---|---|---|---|
| Public mentor routes | **Implemented** | ✅ Done | `/mentors` and `/mentors/:id` exist |
| Mentor profile page | **Implemented** | ✅ Done | Shows bio, expertise, reviews, availability |
| Rating aggregation | **Missing** | ❌ Not blocking B2-B | No numeric rating field exists. Count-based trust signals suffice for B2-B |
| Availability-to-booking validation | **Missing** | ⚠️ Recommended | Currently teacher can book any time. Should validate against `mentor_availability` |
| Session lifecycle normalization | **Partial** | ⚠️ Required | Must add `requested`, `confirmed`, `declined` statuses |
| Booking request flow | **Missing** | ⚠️ Required | Teacher currently inserts as `scheduled` directly |
| Mentor confirmation UI | **Missing** | ⚠️ Required | No mentor-side session management exists |
| Booking permissions (RLS) | **Unknown** | ⚠️ Must verify | Need to confirm RLS on `mentor_sessions` allows both parties |
| Cancellation rules | **Missing** | ⚠️ Recommended | No cancel UI or permission logic |
| Review public filtering | **Implemented** | ✅ Done | Only `approved` reviews display publicly |
| Mentor pricing | **Missing** | ❌ Not needed for B2-B | Commerce is Sprint B3 |
| Mentor payout model | **Missing** | ❌ Not needed for B2-B | Commerce is Sprint B3 |
| Mentor verification badge | **Missing** | ❌ Not needed for B2-B | Nice-to-have, not blocking |
| Mentor headline field | **Missing** | ❌ Not needed for B2-B | Bio serves as substitute |
| Name resolution consistency | **Inconsistent** | ⚠️ Recommended | Directory uses `teacher_profiles.full_name`, teacher app uses `profiles.email`. Should standardize |

---

## Section 12 — Final Architectural Verdict

### Assessment

| Area | Verdict |
|---|---|
| Mentor Marketplace foundation | **Exists.** Core tables, identity, expertise, availability, reviews all operational |
| Mentor Public Discovery | **Complete.** Sprint B2-A delivered directory, profiles, search, filters |
| Mentor Booking | **Schema-ready, not UX-ready.** `mentor_sessions` table exists with basic lifecycle. Missing: request/confirm flow, mentor-side UI, availability validation |
| Mentor Reputation | **Partial.** Count-based trust signals work. No numeric rating |
| Mentor Commerce | **Not ready.** No pricing, payment, or payout infrastructure exists |

### Readiness for Sprint B2-B

The architecture is **frozen and ready** for Sprint B2-B with the following prerequisites:

1. **Must do:** Extend `mentor_sessions` status validation trigger to include `requested`, `confirmed`, `declined`
2. **Must do:** Build teacher booking request flow (insert as `requested` instead of `scheduled`)
3. **Must do:** Build mentor confirmation/decline UI
4. **Should do:** Validate booking time against `mentor_availability` patterns
5. **Should do:** Standardize name resolution to use `teacher_profiles.full_name` everywhere
6. **Defer:** Rescheduling, automated completion, commerce, pricing

### Final Statement

> The Mentor Marketplace domain is architecturally stable. The schema foundation is sound. Public discovery is complete. The next correct step is Sprint B2-B — Mentor Booking Engine — which must add the request/confirm lifecycle flow without modifying the existing identity, expertise, or discovery layers. Commerce work must not begin until booking and reputation are both complete.

---

## Evidence Basis

### Tables Inspected
- `mentors` (schema + triggers: `validate_mentor_affiliation`, `validate_mentor_session_status`)
- `mentor_specializations` (schema + FK to `taxonomy_terms`)
- `mentor_availability` (schema)
- `mentor_sessions` (schema + status trigger)
- `mentor_reviews` (schema + triggers: `validate_mentor_review`, `apply_mentor_review_to_evidence`)

### Hooks Inspected
- `src/hooks/useMentors.ts`
- `src/hooks/useMentorDirectory.ts`
- `src/hooks/useMentorSessions.ts`
- `src/hooks/useMentorReviews.ts`

### Pages Inspected
- `src/pages/public/MentorsDirectory.tsx`
- `src/pages/public/MentorProfile.tsx`
- `src/pages/app/teacher/Mentors.tsx`

### Routes Inspected
- `src/routes/publicRoutes.tsx`
- `src/routes/teacherRoutes.tsx`
- `src/routes/schoolRoutes.tsx`

### DB Functions Inspected
- `validate_mentor_review()`
- `apply_mentor_review_to_evidence()`
- `validate_mentor_affiliation()`
- `validate_mentor_session_status()`
