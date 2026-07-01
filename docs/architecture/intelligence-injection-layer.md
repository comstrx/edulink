# Intelligence Injection Layer

> **Status:** Approved  
> **Date:** 2026-03-12  
> **Step:** 10C — Intelligence Injection Layer  
> **Type:** Architecture definition & adapter contracts

---

## 1. Purpose

Bridge the gap between raw intelligence snapshots and contextual UI signals. The injection layer converts pre-computed snapshots into meaningful, UI-ready signals without recomputing any intelligence values.

---

## 2. Architecture

### Before (Steps 1–10B)

```
Events → Smart Glue → Engines → Snapshots → UI
```

### After (Step 10C)

```
Events → Smart Glue → Engines → Snapshots → Adapters → Contextual Signals → UI
```

The adapter layer sits between snapshots and the UI, transforming raw numbers into contextual meaning.

---

## 3. Adapter Pattern

Each adapter follows a strict contract:

| Rule | Description |
|---|---|
| **Input** | A single snapshot type (or null) |
| **Output** | A contextual signal type (or null) |
| **Null-safe** | Returns null if input is null |
| **Pure function** | No side effects, no database calls |
| **No recomputation** | Never recalculates scores or runs engine logic |
| **No mutations** | Never writes to any store or snapshot table |

---

## 4. Snapshot → Signal Transformations

| Adapter | Input Snapshot | Output Signal | Key Transformation |
|---|---|---|---|
| `cri.adapter` | `TeacherCriSnapshot` | `CareerReadinessSignal` | Score → readiness level, strengths/risks extraction |
| `match.adapter` | `TeacherJobMatchSnapshot` | `JobCompatibilitySignal` | Dimensions → strength/risk areas, missing requirements |
| `gap.adapter` | `TeacherGapSnapshot` | `GapInsightSignal` | Gaps → severity classification, suggested actions |
| `recommendation.adapter` | `TeacherRecommendationsSnapshot` | `ActionableRecommendations` | Entries → categorized action types with priority |
| `verification.adapter` | `TeacherVerifiedStateSnapshot` | `VerificationSignal` | Status → verification level, badge type |
| `experience.adapter` | All of the above | `TeacherExperienceSignals` | Aggregates all signals for a teacher |

---

## 5. CRI Score → Readiness Level Mapping

| Score Range | Readiness Level | Career Stage |
|---|---|---|
| 0–40 | `early` | Early career stage |
| 41–70 | `developing` | Building qualifications |
| 71–85 | `ready` | Career-ready candidate |
| 86–100 | `highly_ready` | Established professional |

---

## 6. Verification → Badge Mapping

| Verified Ratio | Badge Type |
|---|---|
| 0% | `none` |
| 1–59% | `bronze` |
| 60–99% | `silver` |
| 100% | `gold` |

---

## 7. Fail-Safe Behavior

All adapters handle missing/stale/invalidated snapshots safely:

- **Missing snapshot** → adapter receives `null` → returns `null`
- **Stale snapshot** → adapter processes normally (staleness is metadata, not adapter concern)
- **Invalidated snapshot** → adapter processes normally (invalidation is a UI-layer concern)

The consumption layer (Step 8A) handles staleness banners. Adapters only transform data shape.

---

## 8. Rules for Safe Injection

1. **Adapters never import engines.** They only import snapshot types and signal types.
2. **Adapters never call the database.** They receive pre-loaded data.
3. **Adapters never emit events.** They are pure transformation functions.
4. **UI components may call adapters directly** on already-fetched snapshot data.
5. **Adapters are stateless.** No caching, no memoization, no side effects.

---

## 9. Why Engines Must Remain Isolated

The intelligence engines (CRI, Match, Gap, Recommendation) contain complex business rules, weighted scoring, and domain-specific logic. If adapters could recompute:

- Scoring logic would fragment across layers
- Adapter bugs could produce incorrect intelligence
- Performance would degrade (engines are expensive)
- Snapshot freshness guarantees would be meaningless

The adapter layer exists specifically to **translate**, not to **compute**.

---

## 10. File Structure

```
src/intelligence/adapters/
  types/
    adapter-signals.types.ts   ← Signal type contracts
  cri.adapter.ts               ← CRI → CareerReadinessSignal
  match.adapter.ts             ← Match → JobCompatibilitySignal
  gap.adapter.ts               ← Gap → GapInsightSignal
  recommendation.adapter.ts   ← Recommendations → ActionableRecommendations
  verification.adapter.ts     ← Verified State → VerificationSignal
  experience.adapter.ts       ← Aggregator: all signals for a teacher
  index.ts                     ← Barrel export
```

---

## 11. Validation Checklist

- [x] All 5 individual adapters created with null-safe input handling
- [x] Experience aggregator composes all adapters
- [x] No engine imports in any adapter
- [x] No database calls in any adapter
- [x] No event emission in any adapter
- [x] Signal types defined as separate contracts
- [x] Adapter layer is strictly additive (no existing code modified)
