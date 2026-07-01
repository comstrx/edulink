# Visibility + Trust Signal Audit — Sprint 8, Step 1

## Purpose

Map all existing visibility and trust signals across the platform to determine what remains domain truth vs. what should be normalized into a shared resolver layer.

---

## 1. Teacher

### Raw Domain Fields (on `teacher_profiles`)

| Field                | Type      | Purpose                                           | Current Usage                                                    |
|----------------------|-----------|---------------------------------------------------|------------------------------------------------------------------|
| `is_public_profile`  | `boolean` | Teacher opts in/out of public discovery           | Filters talent search, featured teachers, public profile page    |
| `is_contact_visible` | `boolean` | Teacher controls contact info exposure            | Not actively enforced in UI — contact_reveal_audit exists separately |
| `is_featured`        | `boolean` | Admin/platform marks teacher as featured          | Featured teacher carousel on public pages                        |
| `availability_status`| `string`  | Teacher's job-seeking status                      | Shown on profile cards, filters in talent search                 |

### Current Behavior

- **Public directory**: `useTalentSearch` and `FeaturedTeachers` filter by `is_public_profile = true`.
- **Public profile page**: `TeacherProfile.tsx` checks `is_public_profile` and shows "not public" message if false.
- **Contact reveal**: `contact_reveal_audit` table logs when school users reveal contact info. `is_contact_visible` exists but enforcement is inconsistent.
- **No verification status** on teacher_profiles directly — credential verification lives in intelligence layer (`intelligence_verified_state_snapshots`).

### What Should Remain Domain Truth

- `is_public_profile` — teacher-owned visibility toggle
- `is_contact_visible` — teacher-owned contact control
- `is_featured` — admin curation signal
- `availability_status` — teacher-owned status

### What Should Be Normalized Upward

- "Is this teacher discoverable?" → combines `is_public_profile` + profile completeness + account status
- "What is this teacher's trust level?" → combines credential verification state + reputation score

---

## 2. Mentor

### Raw Domain Fields (on `mentors`)

| Field                     | Type                  | Purpose                                    | Current Usage                              |
|---------------------------|-----------------------|--------------------------------------------|--------------------------------------------|
| `status`                  | `mentor_status` enum  | Lifecycle state (draft→active→paused etc.) | Directory filtering, workspace access      |
| `onboarding_completed_at` | `timestamp`           | Onboarding completion                      | Onboarding orchestration                   |

### Mentor Status Enum Values

`draft`, `pending`, `pending_review`, `active`, `paused`, `suspended`, `rejected`

### Current Behavior

- **Public directory**: Mentor directory implicitly assumes `status = 'active'` for listing.
- **No explicit `is_public` flag** — visibility is derived from `status === 'active'`.
- **No verification_status** on mentors — trust comes from session reviews (`mentor_session_reviews`) and provider affiliation (`primary_provider_id`).
- **Rating system**: `useMentorReputation.ts` aggregates session review ratings for public display.

### What Should Remain Domain Truth

- `status` — mentor lifecycle state
- Session review ratings — domain-specific trust signal

### What Should Be Normalized Upward

- "Is this mentor discoverable?" → `status === 'active'` (implicit rule, should be explicit)
- "What is this mentor's trust level?" → combines active status + review rating + provider affiliation

---

## 3. Provider

### Raw Domain Fields (on `providers`)

| Field                 | Type                              | Purpose                                 | Current Usage                                     |
|-----------------------|-----------------------------------|-----------------------------------------|---------------------------------------------------|
| `status`              | `provider_status` enum            | Lifecycle (draft→active→suspended)      | Directory filtering, workspace gating             |
| `verification_status` | `provider_verification_status` enum | Admin trust marker                    | `ProviderTrustBadge` component, directory display |
| `approved_at`         | `timestamp`                       | When provider was approved              | Audit trail                                       |
| `approved_by`         | `string`                          | Who approved                            | Audit trail                                       |

### Provider Verification Status Enum Values

`unverified`, `verified`, `trusted_partner`

### Current Behavior

- **Public directory**: `ProvidersDirectory.tsx` filters by `status = 'active'`.
- **Trust badge**: `ProviderTrustBadge.tsx` renders badge based on `verification_status` — verified gets checkmark, trusted_partner gets shield.
- **Training catalog visibility**: `is_training_item_publicly_visible()` DB function checks provider `status = 'active'` + item `review_status = 'approved'`.
- **Governance**: Admin can set verification_status independently of status lifecycle.

### What Should Remain Domain Truth

- `status` — provider lifecycle
- `verification_status` — admin-controlled trust tier
- `approved_at` / `approved_by` — audit

### What Should Be Normalized Upward

- "Is this provider discoverable?" → `status === 'active'` (already consistent)
- "What is this provider's trust level?" → `verification_status` (already explicit, good candidate for normalization)

---

## 4. School

### Raw Domain Fields (on `school_organizations`)

| Field                  | Type      | Purpose                              | Current Usage                           |
|------------------------|-----------|--------------------------------------|-----------------------------------------|
| `status`               | `string`  | Org lifecycle (active/pending/etc.)  | Workspace access, membership gating     |
| `onboarding_completed` | `boolean` | Setup completion flag                | Onboarding guard redirect               |
| `slug`                 | `string`  | URL-friendly identifier              | Not currently used for public pages     |

### Raw Domain Fields (on `school_profiles` — legacy)

| Field                  | Type      | Purpose                              | Current Usage                           |
|------------------------|-----------|--------------------------------------|-----------------------------------------|
| `onboarding_completed` | `boolean` | Legacy setup flag                    | Job posting, hiring workspace           |

### Current Behavior

- **No explicit public visibility flag** — schools appear in job listings implicitly via their jobs.
- **No school directory page** exists yet.
- **No verification_status** on schools — trust is implicit from existence.
- **Jobs** have `is_verified` and `is_featured` flags but these are job-level, not school-level.

### What Should Remain Domain Truth

- `status` — org lifecycle
- `onboarding_completed` — setup state

### What Should Be Normalized Upward

- "Is this school discoverable?" → currently undefined, no public school directory exists
- "What is this school's trust level?" → no signal exists yet

---

## 5. Intelligence / Credential Layer

### Raw Domain Fields

| Source                                     | Field/Signal               | Purpose                                |
|--------------------------------------------|----------------------------|----------------------------------------|
| `intelligence_verified_state_snapshots`     | `overall_status`, `verified_count`, `total_count` | Teacher credential verification state |
| `earned_credentials`                        | `status` (active/expired/revoked) | Individual credential state          |
| `earned_credentials`                        | `verification_hash`        | Tamper-proof verification              |
| `intelligence_talent_profiles`              | `credential_strength`, `verified_signal_count` | Aggregated trust signals         |

### Current Behavior

- **Exposure layer** already normalizes verification into audience-scoped DTOs via `exposeVerification()`.
- **CRI engine** uses `verifiedCredentialCount` but currently hardcodes it to `0` (trust domain integration pending).
- **Credential verification** is computation-layer only — no user-facing verification workflow exists yet.

### What Should Remain Domain Truth

- All intelligence snapshot fields — they are computation outputs
- Credential status lifecycle

### What Should Be Normalized Upward

- "Is this teacher's credential set verified?" → already handled by exposure layer
- Should feed into teacher-level trust resolution

---

## 6. Cross-Cutting Signals (Not Domain-Specific)

| Signal                  | Current Location      | Type           | Notes                                       |
|-------------------------|-----------------------|----------------|---------------------------------------------|
| `account_status`        | `profiles`            | Platform-wide  | active/pending/restricted/suspended/archived |
| `contact_reveal_audit`  | Dedicated table       | Privacy audit  | Logs school→teacher contact reveals          |
| Job `is_verified`       | `jobs`                | Job-level      | Admin verification of job posting            |
| Job `is_featured`       | `jobs`                | Job-level      | Premium/featured listing                     |

---

## Summary: Normalization Candidates

### Visibility (Who/What Is Discoverable)

| Entity   | Current Approach                    | Gap                                          |
|----------|-------------------------------------|----------------------------------------------|
| Teacher  | `is_public_profile` flag            | No composite check (profile + account status)|
| Mentor   | Implicit `status === 'active'`      | No explicit visibility flag                  |
| Provider | `status === 'active'` filter        | Consistent, could be formalized              |
| School   | No visibility concept               | No public directory or visibility flag        |

### Trust (What Level of Credibility)

| Entity   | Current Approach                          | Gap                                           |
|----------|-------------------------------------------|-----------------------------------------------|
| Teacher  | Intelligence verification snapshots       | No unified teacher trust level                |
| Mentor   | Session review ratings                    | No formal trust tier                          |
| Provider | `verification_status` enum                | Best model — could inspire others             |
| School   | None                                      | No trust signal exists                        |

### Recommended Architecture

A normalized resolver layer should:

1. **Not replace** domain fields — they remain source of truth
2. **Compose** domain signals into consistent cross-cutting answers:
   - `resolveVisibility(entity, entityId)` → `{ isDiscoverable, reason }`
   - `resolveTrustLevel(entity, entityId)` → `{ level, signals[] }`
3. **Follow the Provider model** as the most mature pattern (explicit `verification_status` enum)
4. **Use the Exposure Layer pattern** for audience-scoping trust display
