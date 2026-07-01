# Intelligence Consumption Layer — Architecture

> Steps 8A + 8B + 8C — Contracts, Hooks, and UI Integration

## Purpose

The consumption layer provides a **clean, stable interface** for UI components to access intelligence engine outputs. It sits between the raw read-model snapshots (persisted by engine writers) and the React components that display intelligence data.

```
Engine Writer → DB Snapshot → Repository → Adapter → Selector → UI Component
                                            ↑                      ↑
                                    (raw → wrapped)      (ConsumptionResult<T>)
```

## Why This Layer Exists

1. **UI must not recompute intelligence** — scores, gaps, and recommendations are computed by dedicated engines and persisted as snapshots. UI reads pre-calculated results.

2. **Status awareness** — UI needs to distinguish between "never computed", "stale", "loading", and "error" states. Raw snapshots don't model all these states.

3. **Decoupling** — if the snapshot schema changes, only adapters need updating. UI components remain stable.

## Architecture

```
src/intelligence/consumption/
  types/
    intelligence-consumption.types.ts    → ConsumptionResult<T>, domain data shapes
  adapters/
    intelligence-consumption.adapters.ts → SnapshotResult → ConsumptionResult mappers
  selectors/
    intelligence-consumption.selectors.ts → Async repo-reading selectors
  index.ts                               → Barrel export
```

### Layers

| Layer | Responsibility |
|-------|---------------|
| **Types** | Define `ConsumptionResult<T>` wrapper and domain-specific data shapes |
| **Adapters** | Pure functions mapping `SnapshotResult<T>` → `ConsumptionResult<T>` |
| **Selectors** | Async functions that read from repository, apply adapters, handle errors |

## Status Model

Every consumption result carries a `ConsumptionStatus`:

| Status | Meaning |
|--------|---------|
| `ready` | Snapshot exists and is fresh |
| `stale` | Snapshot exists but may be outdated |
| `empty` | No snapshot has been computed yet |
| `loading` | Snapshot is being fetched (for React state) |
| `error` | Fetch or mapping failed |

## Metadata

Each result includes `ConsumptionMeta`:

- `computedAt` — when the snapshot was last computed
- `freshnessStatus` — fresh / stale / expired / unknown
- `isStale` — boolean convenience flag
- `missingReason` — why data is absent (never_computed, fetch_failed, teacher_not_found)
- `triggeredByEvent` — the event that caused the last computation
- `engineVersion` — version of the engine that produced the snapshot

## Selector Responsibilities

Selectors:
- ✅ Read from the intelligence repository
- ✅ Apply adapters to shape raw data
- ✅ Catch errors and return structured error results
- ❌ Never compute scores, gaps, or recommendations
- ❌ Never write to the database
- ❌ Never trigger engine refreshes

## Read Models vs Consumption Layer

| Aspect | Read Models | Consumption Layer |
|--------|------------|-------------------|
| Purpose | Persist engine outputs | Shape data for UI |
| Status model | found / not_found / stale | ready / stale / empty / loading / error |
| Metadata | SnapshotMeta (computedAt, staleness) | ConsumptionMeta (+ missingReason, triggeredByEvent) |
| Used by | Writers, services | React components, hooks |

## Covered Snapshot Types

1. **CRI** — Career Readiness Index (score, band, dimensions)
2. **Match** — Teacher×Job compatibility (score, confidence, dimensions)
3. **Gap** — Professional deficiency detection (gap items, severity, grouped summary)
4. **Recommendation** — Actionable next steps (prioritized, grouped, evidence-linked)
5. **Verified State** — Credential verification status

## UI Integration Points (Step 8C)

### Teacher-Facing Surfaces

| Surface | Snapshot | Component |
|---------|----------|-----------|
| Teacher Dashboard — header | Verified State | `VerifiedStateBadge` |
| Teacher Dashboard — insights grid | Gap + Recommendation | `GapSummaryCard` + `RecommendationsCard` |
| Job Details — Career Readiness | CRI + Gap + Recommendation | `CareerReadinessIndicator` (rewired) |

### School-Facing Surfaces

| Surface | Snapshot | Component |
|---------|----------|-----------|
| Talent Search — result card | Match (future) | `MatchSnapshotBadge` (available, not yet wired) |

### Usage Rules

- **CRI** is always teacher×job scoped — never shown without a job context
- **Match** is always teacher×job scoped — only in school talent search with active job filter
- **Gap** is teacher-scoped — shown on dashboard and job detail
- **Recommendation** is teacher-scoped — shown on dashboard
- **Verified State** is teacher-scoped — badge on dashboard header

### Why No Recomputation in UI

Components MUST NOT: call engine functions, join raw tables, re-rank recommendations, or infer gaps.
Components MAY: render scores/bands/lists, show status states, link to relevant pages, display priority badges.

## React Query Hooks (Step 8B)

```typescript
useTeacherCriSnapshot(teacherId, jobId)
useTeacherJobMatchSnapshot(teacherId, jobId)
useTeacherGapSnapshot(teacherId)
useTeacherRecommendationsSnapshot(teacherId)
useTeacherVerifiedStateSnapshot(teacherId)
```

## UX State Policy (Step 8D)

All intelligence UI surfaces handle five explicit states:

| State | UI Treatment | Policy |
|-------|-------------|--------|
| `loading` | Skeleton matching card dimensions | Must be visually distinct from empty; no zero-like placeholder values |
| `empty` | Dedicated empty state with icon + message | **Never fabricate scores/gaps/recommendations**; may include passive guidance copy |
| `stale` | Display last-known data + stale indicator | Data remains visible; freshness risk is clearly communicated |
| `ready` | Full card/badge rendering | Normal display path |
| `error` | Structured error card | Safe, non-crashing; does not substitute stale or empty |

### Shared State Components

| Component | Purpose |
|-----------|---------|
| `IntelligenceLoadingSkeleton` | Card-sized or inline skeleton with header + rows |
| `IntelligenceEmptyState` | Card with icon, title, message, optional CTA slot |
| `IntelligenceErrorState` | Card with destructive-tinted error message |
| `IntelligenceStaleBanner` | Inline stale indicator with clock icon + label |

### Key Principles

1. **No fake values** — missing snapshots show empty state, never zero or placeholder scores
2. **Loading ≠ empty** — skeleton preserves layout; empty state communicates "not computed yet"
3. **Stale ≠ error** — stale data is still valuable; show it with a freshness warning
4. **Error isolation** — a failed intelligence fetch must not crash the page
5. **No UI recomputation** — components never call engines or join domains as a fallback

### Badge Components (VerifiedStateBadge, MatchSnapshotBadge)

Badges are supplementary indicators. During loading they show a small skeleton to prevent layout shift. On error or empty they render nothing — the page remains functional without them.

## Freshness Integration (Step 9D)

### How Freshness Metadata Flows

```
DB Row (staleness, computed_at) → resolveSnapshotFreshness() → ConsumptionMeta
```

The consumption adapters now integrate the freshness policy module to produce richer metadata:

| Meta Field | Source | Purpose |
|-----------|--------|---------|
| `freshnessStatus` | `resolveSnapshotFreshness()` combining DB staleness + time-based TTL | Classification for UI |
| `isStale` | True if stale, invalidated, or failed | Quick boolean for UI branching |
| `isInvalidated` | True only for explicitly invalidated snapshots | Stronger visual treatment |
| `isRecomputing` | True during active recompute | Show loading hint alongside stale data |
| `lastSuccessfulComputationAt` | From snapshot meta | Display "last updated" timestamp |
| `lastFailureAt` | From failure tracking | Expose lifecycle visibility |

### Stale vs Invalidated in UI

Both show data with a warning banner, but with different visual intensity:

- **Stale** (time-based): Clock icon + "may be outdated" — informational
- **Invalidated** (source-changed): Warning icon + "needs to be refreshed" — action-oriented

The `IntelligenceStaleBanner` component accepts `isInvalidated` to switch between treatments.

### What Adapters Do with Freshness

1. Trust DB-level staleness markers (`stale`, `expired`) unconditionally
2. Apply time-based TTL checks via `resolveSnapshotFreshness()` for DB-fresh rows
3. Map the resolved status to `ConsumptionMeta` fields
4. Never recompute as a fallback — only classify and expose

### Limitations (v1)

- `recomputeInProgress` is not yet persisted — always false until orchestration is wired
- `lastFailureAt` is not yet populated — requires handler-level failure tracking
- No real-time subscription support yet
- Repository uses stub (returns empty). Wire to real DB to see data.
- MatchSnapshotBadge not yet wired to TeacherResultCard
- CRI on dashboard shows loading (no job context)
