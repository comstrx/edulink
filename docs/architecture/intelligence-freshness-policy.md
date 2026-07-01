# Intelligence Freshness Policy — Architecture

> Step 9A — Freshness Policy Contracts + Lifecycle Model

## Why Freshness Policy Is Needed

Intelligence snapshots (CRI, Match, Gap, Recommendation, Verified State) are derived from source-domain data (profiles, credentials, jobs). When source data changes, existing snapshots may no longer be accurate. The freshness policy provides a **stable, reusable model** for reasoning about snapshot validity without recomputing intelligence in the UI layer.

Without an explicit freshness model:
- UI cannot distinguish "never computed" from "computed but outdated"
- Stale data may be silently presented as current
- Recompute flows have no clear trigger criteria
- Error states are indistinguishable from missing data

## Lifecycle Model

```
                    ┌──────────┐
                    │ missing  │  (no snapshot exists)
                    └────┬─────┘
                         │ first computation
                         ▼
                    ┌──────────┐
              ┌─────│  fresh   │◄──── recompute succeeds
              │     └────┬─────┘
              │          │ time passes / source changes
              │          ▼
              │     ┌──────────┐
              │     │  stale   │
              │     └────┬─────┘
              │          │ source explicitly changes
              │          ▼
              │  ┌───────────────┐
              │  │ invalidated   │
              │  └───────┬───────┘
              │          │ recompute requested
              │          ▼
              │  ┌───────────────┐
              │  │ recomputing   │──── success ──► fresh
              │  └───────┬───────┘
              │          │ failure
              │          ▼
              │     ┌──────────┐
              └─────│  failed  │──── retry ──► recomputing
                    └──────────┘
```

## Status Definitions

| Status | Meaning | Data Available? | Display? |
|--------|---------|----------------|----------|
| `missing` | No snapshot has ever been computed | No | Show empty state |
| `fresh` | Snapshot exists, no known invalidation since computation | Yes | Display normally |
| `stale` | Snapshot exists but may not reflect latest source signals | Yes | Display with stale indicator |
| `invalidated` | Explicitly known to need refresh due to source change | Yes (outdated) | Display with warning |
| `recomputing` | Refresh started but not yet finalized | Yes (previous) | Display previous + loading hint |
| `failed` | Recompute attempt failed | Maybe (previous) | Display previous + error hint |

### Key Distinctions

**Stale vs Invalidated:**
- **Stale** = time-based decay; snapshot *might* still be accurate
- **Invalidated** = explicit signal that source data changed; snapshot is *known* to be outdated

**Missing vs Failed:**
- **Missing** = never computed; no prior data exists
- **Failed** = attempted computation but it errored; prior data may exist from a previous success

## Freshness Metadata Contract

```typescript
interface FreshnessMetadata {
  status: FreshnessStatus;
  computedAt: string | null;
  invalidatedAt: string | null;
  staleReasonCodes: string[];
  sourceUpdatedAtHints: Record<string, string>;
  recomputeRequestedAt: string | null;
  recomputeInProgress: boolean;
  lastSuccessfulComputationAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
}
```

All fields are machine-readable. No presentation copy is stored in metadata.

## Default Freshness Thresholds

| Snapshot Type | Freshness TTL | Expiry TTL | Rationale |
|--------------|---------------|------------|-----------|
| CRI | 24h | 7d | Profile changes are infrequent |
| Match | 12h | 3d | Job-scoped; requirements change more often |
| Gap | 24h | 7d | Aligned with CRI cadence |
| Recommendation | 24h | 7d | Derived from gaps + CRI |
| Verified State | 48h | 14d | Credentials change rarely |

## Stale Reason Codes

Well-known codes for tracking why snapshots became stale:

- `profile_updated` — teacher profile fields changed
- `credentials_updated` — certifications/licenses changed
- `skills_updated` — teacher skills changed
- `languages_updated` — teacher languages changed
- `job_updated` — job requirements changed
- `time_expired` — time-based threshold exceeded
- `engine_version_changed` — engine upgraded since last computation
- `dependency_invalidated` — upstream snapshot was invalidated
- `manual_invalidation` — admin or system override

## Helper Utilities

| Helper | Purpose |
|--------|---------|
| `isSnapshotFresh(meta)` | True if status is "fresh" |
| `isSnapshotStale(meta)` | True if stale, invalidated, or failed |
| `canDisplaySnapshot(meta)` | True if any data exists (everything except missing) |
| `needsRecompute(meta)` | True if refresh is needed and not already in progress |
| `classifyTimeFreshness(...)` | Pure time-based classification (fresh/stale/expired/missing) |
| `markFreshMetadata(...)` | Create fresh metadata after successful computation |
| `markInvalidatedMetadata(...)` | Transition existing metadata to invalidated |
| `markStaleMetadata(...)` | Transition existing metadata to stale |
| `markRecomputingMetadata(...)` | Transition to recomputing state |
| `markFailedMetadata(...)` | Record failure after recompute attempt |
| `resolveSnapshotFreshness(...)` | Combine DB staleness + time-based check |

## Invalidation Matrix (Step 9B)

The invalidation matrix maps source-domain events to affected intelligence snapshots. It is the canonical policy for determining what needs recomputation when upstream data changes.

### Source Event → Affected Snapshots

| Source Event | CRI | Match | Gap | Recommendation | Verified State |
|-------------|-----|-------|-----|----------------|----------------|
| `identity.profile_updated` | **strong** | **strong** | **strong** | **strong** | soft |
| `training.completed` | **strong** | soft | **strong** | **strong** | — |
| `trust.verification_completed` | **strong** | soft | — | soft | **strong** |
| `trust.credential_issued` | soft | — | — | — | **strong** |
| `hiring.job_applied` | soft | — | soft | soft | — |
| `hiring.application.status_changed` | soft | soft | **strong** | **strong** | — |
| `hiring.job_published` | soft | **strong** | — | — | — |

### Strong vs Soft Invalidation

- **Strong**: Source change directly affects the snapshot's core output. Recompute should happen at the earliest opportunity. These are returned in `recommendedRecomputeTargets`.
- **Soft**: Source change may indirectly affect the snapshot. Recompute can be deferred or batched. The snapshot is marked stale but not prioritized for immediate refresh.

### Why Invalidation ≠ Immediate Recompute

Invalidation records the *policy decision* that a snapshot is outdated. Recomputation is a separate concern:
- Invalidation is synchronous and side-effect-free
- Recomputation involves data loading, engine execution, and persistence
- Batching, debouncing, and priority scheduling belong to the recompute orchestration layer (future step)

### Invalidation Helpers

| Helper | Purpose |
|--------|---------|
| `getRulesForEvent(event)` | All invalidation rules triggered by a source event |
| `getRulesForSnapshotType(type)` | All rules that affect a given snapshot type |
| `getSourceEventsForSnapshot(type)` | Deduplicated source events for a snapshot |
| `evaluateInvalidation(event)` | Structured output: affected snapshots + recompute targets |
| `isSnapshotAffectedByEvent(type, event)` | Boolean check for specific pair |
| `getInvalidationStrength(type, event)` | Strength for a specific pair (or null) |

## Recompute Scope & Coordination Policy (Step 9C)

### Scope Types

| Scope | Meaning | Example |
|-------|---------|---------|
| `single_snapshot` | One specific snapshot | Verified State refresh only |
| `teacher_scope` | All teacher-scoped snapshots | Gap + Recommendation chain |
| `teacher_job_scope` | Job-scoped snapshots for one teacher×job pair | CRI + Match for a specific job |
| `downstream_chain` | Dependency-ordered subset across scopes | CRI → Gap → Recommendation |

### Canonical Recompute Order

When multiple snapshots need refresh, they execute in this order:

| Order | Snapshot | Rationale |
|-------|----------|-----------|
| 1 | Verified State | Trust foundation; other engines may reference it |
| 2 | CRI | Core readiness; depends on verified state |
| 3 | Match | Teacher×job; depends on CRI-like signals |
| 4 | Gap | Depends on profile + CRI context |
| 5 | Recommendation | Depends on gaps + CRI + match context |

### Partial vs Broader Recompute

Not every event triggers a full recompute. The plan builder uses the invalidation matrix to determine the minimal set:

| Source Event | Recompute Targets (ordered) | Priority |
|-------------|---------------------------|----------|
| `trust.verification_completed` | Verified State → CRI → Match → Recommendation | immediate |
| `training.completed` | CRI → Match → Gap → Recommendation | immediate |
| `hiring.application.status_changed` | CRI → Match → Gap → Recommendation | immediate (gap/rec strong) |
| `hiring.job_applied` | CRI → Gap → Recommendation | deferred (all soft) |
| `hiring.job_published` | CRI → Match | immediate (match strong) |

### Recompute Plan Structure

```typescript
interface RecomputePlan {
  sourceEvent: string;
  scopeType: RecomputeScopeType;
  priority: "immediate" | "deferred";
  targets: RecomputeTarget[];  // ordered
  teacherId: string;
  jobId?: string;
}
```

### Invalidation → Plan → Execution (Separation)

The freshness module is strictly **policy-only**:
- **Invalidation** (9B) determines *which* snapshots are affected
- **Recompute plan** (9C) determines *scope, order, and priority*
- **Execution** (future) will consume plans and run handlers

No engine calls, database writes, or side effects occur in the policy layer.

### Recompute Helpers

| Helper | Purpose |
|--------|---------|
| `buildRecomputePlan(invalidation, teacherId, jobId?)` | Build ordered plan from invalidation output |
| `buildTargetedRecomputePlan(types, teacherId, opts?)` | Build manual/targeted plan |
| `sortRecomputeTargetsByPolicy(types)` | Sort by canonical order |
| `classifyRecomputeScope(targets, hasJob)` | Determine scope type |
| `getTeacherScopeTargets(targets)` | Filter to teacher-only types |
| `getTeacherJobScopeTargets(targets)` | Filter to job-scoped types |
| `requiresJobContext(type)` | Check if snapshot needs job ID |

## File Structure

```
src/intelligence/freshness/
  types/
    freshness.types.ts              → Status enum, metadata contract, policy config
  policies/
    freshness-policy.ts             → Default thresholds per snapshot type
    freshness-status.helpers.ts     → Pure lifecycle helper functions
    invalidation-matrix.ts          → Canonical source→snapshot mapping (Step 9B)
    invalidation-rules.helpers.ts   → Query and evaluation helpers (Step 9B)
    recompute-policy.ts             → Scope, ordering, plan types (Step 9C)
    recompute-scope.helpers.ts      → Scope classification helpers (Step 9C)
    recompute-order.helpers.ts      → Ordering + plan builder (Step 9C)
  index.ts                          → Barrel export
```
