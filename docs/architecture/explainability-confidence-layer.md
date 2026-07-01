# Explainability / Confidence Layer — Architecture

## Position

```
Identity → Trust → Training → Reputation → Growth → Hiring Signals
                                                ↓
                                    Explainability Layer (read-only)
```

The Explainability Layer sits above all domains as a read-only explanation surface. It does not store data persistently.

## Explanation Contract

Every explanation returns a normalized structure:

```typescript
interface ExplanationContract {
  status: "ready" | "loading" | "unavailable";
  context: "teacher_fit" | "mentor_trust" | "provider_visibility" | "career_readiness";
  confidenceLevel: "low" | "medium" | "high";
  summary: string;
  reasons: ExplanationReason[];
  missingSignals: MissingSignal[];
  audience: "public" | "school" | "internal";
}
```

Each reason includes: `label`, `sourceDomain`, `signalType`, `evidenceStatus`, `visibility[]`.

Optional traceable metadata: `signalCount`, `verificationBasis`, `isPrimary`.

Each missing signal includes: `label`, `sourceDomain`, `signalType`, `hint`, `visibility[]`.

## Confidence Derivation

Rule-based, considers evidence **quality** not just quantity:

- **High**: ≥3 verified signals, from ≥2 different domains, ≤1 missing signal
- **Medium**: ≥1 verified + ≥3 total, OR ≥2 verified from ≥2 domains, OR ≥4 total with ≤2 missing
- **Low**: Few signals, mostly derived, or key signals missing

## Audience Boundaries

Three audiences with strict filtering applied to **both** reasons and missing signals:

### Public
Safe explanations only. Never exposes:
- Hiring outcomes
- Internal evaluations  
- Mentor notes or detailed review ratings
- School-only missing signal hints

| Signal Type | Visible |
|---|---|
| Skills, credentials, training completions | ✓ |
| Reputation level | ✓ |
| Verified identity/credentials | ✓ |
| Completed mentor sessions (count only) | ✓ |
| Mentor reviews/ratings | ✗ |
| Mentor validation details | ✗ |
| Hiring outcomes | ✗ |
| Internal evaluations | ✗ |

### School / Hiring
Professional evidence for hiring decisions:

| Signal Type | Visible |
|---|---|
| All public signals | ✓ |
| Mentor reviews with ratings | ✓ |
| Mentor validation count | ✓ |
| Trust level details | ✓ |
| Identity verification hints | ✓ |
| Profile completeness hints | ✓ |
| Hiring outcomes | ✗ |

### Internal / Admin
Full reasoning trace:

| Signal Type | Visible |
|---|---|
| All school signals | ✓ |
| Hiring outcomes (placed, interviewed) | ✓ |
| Internal evaluations | ✓ |
| Full evidence sources | ✓ |
| Verification basis references | ✓ |

## Explanation Types

### Teacher Fit
**Hook**: `useTeacherFitExplanation(profileId)`  
**Sources**: CareerGrowthSummary + ReputationGraphSummary  
**Note**: Teacher fit represents **general professional suitability**. It is NOT job-specific fit and must NOT behave like a hiring ranking engine. It references skills, credentials, training, reputation, and trust but does not rank candidates.

### Career Readiness
**Hook**: `useReadinessExplanation(profileId)`  
**Sources**: CareerGrowthSummary + ReputationGraphSummary  
**Note**: Readiness = current professional development state. Distinct from teacher_fit which is about overall suitability.

### Mentor Trust
**Hook**: `useMentorTrustExplanation(profileId)`  
**Sources**: ReputationGraphSummary (mentoring + trust signals)

### Provider Visibility
**Hook**: `useProviderVisibilityExplanation(input)`  
**Sources**: ProviderVisibilityInput  
**Distinguishes**: explicit_public_visibility, verified_provider_profile, eligible_catalog_items, provider_account_status, incomplete_requirements, restricted_visibility

## UI Integration Surfaces

ExplanationPanel is integrated into:

1. **Teacher Dashboard** — GrowthOverviewCard (readiness explanation)
2. **Teacher Profile / CandidatePanel** — Teacher fit explanation
3. **Mentor Profile** — Mentor trust explanation
4. **Candidate Cards** — Compact confidence badge (via `compact` prop)

## File Structure

```
src/explainability/
  types/explanation-contract.types.ts
  derivers/
    derive-teacher-fit.ts
    derive-mentor-trust.ts
    derive-provider-visibility.ts
    derive-readiness.ts
  hooks/
    useTeacherFitExplanation.ts
    useMentorTrustExplanation.ts
    useProviderVisibilityExplanation.ts
    useReadinessExplanation.ts
  utils/
    derive-confidence.ts
    filter-by-audience.ts
    map-audience.ts
  index.ts

src/components/explainability/
  ExplanationPanel.tsx
```

## Confidence vs Scoring — Critical Distinction

Confidence in this layer means:

> **Confidence in the evidence support for the explanation.**

It does **NOT** mean:

- Candidate quality score
- Candidate rank
- Hiring recommendation
- Fitness rating

Confidence answers: "How well-supported is this explanation?" — not "How good is this teacher?"

## Platform Risk Note (Post-Sprint 9)

The most dangerous architectural failure mode after Sprint 9 + Explainability is:

> Converting explainability into implicit scoring or hidden ranking.

This layer MUST NOT:

- Expose numeric composite scores to UI
- Weight or rank candidates using confidence levels
- Collapse multi-signal evidence into a single opaque output
- Act as a selection, ranking, or decision engine

The platform must remain **signal-based, multi-factor, traceable, and explainable** — never score-first or black-box.

## Architectural Constraints

- No new database tables or persistent storage
- No AI-generated explanations
- No ranking algorithms or recommendation engines
- No gamification
- No numeric scoring models exposed to UI
- Read-only, rule-based, derived from existing signals
- All audience filtering applied to both reasons AND missing signals
- Confidence is explanation confidence, not candidate quality
