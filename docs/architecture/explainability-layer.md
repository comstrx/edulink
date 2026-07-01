# Intelligence Explainability Layer

> Phase 4.3 — Explainability and User Trust

## Purpose

The Explainability Layer transforms raw intelligence snapshots into structured, audience-appropriate, human-readable explanations. It sits between the Consumption Layer and UI components, ensuring users understand *why* they received a particular score, gap, or recommendation — without exposing internal algorithms.

## Architecture

```
Intelligence Snapshot
  → Consumption Hook
    → Explanation Adapter (audience-aware)
      → ExplanationDTO
        → UI Component (ExplanationSection)
```

### Key Constraint
Explanation adapters **never recompute** intelligence scores. They derive all explanations from existing snapshot data.

## Explanation DTO Structure

Every explanation follows a standard shape:

```typescript
interface ExplanationDTO {
  headline: string;           // One-line summary
  shortDescription: string;   // 1–2 sentence context
  evidencePoints: EvidencePoint[];  // Max 5 items
  suggestion?: string | null; // Actionable next step (audience-dependent)
}

interface EvidencePoint {
  label: string;
  detail: string;
  sentiment: "positive" | "negative" | "neutral";
}
```

## Adapters

| Adapter | Input | Audiences |
|---------|-------|-----------|
| `explainCri` | `CriConsumptionData` | Teacher (full), School (neutral), Public (hidden) |
| `explainMatch` | `MatchConsumptionData` | Teacher (gaps + suggestion), School (summary), Public (hidden) |
| `explainGap` | `GapConsumptionData` | Teacher (specific gaps), School (category counts), Public (hidden) |
| `explainRecommendation` | `RecommendationConsumptionData` | Teacher/Admin only; School/Public → fallback |
| `explainVerification` | `VerifiedStateConsumptionData` | Teacher (credential-level), School (%), Public (minimal) |

## Audience Rules

| Signal | Teacher | School | Public |
|--------|---------|--------|--------|
| CRI | Strengths + improvements + suggestion | Neutral summary, no negatives | Fallback |
| Match | Gaps detailed + suggestion | Unmatched count only | Fallback |
| Gaps | Specific gap items + suggestion | Category-level counts | Fallback |
| Recommendations | Priority actions + suggestion | Fallback (hidden) | Fallback (hidden) |
| Verification | Credential-level status | Percentage summary | No evidence |

## Safe Fallback

When data is null or audience is not permitted:

```typescript
const FALLBACK_EXPLANATION = {
  headline: "Insights unavailable",
  shortDescription: "Additional information required to generate detailed insights.",
  evidencePoints: [],
  suggestion: null,
};
```

## UI Integration

### ExplanationSection Component
A reusable component (`src/components/intelligence/ExplanationSection.tsx`) renders any `ExplanationDTO` with consistent styling: headline, evidence points with sentiment icons, and an optional suggestion callout.

### Integrated Surfaces
- **ReadinessScoreCard** → CriExplanationPanel (existing, uses `CriConsumptionData`)
- **GapSummaryCard** → GapExplanationPanel (new, expandable "Why these gaps?")
- **VerificationProgressCard** → VerificationExplanationPanel (new, expandable "What does this mean?")
- **RecommendationsCard** → RecommendationExplanationPanel (existing, per-item expansion)
- **MatchExplanationPanel** → (existing, inline in match surfaces)

## Observability

The `explanation-tracker` module logs which explanations users open:

```typescript
trackExplanationView("cri", "teacher");
getExplanationViewCounts(); // { cri: 1 }
```

In development mode, views are logged to the console. This data can guide future UX improvements.

## Adding New Intelligence Signals

1. Create an explanation adapter in `src/intelligence/explainability/adapters/`
2. Define audience-specific evidence generation (max 5 points)
3. Return `FALLBACK_EXPLANATION` for unsupported audiences
4. Create or reuse a panel component that renders via `ExplanationSection`
5. Add the adapter to `src/intelligence/explainability/index.ts`
6. Write tests verifying audience isolation

## Files

```
src/intelligence/explainability/
├── index.ts                              # Barrel export
├── types/explanation.types.ts            # DTOs and types
├── adapters/
│   ├── cri-explanation.adapter.ts
│   ├── match-explanation.adapter.ts
│   ├── gap-explanation.adapter.ts
│   ├── recommendation-explanation.adapter.ts
│   └── verification-explanation.adapter.ts
├── hooks/useExplanation.ts               # Audience-aware hooks
├── observability/explanation-tracker.ts  # View tracking
└── utils/explanation-helpers.ts          # Shared utilities

src/components/intelligence/
├── ExplanationSection.tsx                # Reusable UI renderer
├── GapExplanationPanel.tsx               # New
├── VerificationExplanationPanel.tsx       # New
├── CriExplanationPanel.tsx               # Existing (enhanced)
├── MatchExplanationPanel.tsx             # Existing
└── RecommendationExplanationPanel.tsx    # Existing
```
