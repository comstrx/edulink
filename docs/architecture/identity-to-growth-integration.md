# Architecture: Identity-to-Growth Integration (Sprint 9)

## Overview

Sprint 9 introduces a **Growth Read Layer** — a cross-domain aggregation layer that derives career growth state from existing platform domain data without creating new persistent storage.

```
Identity (teacher_profiles, teacher_skills, teacher_experience)
   ↓
Training (training_completions, earned_credentials, pathway_executions)
   ↓
Trust (account_verifications)
   ↓
Reputation (useProfessionalReputation — Sprint 8B) [independent signal]
   ↓
Growth Read Layer (useCareerGrowth)
   ↓
Readiness Signals + Hiring Surfaces
```

## Design Principles

1. **No new persistent tables** — all data derived via read-model hooks
2. **Domain boundaries preserved** — reads from Identity, Training, Trust, Reputation
3. **Deterministic** — no AI, ML, or probabilistic scoring
4. **Null-safe / memo-stable** — resolvedState contract matches Sprint 8 conventions
5. **No scoring engines** — readiness derived from signal counts, not weighted formulas

## Core Hook: `useCareerGrowth(profileId)`

Returns a `CareerGrowthSummary` with:

| Field | Source |
|-------|--------|
| `skillProfile` | `teacher_skills` + `taxonomy_terms` |
| `skillGaps` | `intelligence_gap_snapshots` (optional enrichment) |
| `trainingProgress` | `training_completions`, `training_enrollments`, `pathway_executions` |
| `earnedCredentials` | `earned_credentials` |
| `readinessSummary` | Derived from skills, credentials, training signals |
| `hiringSignals` | Raw structured counts from all above |

### Readiness Derivation

Signal-count based (no weighted scoring):

Three boolean signals:
- **skillsReady**: teacher has ≥ 3 skills
- **credentialsReady**: teacher has ≥ 1 active credential
- **trainingActive**: teacher has active enrollments or pathways

Career readiness level derived from signal count:
- **not_started**: 0 signals true
- **emerging**: 1 signal true
- **developing**: 2 signals true
- **strong**: 3 signals true

**Reputation** is exposed as an independent `reputationAvailable: boolean` signal but does **not** influence `careerReadinessLevel`.

**Intelligence gaps** are optional enrichment — loading failures do not block the resolved state.

### Hiring Signals

Raw structured counts (no 0–100 normalization):

```ts
{
  skillCount: number;
  credentialCount: number;
  trainingCompleted: number;
  reputationAvailable: boolean;
  readinessLevel: string;
}
```

Later sprints will transform these into ranking inputs.

## UI Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `GrowthOverviewCard` | Dashboard summary with readiness signals | Teacher Dashboard |
| `SkillProfileCard` | Skill tags with gap count | Teacher Dashboard |
| `GrowthProgressCard` | Training + credential stats | Teacher Dashboard |
| `CareerReadinessBadge` | Compact readiness indicator | CandidatePanel, search results |

## Visibility Safety

All growth data respects `useEffectiveVisibility()`. Private profiles never expose growth signals in public queries. The `CareerReadinessBadge` renders nothing for `not_started` state.

## Out of Scope

- Recommendation engine
- Ranking algorithms
- AI skill inference
- Analytics dashboards
- LMS redesign
- New database tables
- Scoring engines or weighted formulas
