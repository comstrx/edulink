# Professional Reputation Graph Layer — Architecture

> Last updated: 2026-03-16

## Overview

The Professional Reputation Graph Layer is a **cross-domain read-aggregation layer** that converts verified professional signals into an explainable, audience-aware reputation structure. It sits above the core platform domains (Identity, Training, Trust, Hiring) without replacing or duplicating any source-of-truth tables.

## Architecture Position

```
Identity  ←  Training  ←  Trust  ←  Hiring
     ↓            ↓          ↓         ↓
Professional Evidence (verified signals)
     ↓
Reputation Signals (categorized)
     ↓
Reputation Graph (relationships)
     ↓
Reputation Summary (normalized)
     ↓
Hiring Signals (consumable)
```

## Source Data (Read-Only)

| Domain | Table | Signal |
|--------|-------|--------|
| Identity | `teacher_profiles` | `years_of_experience` |
| Trust | `account_verifications` | Verification type + count (approved) |
| Training | `training_completions` | Completion count + verified flag |
| Training | `earned_credentials` | Active badges + certificates |
| Training | `pathway_executions` | Completed pathways |
| Mentoring | `mentor_sessions` | Completed session count |
| Mentoring | `mentor_session_evidence` | Approved evidence count |
| Mentoring | `mentor_session_reviews` | Rating average + count (approved) |
| Mentoring | `mentor_reviews` | Approved review count (training evidence) |
| Hiring | `applications` | Status-based outcomes (shortlisted/interviewed/hired) |

**No tables are modified. All reads use existing domain tables.**

## Signal Categories

### 1. Trust Signals
```typescript
{
  verifiedIdentity: boolean,
  verifiedCredentials: boolean,
  verificationCount: number,
  trustLevel: "none" | "basic" | "enhanced" | "full"
}
```

### 2. Training Evidence Signals
```typescript
{
  completedCourses: number,
  verifiedCompletions: number,
  earnedBadges: number,
  earnedCertificates: number,
  completedPathways: number
}
```

### 3. Mentoring Signals (First-Class)
```typescript
{
  completedSessions: number,
  approvedEvidence: number,
  mentorReviewCount: number,
  averageMentorRating: number | null,
  mentorValidationCount: number
}
```

### 4. Hiring Outcome Signals
```typescript
{
  shortlistedCount: number,
  interviewedCount: number,
  hiredCount: number
}
```

### 5. Review Signals
```typescript
{
  reviewScore: number | null,
  reviewCount: number
}
```

## Reputation Levels

Derived from transparent signal-presence rules (not weighted scoring):

| Level | Rule |
|-------|------|
| **Trusted** | 5+ signal categories active |
| **Strong** | 4 signal categories active |
| **Established** | 3 signal categories active |
| **Developing** | 1-2 signal categories active |
| **Emerging** | No active signals |

Signal categories counted:
1. Trust verified
2. Has credentials
3. Has training (verified or standard)
4. Has mentor validation
5. Has hiring evidence or pathway completions
6. Has 3+ years experience

## Evidence Provenance (Explainability)

Every reputation summary includes an `evidenceSources` array documenting which signals contributed:

```typescript
[
  { kind: "trust_verification", label: "Verified trust signals", count: 3 },
  { kind: "training_completion", label: "Completed training courses", count: 5 },
  { kind: "mentor_validation", label: "Mentor-validated evidence", count: 2 },
  // ...
]
```

No black-box scoring. Every reputation state is fully explainable.

## Audience Boundaries

Signals are filtered by audience to prevent private data exposure:

### Public-Safe
- Reputation level
- Verified credential count
- Training completion count
- Completed pathway count

### School-Visible
- All public signals, plus:
- Mentor validation count
- Average mentor rating
- Trust level
- Completed session count

### Internal Only (Never Public)
- Hiring outcome details
- Review scores
- Evidence source breakdown
- Numeric reputation score

### Filtering API
```typescript
import { getReputationViewByAudience } from "@/reputation/utils/audience-filter";

const publicView = getReputationViewByAudience(summary, "public");
const schoolView = getReputationViewByAudience(summary, "school");
```

## Hook: `useProfessionalReputation(profileId)`

**Location:** `src/reputation/hooks/useProfessionalReputation.ts`

Canonical hook returning `ReputationGraphSummary`:

```typescript
{
  resolvedState: "loading" | "unavailable" | "resolved",
  reputationScore: number,        // 0-100 (internal)
  reputationLevel: ReputationGraphLevel,
  trust: TrustSignals,
  training: TrainingEvidenceSignals,
  mentoring: MentoringSignals,
  hiring: HiringOutcomeSignals,
  reviews: ReviewSignals,
  evidenceSources: EvidenceSource[],
  experienceYears: number | null,
  // Backward compat
  verifiedCredentials: number,
  reviewScore: number | null,
  reviewCount: number,
  completedTrainingCount: number,
  trustLevel: "none" | "basic" | "enhanced" | "full"
}
```

### Query Architecture

The hook delegates to focused signal-fetcher functions:

```
useProfessionalReputation(profileId)
  ├── teacher_profiles query (identity)
  ├── fetchTrustSignals() → account_verifications
  ├── fetchTrainingSignals() → training_completions + earned_credentials + pathway_executions
  ├── fetchMentoringSignals() → mentor_sessions + evidence + reviews
  └── fetchHiringSignals() → applications (optional, non-blocking)
```

All queries use 5-minute stale time. Hiring signals are non-blocking.

## File Structure

```
src/reputation/
├── types/
│   ├── reputation-graph.types.ts    ← Graph layer types
│   ├── reputation.types.ts          ← Core engine types (unchanged)
│   └── professional-reputation.types.ts  ← Legacy types (backward compat)
├── signals/
│   ├── fetch-trust-signals.ts
│   ├── fetch-training-signals.ts
│   ├── fetch-mentoring-signals.ts
│   └── fetch-hiring-signals.ts
├── utils/
│   ├── audience-filter.ts           ← Audience-based view filtering
│   ├── derive-reputation-level.ts   ← Rule-based level derivation
│   └── evidence-sources.ts          ← Evidence provenance builder
├── hooks/
│   └── useProfessionalReputation.ts ← Canonical aggregation hook
├── engine/                          ← Event-sourced engine (unchanged)
└── index.ts                         ← Barrel export
```

## Consumers

| Consumer | Signal Used |
|----------|------------|
| `ReputationBadge` | `reputationLevel` + `reputationScore` |
| `ReputationCard` | Internal engine (unchanged) |
| `CandidatePanel` | Full `ReputationGraphSummary` |
| `TeacherResultCard` | Lightweight `ReputationMap` from batch search |
| `useCareerGrowth` | `resolvedState` + `reputationScore` for availability signal |

## Hiring Signal Exposure

```typescript
interface ReputationHiringSignals {
  credentialEvidence: number;
  trainingEvidence: number;
  mentorValidation: number;
  placementEvidence: number;
  reputationLevel: ReputationGraphLevel;
}
```

These signals feed future Talent Search, Candidate Ranking, and Job Matching systems. No ranking algorithms are implemented in this layer.

## Non-Goals

- ❌ Reputation gamification
- ❌ Endorsement networks
- ❌ Social reputation graphs
- ❌ AI scoring models
- ❌ Complex ranking engines
- ❌ New persistent domain tables

## Regression Risks

- Hook now makes 5 parallel query groups (was 5 individual) — same query count, better batching
- Hiring signal query added but non-blocking (loading doesn't block resolved state)
- `ReputationBadge` accepts minimal shape — no breaking changes for inline construction
- `ReputationMap` in talent search uses `ReputationGraphLevel` instead of `ReputationLevel`
