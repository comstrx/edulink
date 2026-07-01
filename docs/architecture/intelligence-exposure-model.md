# Intelligence Exposure Model — Phase 4A

## Overview

The Intelligence Exposure Layer governs **who sees what** from the intelligence system. It sits between the Consumption Layer (which provides raw snapshot data) and the UI components, applying audience-scoped transformations.

```
Intelligence Engines → Snapshots → Consumption Layer → Exposure Layer → UI Components
                                                        ↑
                                                  Audience rules applied here
```

## Audiences

| Audience   | Description                        | Example routes               |
|------------|-----------------------------------|-------------------------------|
| `teacher`  | Teacher viewing own data          | `/app/teacher/*`             |
| `school`   | School hiring/training workspace  | `/app/school/*`              |
| `public`   | Unauthenticated marketplace       | `/`, `/teachers/*`, `/jobs/*`|
| `admin`    | Internal operations               | `/admin/*`                   |

## Exposure Matrix

| Output          | Teacher    | School     | Public  | Admin  |
|-----------------|-----------|------------|---------|--------|
| CRI             | Full      | Summary    | Hidden  | Full   |
| Match Score     | Summary   | Full       | Hidden  | Full   |
| Skill Gaps      | Full      | Summary    | Hidden  | Full   |
| Recommendations | Full      | Summary    | Hidden  | Full   |
| Verification    | Full      | Badge only | Badge   | Full   |

### Detail Levels

- **Full**: All fields, breakdowns, and explanations
- **Summary**: Aggregated view (banded scores, counts, category summaries)
- **Badge**: Minimal indicator (e.g., verified/not verified status only)
- **Hidden**: Not exposed at all

## Key Design Decisions

### 1. CRI is banded for schools
Schools see readiness band (e.g., "Moderate", "Strong") and a score range (e.g., "60–79"), not the exact numeric score. This prevents exact score-based discrimination while still providing useful hiring signals.

### 2. Match is full for schools, summary for teachers
Schools need full match breakdowns for hiring decisions. Teachers see their strengths and gaps but not the per-dimension numeric scores that could be gamed.

### 3. Recommendations are summarized for schools
Schools see aggregate recommendation counts and grouped support areas (e.g., "5 actions in Classroom Management"), but NOT individual teacher recommendation details, dismiss controls, or personal action plans. Teachers see full personal recommendations.

### 4. Gaps are summarized for schools
Schools see gap counts by category (e.g., "2 certification gaps") for applied candidates, but not individual gap details. Teachers see full gap breakdowns to take action.

### 5. Verification is badge-level for school/public
Schools and public visitors see only the verification badge status (full/partial/none), not the individual credential verification details.

## Safe Defaults

If the exposure audience cannot be determined, the system defaults to `"public"` (most restrictive). If an exposure level lookup fails, it defaults to `"hidden"`.

## File Structure

```
src/intelligence/exposure/
├── index.ts                              # Barrel export
├── types/
│   └── exposure.types.ts                 # Audience, level, and DTO types
├── rules/
│   └── exposure-rules.ts                 # Exposure matrix and lookup
├── adapters/
│   ├── cri-exposure.adapter.ts           # CRI → audience-scoped DTO
│   ├── match-exposure.adapter.ts         # Match → audience-scoped DTO
│   ├── gap-exposure.adapter.ts           # Gap → audience-scoped DTO
│   ├── recommendation-exposure.adapter.ts # Rec → audience-scoped DTO
│   └── verification-exposure.adapter.ts  # Verification → audience-scoped DTO
└── hooks/
    ├── index.ts                          # Hook barrel
    └── useExposureAudience.ts            # React hook for audience resolution
```

## Adding New Intelligence Signals

When adding a new intelligence output:

1. Add its key to `IntelligenceOutput` in `exposure-rules.ts`
2. Define its exposure levels in `EXPOSURE_MATRIX`
3. Create audience-scoped DTOs in `exposure.types.ts`
4. Create an exposure adapter in `adapters/`
5. Export from `index.ts`
6. Write tests in `src/test/intelligence-exposure.test.ts`

## Integration Pattern

UI components should consume exposed DTOs rather than raw consumption data:

```tsx
import { useExposureAudience, exposeCri } from "@/intelligence/exposure";
import { useTeacherCriSnapshot } from "@/intelligence/consumption/hooks";

function MyComponent({ teacherId, jobId }) {
  const audience = useExposureAudience();
  const criResult = useTeacherCriSnapshot(teacherId, jobId);
  const exposedCri = exposeCri(criResult.data, audience);

  if (exposedCri.level === "hidden") return null;
  if (exposedCri.level === "summary") return <CriBandBadge band={exposedCri.band} />;
  if (exposedCri.level === "full") return <CriFullCard {...exposedCri} />;
}
```

## Verification Workflow

The verification workflow itself (document upload, admin review, trust automation) remains **Phase 4+ scope**. This exposure layer only governs how existing verification state is surfaced across product surfaces.
