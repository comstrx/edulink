# Intelligence Read Models Architecture

> **Status:** Approved  
> **Date:** 2026-03-11  
> **Workstream:** 2A — Read Models Contracts  
> **Type:** Architecture definition & typed contracts

---

## 1. Purpose

Define stable, typed **read-model snapshots** for the Intelligence domain so UI components consume pre-computed data rather than recalculating on every render.

Read models are **output contracts** — they describe _what_ consumers receive, not _how_ values are computed.

---

## 2. Read Models Overview

| # | Read Model | Description | Primary Consumer |
|---|---|---|---|
| 1 | `TeacherCriSnapshot` | Career Readiness Index for a teacher × job pair | Teacher Dashboard, Job Details |
| 2 | `TeacherJobMatchSnapshot` | Match score for a teacher × job pair | School Talent Search, Candidate Panel |
| 3 | `TeacherGapSnapshot` | Skill/qualification gaps for a teacher | Teacher Profile, Training Recommendations |
| 4 | `TeacherRecommendationsSnapshot` | Recommended items (jobs, training, pathways) | Teacher Dashboard, Training Hub |
| 5 | `TeacherVerifiedStateSnapshot` | Aggregated verification status | Teacher Profile, Trust Badges |

---

## 3. Source-of-Truth vs Derived Output

| Concept | Definition | Example |
|---|---|---|
| **Source-of-truth** | Canonical data owned by a domain | `teacher_profiles.subject_ids`, `jobs.subject_term_ids` |
| **Derived output** | Computed from source-of-truth, cached as a snapshot | CRI score, match score, gap list |

### Rules

- Read models are **always derived** — never the source-of-truth.
- Source-of-truth lives in domain tables (`teacher_profiles`, `jobs`, `training_items`, etc.).
- Read models may become stale; consumers must check `computedAt` / `staleness`.
- Writes to read models happen **only** through designated handlers (future Phase 4+).

---

## 4. Read Boundaries

| Allowed | Not Allowed |
|---|---|
| UI reads snapshot via hook or query | UI calls scoring function directly |
| Hook returns cached snapshot + freshness | Hook triggers recomputation |
| Component renders snapshot data | Component imports matching engine |

### Read Flow (Future)

```
UI Component
  → useTeacherCri(teacherId, jobId)
    → reads from cached snapshot (DB or in-memory)
      → returns TeacherCriSnapshot | null
```

---

## 5. Write Boundaries

| Allowed | Not Allowed |
|---|---|
| Handler computes and persists snapshot | UI writes to snapshot table |
| Handler triggered by Smart Glue intent | Direct DB mutation from component |
| Handler uses matching engine internally | Rule layer writes snapshots |

### Write Flow (Future)

```
Smart Glue Intent (e.g. cri_refresh_requested)
  → Handler: computeAndPersistCri()
    → calls matchTeacherToJob() / computeCRI()
      → writes TeacherCriSnapshot to DB
```

---

## 6. Handler-to-Read-Model Mapping (Future)

| Intent | Handler (Future) | Read Model Written |
|---|---|---|
| `intelligence.cri_refresh_requested` | `handleCriRefresh` | `TeacherCriSnapshot` |
| `intelligence.match_refresh_requested` | `handleMatchRefresh` | `TeacherJobMatchSnapshot` |
| `intelligence.skill_gap_refresh_requested` | `handleGapRefresh` | `TeacherGapSnapshot` |
| `intelligence.training_recommendation_requested` | `handleRecommendation` | `TeacherRecommendationsSnapshot` |
| `trust.verified_state_refresh_requested` | `handleVerifiedRefresh` | `TeacherVerifiedStateSnapshot` |

> **Note:** Handlers are NOT implemented in this workstream. This table documents the intended wiring for Phase 4+.

---

## 7. Freshness & Staleness

Every read model includes:

- `computedAt` — ISO timestamp of last computation
- `staleness` — optional enum: `fresh | stale | expired`
- `ttlSeconds` — optional hint for cache duration

### Staleness Rules (Future)

| Staleness | Meaning | UI Behavior |
|---|---|---|
| `fresh` | Computed recently, within TTL | Show as-is |
| `stale` | Beyond TTL but usable | Show with "updating…" indicator |
| `expired` | Too old to display | Hide or show "unavailable" |

---

## 8. File Structure

```
src/intelligence/
  read-models/
    types/
      intelligence-read-models.types.ts   ← typed contracts
    index.ts                              ← barrel export
```

---

## 9. Validation Checklist

- [ ] All 5 read model types defined with identity + metadata fields
- [ ] No scoring formulas in type definitions
- [ ] No recommendation logic in type definitions
- [ ] Source-of-truth vs derived-output documented
- [ ] Read and write boundaries documented
- [ ] Future handler mapping documented
- [ ] Freshness metadata included in every snapshot type
