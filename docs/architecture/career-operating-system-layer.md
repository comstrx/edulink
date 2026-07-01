# Career Operating System Layer

> **Status:** Approved  
> **Date:** 2026-03-12  
> **Step:** 10D — Career Operating System Layer  
> **Type:** Architecture definition & orchestration contracts

---

## 1. Purpose

Orchestrate intelligence signals into structured career progression guidance. The Career OS layer sits between the Intelligence Adapter Layer (Step 10C) and the UI, providing teachers with goal-oriented career plans, progress tracking, and opportunity awareness.

---

## 2. Architecture

### Before (Steps 1–10C)

```
Events → Smart Glue → Engines → Snapshots → Adapters → UI
```

### After (Step 10D)

```
Events → Smart Glue → Engines → Snapshots → Adapters → Career OS → UI
```

The Career OS layer consumes adapter signals and composes them into higher-order career experiences.

---

## 3. Module Structure

```
src/career/
  goals/
    career-goal.types.ts       ← Goal type definitions + registry
    career-goal.service.ts     ← Goal CRUD (in-memory)
  journey/
    career-journey.types.ts    ← Journey plan contracts
    career-journey.builder.ts  ← Journey assembly from signals
  progress/
    career-progress.service.ts ← Progress calculation
  radar/
    opportunity-radar.service.ts ← Opportunity detection
  adapters/
    career-os.adapter.ts       ← Top-level orchestrator
  index.ts                     ← Barrel export
```

---

## 4. Snapshot Orchestration Rules

| Rule | Description |
|---|---|
| **Read-only** | Career OS reads adapter signals, never raw DB rows |
| **No recomputation** | Never calls engine functions or scoring logic |
| **No mutations** | Never writes to snapshot tables or domain tables |
| **Pure functions** | All services are pure — no side effects |
| **Null-safe** | Every function handles missing signals gracefully |

---

## 5. Component Relationships

### Career Goal System

Goals are lightweight metadata objects that reference taxonomy values. They do NOT trigger engine recomputation — they simply provide context for journey building.

### Career Journey Builder

Assembles a `CareerJourneyPlan` from four signals:
- `CareerReadinessSignal` → readiness baseline
- `GapInsightSignal` → gap-based milestones
- `ActionableRecommendations` → next actions
- `VerificationSignal` → verification milestones

### Career Progress Tracker

Calculates overall career progress using:
- CRI readiness score (40% weight)
- Verification completion (30% weight)
- Gap closure (30% weight)

### Opportunity Radar

Detects opportunities from:
- Match signals (compatibility ≥ 60)
- Readiness level thresholds
- Verification status

---

## 6. Adapter Relationships

```
Intelligence Adapters (Step 10C)
  ├── CareerReadinessSignal ─────┐
  ├── GapInsightSignal ──────────┤
  ├── ActionableRecommendations ─┤── Career OS Adapter
  ├── VerificationSignal ────────┤
  └── JobCompatibilitySignal ────┘
                                  ↓
                        CareerExperienceSignal
                                  ↓
                                 UI
```

---

## 7. Safe Integration Principles

1. **Career OS never imports engines.** Only adapter signal types.
2. **Career OS never queries the database.** It receives pre-built signals.
3. **Career OS never emits domain events.** It is a read-only orchestration layer.
4. **Goals are metadata, not commands.** Setting a goal does not trigger recomputation.
5. **All outputs include debug metadata** for observability integration.

---

## 8. Fail-Safe Behavior

| Scenario | Behavior |
|---|---|
| All signals missing | Returns empty progress, empty journey, unavailable radar |
| Readiness missing | Progress uses available signals with reduced weight |
| Verification missing | Skips verification milestones |
| Gaps missing | Skips gap closure milestones |
| No match signals | Radar reports 0 eligible jobs |
| No goal set | Journey is null, progress still calculated |

---

## 9. Observability

Career OS operations emit debug metadata via `_debug` fields:

```typescript
{
  _debug: {
    signalsUsed: ["readiness", "gaps", "verification"],
    computedAt: "2026-03-12T10:00:00Z"
  }
}
```

This integrates with the existing intelligence trace system (Step 10A) for end-to-end pipeline visibility.

---

## 10. Why Engines Must Remain Isolated

The Career OS layer exists to **compose and present**, not to **compute**. If the Career OS could call engines directly:

- Engine execution would be triggered from UI-adjacent code
- Scoring logic would fragment across orchestration layers
- Snapshot freshness guarantees would be bypassed
- Performance would degrade (engines are expensive to run)

The strict separation ensures that intelligence is computed once, cached as snapshots, adapted into signals, and then orchestrated into career experiences.

---

## 11. Validation Checklist

- [x] Goal system defined with taxonomy-referenced types
- [x] Journey builder consumes only adapter signals
- [x] Progress tracker handles missing signals safely
- [x] Opportunity radar degrades when data unavailable
- [x] Career OS adapter composes all sub-systems
- [x] No engine imports anywhere in src/career/
- [x] No database calls anywhere in src/career/
- [x] No Smart Glue modifications
- [x] All functions are pure with no side effects
- [x] Barrel export provides clean public API
