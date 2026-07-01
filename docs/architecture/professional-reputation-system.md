# Professional Reputation System — Architecture

> Sprint 8B · Last updated: 2026-03-16

## Overview

The Professional Reputation System is a **cross-domain aggregation layer** that converts verified professional signals into a normalized reputation summary. It sits between Trust, Training, and Hiring domains without replacing any source-of-truth tables.

## Source Data (Inputs)

| Domain | Table | Signal |
|--------|-------|--------|
| Identity | `teacher_profiles` | `years_of_experience` |
| Training | `training_completions` | Verified completion count |
| Training | `earned_credentials` | Active credential count |
| Trust | `account_verifications` | Approved verification count |
| Feedback | `mentor_session_reviews` | Average rating + count (approved only) |

### Tables NOT modified
- `teacher_profiles` — read only
- `account_verifications` — read only
- `training_completions` — read only
- `earned_credentials` — read only
- `mentor_session_reviews` → `mentor_sessions` — read only (join path)

### Existing reputation tables
- `reputation_events` — event-sourced reputation deltas (used by internal engine)
- `reputation_profiles` — materialized reputation snapshot (used by internal engine)

## Aggregation Layer

### `useProfessionalReputation(teacherProfileId)`

**Location:** `src/reputation/hooks/useProfessionalReputation.ts`

Unified hook that returns a `ProfessionalReputationSummary`:

```typescript
{
  resolvedState: 'loading' | 'unavailable' | 'resolved',
  reputationScore: number,       // 0–100 normalized
  reputationLevel: ReputationLevel, // 'bronze' | 'silver' | 'gold' | 'verified'
  verifiedCredentials: number,
  reviewScore: number | null,    // 1–5 average, null if no reviews
  reviewCount: number,
  experienceYears: number | null,
  completedTrainingCount: number,
  trustLevel: 'none' | 'basic' | 'enhanced' | 'full',
}
```

### Score Computation (max 100)

| Component | Max | Rule |
|-----------|-----|------|
| Experience | 25 | Tiered: 1yr=5, 3yr=10, 5yr=15, 10yr=20, 15yr=25 |
| Credentials | 25 | Count-based: 1=5, 2=10, 3=15, 4=20, 5+=25 |
| Training | 20 | Count-based: 1=4, 3=8, 5=12, 7=15, 10+=20 |
| Verification | 15 | Count-based: 1=5, 3=10, 5+=15 |
| Reviews | 15 | Score+count: ≥4.5 & 5+=15, ≥4.0 & 3+=10, else 5 |

### Reputation Levels

Deterministic derivation from score:
- **Verified**: ≥75
- **Gold**: ≥50
- **Silver**: ≥25
- **Bronze**: <25

## Visibility Integration

Reputation respects the visibility layer (Sprint 8A):

1. **Private profiles** — no reputation signals appear publicly
2. **Public queries** use `applyTeacherPublicFilters()` which enforces `is_public_profile=true` and `profile_source='auth'`
3. The `ReputationBadge` component checks `resolvedState === 'resolved'` before rendering
4. No raw verification records are exposed — only normalized counts

## UI Components

| Component | Location | Used In |
|-----------|----------|---------|
| `ReputationCard` | `src/components/reputation/ReputationCard.tsx` | Teacher Dashboard (owner view) |
| `ReputationBadge` | `src/components/reputation/ReputationBadge.tsx` | CandidatePanel, directory cards |

### ReputationBadge
Compact badge showing reputation level + optional score. Renders nothing when:
- `resolvedState !== 'resolved'`
- `reputationScore === 0`

### ReputationCard
Full reputation breakdown with dimension bars and next-tier blockers. Uses the internal `useTeacherReputation` hook (event-sourced engine).

## Public Query Safety

- Only `ProfessionalReputationSummary` fields are exposed publicly
- Raw `account_verifications` records are never returned to public consumers
- Raw `mentor_session_reviews` content (comments) is never exposed
- Review scores are aggregated (average + count only)
- `trustLevel` is derived from verification count, not raw statuses

## Hook Relationships

```
useProfessionalReputation(profileId)  ← PUBLIC consumers (directory, search, profile)
  ├── teacher_profiles.years_of_experience
  ├── training_completions (count, verified)
  ├── earned_credentials (count, active)
  ├── account_verifications (count, approved)
  └── mentor_session_reviews (avg rating, approved)

useTeacherReputation(teacherId)  ← INTERNAL (dashboard, reputation card)
  ├── reputation_profiles (materialized)
  └── reputation tier engine

useTrustSummary()  ← TRUST layer (visibility indicators)
  └── account_verifications + domain onboarding

useEffectiveVisibility()  ← VISIBILITY layer (gates)
  └── account_visibility_settings + domain flags
```

## Out of Scope (Sprint 8B)

- ❌ Endorsement graphs
- ❌ Social reputation networks
- ❌ Complex ML scoring
- ❌ Ranking algorithms
- ❌ Gamification / badges marketplace
- ❌ AI reputation scoring
- ❌ Moderation systems
- ❌ Reputation economy

## Regression Risks

- `CandidatePanel` now calls `useProfessionalReputation` — adds 5 queries per profile view (all cached 5min)
- Review aggregation joins `mentor_sessions` → `mentor_session_reviews` — efficient for small datasets but may need materialization at scale
