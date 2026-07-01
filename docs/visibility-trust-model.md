# Visibility & Trust Model — Developer Documentation

> Sprint 8 — Visibility + Trust Normalization

## Overview

EduLink's visibility and trust model governs **who can be seen publicly** and **what trust signals are attached to an account**. It replaces ad-hoc field checks with a normalized, composable architecture.

---

## Core Definitions

### Visibility

**Visibility** determines whether an entity appears in public directories, search results, and profile pages.

```
Effective Visibility =
  Account-level visibility preferences  (account_visibility_settings)
  + Domain publication state             (is_public_profile, status, etc.)
  + Persona readiness                    (onboarding completion)
  + Trust / verification state           (optional future gate)
```

### Trust

**Trust** represents verified signals about an account's authenticity and review state.

```
Trust =
  Verification records                   (account_verifications)
  + Domain review outcomes               (mentor status, provider verification_status)
```

---

## Database Schema

### `account_visibility_settings`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `account_id` | uuid PK | — | References `profiles.id` |
| `profile_visibility` | text | `members_only` | `private` / `members_only` / `schools_only` / `public` |
| `photo_visibility` | text | `members_only` | Same allowed values |
| `contact_visibility` | text | `private` | Same allowed values |
| `credentials_visibility` | text | `members_only` | Same allowed values |
| `activity_visibility` | text | `private` | Same allowed values |

**Purpose**: Account-level user preferences. Does NOT replace domain publication flags.

### `account_verifications`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid PK | `gen_random_uuid()` | — |
| `account_id` | uuid | — | References `profiles.id` |
| `verification_type` | text | — | `email`, `phone`, `teacher_identity`, `mentor_review`, `provider_review`, `school_review`, `credential_verification` |
| `status` | text | `pending` | `pending`, `approved`, `rejected`, `expired` |
| `verified_at` | timestamp | — | When verification was confirmed |
| `expires_at` | timestamp | — | Optional expiry |
| `reviewed_by` | uuid | — | Admin/reviewer who processed |
| `metadata` | jsonb | `{}` | Extensible context |

---

## Domain Truth (Preserved)

These domain fields remain the **raw source of truth** and are NOT replaced:

| Entity | Domain Field | Table |
|--------|-------------|-------|
| Teacher | `is_public_profile`, `is_contact_visible` | `teacher_profiles` |
| Teacher | `profile_source` | `teacher_profiles` |
| Mentor | `status`, `onboarding_completed_at` | `mentors` |
| Provider | `status`, `verification_status` | `providers` |
| School | `onboarding_completed`, `status` | `school_organizations` / `school_profiles` |

The normalized layer **reads** these fields — it does not write to or erase them.

---

## Resolver Hooks

### `useTrustSummary()`

**File**: `src/hooks/useTrustSummary.ts`

Resolves the effective trust state for the current authenticated account by merging:
1. `account_verifications` records (status = `approved`)
2. Domain-specific signals (mentor `status`, provider `status`)
3. Auth metadata (`email_confirmed_at`)

**Returns**: `TrustSummary` — boolean flags per verification type + `verificationBadges` string array.

**Rules**:
- Never invents approval states
- If no record exists, returns `false`
- Badges are derived from real signals only

### `useEffectiveVisibility()`

**File**: `src/hooks/useEffectiveVisibility.ts`

Resolves composite visibility for the current account by combining:
1. Account-level settings (`account_visibility_settings`)
2. Domain publication flags (teacher `is_public_profile`, mentor `status`)
3. Onboarding/readiness state

**Returns**: `EffectiveVisibility` — boolean flags per persona (`canShowTeacherPublicProfile`, etc.) + raw `settings`.

**Key rules**:
- Teacher public profile requires **both** `is_public_profile = true` **and** `profile_visibility = 'public'`
- Mentor public profile requires `status = 'active'` **and** onboarding completed
- Provider public profile requires `status = 'active'`
- School public profile: currently always `false` (no public directory yet)

---

## Public Query Filters

### `src/lib/visibility-rules.ts`

Centralized server-side filter functions for public-facing queries.

| Function | Entity | Filters Applied |
|----------|--------|-----------------|
| `applyTeacherPublicFilters(query)` | Teacher | `is_public_profile = true`, `profile_source = 'auth'` |
| `applyMentorPublicFilters(query)` | Mentor | `status = 'active'`, `onboarding_completed_at IS NOT NULL` |
| `applyProviderPublicFilters(query)` | Provider | `status = 'active'` |
| `applySchoolPublicFilters(query)` | School | `onboarding_completed = true`, `status = 'active'` |
| `applySchoolProfileLegacyPublicFilters(query)` | School (legacy) | `onboarding_completed = true` |

**All public-facing queries MUST use these functions** instead of inline `.eq()` calls.

### What is NOT a visibility gate

- `verification_status` on providers — this is a **trust signal** (badge), not a visibility gate. Unverified but active providers are still listed.
- `account_verifications` records — these inform badges/UI, not directory inclusion.

---

## UI Components

### `VisibilityTrustIndicator`

**File**: `src/components/shell/VisibilityTrustIndicator.tsx`

Compact topbar chip showing Public/Private badge + verification shield icon. Designed for the shell header.

### `VisibilityTrustStatusCard`

**File**: `src/components/setup/VisibilityTrustStatusCard.tsx`

Card component for setup/start pages. Shows:
- Current visibility state with explanation of blockers
- Verification badges earned

Accepts optional `persona` prop to scope to a specific context.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    UI / Shell Layer                       │
│  ┌─────────────────────┐  ┌────────────────────────────┐ │
│  │ VisibilityTrust     │  │ VisibilityTrustStatusCard  │ │
│  │ Indicator (topbar)  │  │ (setup/start pages)        │ │
│  └────────┬────────────┘  └────────┬───────────────────┘ │
│           │                        │                     │
│  ┌────────▼────────────────────────▼───────────────────┐ │
│  │           Resolver Hooks Layer                      │ │
│  │  useEffectiveVisibility()  ←→  useTrustSummary()    │ │
│  └────────┬───────────────────────┬────────────────────┘ │
│           │                       │                      │
│  ┌────────▼──────────┐  ┌────────▼──────────────────┐   │
│  │ Domain Hooks      │  │ Normalized Tables          │   │
│  │ useShellSnapshot  │  │ account_visibility_settings│   │
│  │ useMentorOnboard  │  │ account_verifications      │   │
│  │ useProviderOnboard│  └───────────────────────────┘   │
│  └────────┬──────────┘                                   │
│           │                                              │
│  ┌────────▼──────────────────────────────────────────┐   │
│  │           Domain Tables (Source of Truth)          │   │
│  │  teacher_profiles · mentors · providers ·         │   │
│  │  school_organizations · school_profiles           │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │  Public Query Layer (visibility-rules.ts)         │   │
│  │  applyTeacherPublicFilters()                      │   │
│  │  applyMentorPublicFilters()                       │   │
│  │  applyProviderPublicFilters()                     │   │
│  │  applySchoolPublicFilters()                       │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Validation Checklist

- [x] Every account has visibility settings (backfill migration)
- [x] Verification records structure exists (`account_verifications`)
- [x] Trust mapping is coherent (domain truth merged, not invented)
- [x] Teacher public visibility is intentional (dual-flag check)
- [x] Mentor public visibility requires active + onboarding complete
- [x] Provider public visibility requires active status
- [x] School discoverability is explicit (onboarding + status)
- [x] Public directories use centralized filter functions
- [x] No accidental public exposure (seed/demo records filtered)
- [x] Trust summary derivable from real signals only
- [x] Verification badges available for UI use
- [x] Shell exposes visibility/trust indicator
- [x] Setup pages can surface status via VisibilityTrustStatusCard
