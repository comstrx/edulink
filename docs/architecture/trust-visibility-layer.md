# Trust & Visibility Layer — Architecture Doc

> Sprint 8A · Last updated: 2026-03-16

## Overview

The Trust & Visibility layer is a **cross-cutting read-model** that governs:
1. **Trust signals** — what verification/approval state an account holds
2. **Effective visibility** — whether a profile appears on public surfaces

It does **not** replace domain-specific truth (mentor status, provider lifecycle, teacher opt-in). It **composes** those signals into a deterministic, cacheable shape for UI and query consumers.

---

## Source of Truth vs Read-Model

| Concern | Source of Truth | Read-Model (Hook) |
|---|---|---|
| Email verified | `auth.users.email_confirmed_at` | `useTrustSummary().isEmailVerified` |
| Phone verified | `account_verifications` (type=phone, status=approved) | `useTrustSummary().isPhoneVerified` |
| Teacher identity | `account_verifications` (type=teacher_identity) | `useTrustSummary().isTeacherVerified` |
| Mentor approved | `mentors.status = 'active'` | `useTrustSummary().isMentorVerified` |
| Provider approved | `providers.status = 'active'` | `useTrustSummary().isProviderVerified` |
| School reviewed | `account_verifications` (type=school_review) | `useTrustSummary().isSchoolVerified` |
| Teacher public profile | `teacher_profiles.is_public_profile` + `account_visibility_settings.profile_visibility` | `useEffectiveVisibility().canShowTeacherPublicProfile` |
| Mentor directory | `mentors.status` + `mentors.onboarding_completed_at` | `useEffectiveVisibility().canShowMentorPublicProfile` |
| Provider directory | `providers.status = 'active'` | `useEffectiveVisibility().canShowProviderPublicProfile` |

**Rule**: Hooks never write. They only read and compose. Domain tables remain authoritative.

---

## `account_verifications`

Canonical normalized verification store.

### Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK → profiles.id | The verified account |
| `verification_type` | text | One of: `email`, `phone`, `teacher_identity`, `mentor_review`, `provider_review`, `school_review`, `credential_verification` |
| `status` | text | One of: `pending`, `approved`, `rejected`, `expired` |
| `reviewed_by` | uuid | Admin who reviewed (nullable) |
| `metadata` | jsonb | Evidence/context (default `{}`) |
| `verified_at` | timestamptz | When approved |
| `expires_at` | timestamptz | Optional expiry |
| `created_at` / `updated_at` | timestamptz | |

### Constraints & Validation

- **Unique**: `(account_id, verification_type)` — one record per type per account
- **Trigger**: `validate_account_verification()` enforces allowed `verification_type` and `status` values using `NOT IN (...)` (not `!= ALL`)
- **Index**: Composite index on `(account_id, verification_type)` for read performance

### RLS

| Policy | Access |
|---|---|
| Owners read own | `SELECT` where `account_id = auth.uid()` |
| Admins full access | `ALL` where `has_role(auth.uid(), 'admin')` |
| **No self-insert** | Users cannot create their own verification records |
| **No public read** | Anonymous/unauthenticated cannot query this table |

---

## `useTrustSummary()`

**Location**: `src/hooks/useTrustSummary.ts`

Single canonical hook for trust-signal reads.

### State Contract

```typescript
type TrustResolvedState = "loading" | "unavailable" | "resolved";

interface TrustSummary {
  resolvedState: TrustResolvedState;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isTeacherVerified: boolean;
  isMentorVerified: boolean;
  isProviderVerified: boolean;
  isSchoolVerified: boolean;
  verificationBadges: string[];
  verifiedCount: number;
  isLoading: boolean; // deprecated — use resolvedState
}
```

### State Machine

| `resolvedState` | Meaning | UI behavior |
|---|---|---|
| `loading` | Upstream data still fetching | Show skeleton / spinner |
| `unavailable` | No authenticated user | All flags `false`, no skeleton |
| `resolved` | Trust data is deterministic | Safe to read all flags |

### Composition Sources

1. `account_verifications` table (status = `approved`)
2. `mentors.status` (via `useMentorOnboardingStatus`)
3. `providers.status` (via `useProviderOnboardingStatus`)
4. `auth.users.email_confirmed_at` (from AuthContext)

### Guarantees

- Null-safe: returns `EMPTY_SUMMARY` when no user
- Memo-safe: all upstream values in dependency array
- Identity-safe: query key includes `user.id`, cache rotates on switch
- No stale leaks: loading gate prevents partial reads

---

## `useEffectiveVisibility()`

**Location**: `src/hooks/useEffectiveVisibility.ts`

Single canonical hook for resolving public exposure.

### State Contract

```typescript
type VisibilityResolvedState = "loading" | "unavailable" | "resolved";

interface EffectiveVisibility {
  resolvedState: VisibilityResolvedState;
  canShowTeacherPublicProfile: boolean;
  canShowTeacherContact: boolean;
  canShowMentorPublicProfile: boolean;
  canShowProviderPublicProfile: boolean;
  canShowSchoolPublicProfile: boolean;
  settings: VisibilitySettings | null;
  isLoading: boolean; // deprecated
}
```

### Resolution Rules

| Flag | Rule |
|---|---|
| `canShowTeacherPublicProfile` | `teacher_profiles.is_public_profile = true` AND `account_visibility_settings.profile_visibility = 'public'` (Dual Consent) |
| `canShowTeacherContact` | `teacher_profiles.is_contact_visible = true` AND `contact_visibility != 'private'` |
| `canShowMentorPublicProfile` | `mentors.status = 'active'` AND `onboarding_completed_at IS NOT NULL` |
| `canShowProviderPublicProfile` | `providers.status = 'active'` |
| `canShowSchoolPublicProfile` | Always `false` (no public school directory yet) |

### Distinguishing States

- `canShow* = false` + `resolved` → explicitly hidden by rule
- `canShow* = false` + `loading` → not yet known, do NOT assume hidden
- `canShow* = false` + `unavailable` → no user context

---

## Normalized Visibility Rules

**Location**: `src/lib/visibility-rules.ts`

### Visibility Levels

```typescript
const VISIBILITY_LEVELS = ["private", "members_only", "schools_only", "public"] as const;
```

Enforced at DB level by `validate_visibility_setting()` trigger.

### Defaults (conservative)

| Setting | Default |
|---|---|
| `profile_visibility` | `members_only` |
| `photo_visibility` | `members_only` |
| `contact_visibility` | `private` |
| `credentials_visibility` | `members_only` |
| `activity_visibility` | `private` |

### Public Query Filter Functions

| Function | Table | Filters |
|---|---|---|
| `applyTeacherPublicFilters()` | `teacher_profiles` | `is_public_profile = true`, `profile_source = 'auth'` |
| `applyMentorPublicFilters()` | `mentors` | `status = 'active'`, `onboarding_completed_at IS NOT NULL` |
| `applyProviderPublicFilters()` | `providers` | `status = 'active'` |
| `applySchoolPublicFilters()` | `school_organizations` | `onboarding_completed = true`, `status = 'active'` |

### Safe Column Lists

| Constant | Usage |
|---|---|
| `TEACHER_PUBLIC_COLUMNS` | Public directory cards — excludes `user_id`, `cv_url`, email, phone |
| `TEACHER_PROFILE_PUBLIC_COLUMNS` | Public profile page (authenticated viewers) |
| `TEACHER_OWNER_COLUMNS` | Owner-only view — includes `user_id`, `cv_url` |

---

## Public Query Rules

1. **All public queries MUST use `apply*PublicFilters()`** — no ad-hoc `.eq("status", "active")` in components
2. **Column selection MUST use safe column constants** — never `select("*")` on public routes
3. **Owner vs public path**: Public teacher profile uses dual-query (owner gets full columns, public gets filtered + restricted columns)
4. **No raw verification exposure**: `account_verifications` is never queried on public routes
5. **No frontend-only hiding**: Visibility is enforced at query level, not component level

---

## Out of Scope (Sprint 8A)

The following are **explicitly not part of this sprint**:

- Reputation scoring / algorithms
- Badge marketplace or trading
- Endorsement graphs
- Review system expansion
- School-facing trust analytics
- New admin dashboards
- Public school directory
- Trust-weighted search ranking
- Verification workflow UI (admin moderation screens)
- Multi-factor trust scoring engine

These may be addressed in future sprints within the broader Professional Trust + Reputation + Career Mobility architecture.

---

## Regression Watch

| Area | Risk | Mitigation |
|---|---|---|
| Auth guards | Hook changes could affect guard timing | `resolvedState` gate prevents premature reads |
| Onboarding flows | Loading state change could cause flicker | `anyLoading` gate aggregates all upstream |
| Public teacher profile | Column restriction could break UI | Owner path preserved with full columns |
| Trust indicators | Badge array change could affect display | `verificationBadges` built from same flags |
| Identity switch | Cache could serve stale data | Query keys include `user.id` |
