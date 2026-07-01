# CRI Engine v1 — Architecture

> **Status:** Live (Phase 4D)  
> **Date:** 2026-03-11  
> **Type:** Architecture & implementation

---

## 1. Purpose

The CRI (Career Readiness Index) Engine v1 computes a teacher-facing readiness score using deterministic, rule-based logic. It evaluates **profile completeness, training progress, credential verification, and hiring signals** to produce a 0–100 score with a band classification.

CRI is a **coaching metric** — it tells teachers "how ready you are" and "what to improve", as opposed to the school-facing Match Score which evaluates fit for ranking.

---

## 2. Layer Separation

```
Intent (Smart Glue)
  ↓ intent.cri_refresh_requested
Handler (src/intelligence/handlers/cri/cri-refresh.handler.ts)
  ↓ thin delegation
Service (src/intelligence/cri/services/cri-refresh.service.ts)
  ↓ assembleCriInput(teacherId)
Data Loader (src/intelligence/cri/engine/cri-data-loader.ts)
  ↓ parallel Supabase reads
Input Normalizer (src/intelligence/cri/engine/cri-engine.inputs.ts)
  ↓ CriEngineInput
Engine (src/intelligence/cri/engine/cri-engine.ts)
  ↓ pure computation → CriEngineResult
Writer (src/intelligence/cri/writers/cri-snapshot-writer.ts)
  ↓ mark-stale + insert
Snapshot Table (intelligence_cri_snapshots)
```

| Layer | Responsibility | DB Access |
|---|---|---|
| **Handler** | Receives intent, delegates to service | None |
| **Service** | Coordinates: load → assemble → compute → write | Orchestration only |
| **Data Loader** | Parallel reads from domain tables | Read only |
| **Input Normalizer** | Derives boolean/numeric signals from raw data | None (pure) |
| **Engine** | Pure scoring: `CriEngineInput → CriEngineResult` | **None** |
| **Writer** | Persists result to snapshot table | Write only |

> **Key constraint:** The engine is a **pure function** — no database access, no side-effects, deterministic for identical inputs.

---

## 3. Component Weights (v1)

| Component | Weight | Source Domain |
|---|---|---|
| Profile Completeness | 35 | Identity |
| Training & Development | 25 | Training |
| Credential Verification | 25 | Trust |
| Hiring Signals | 15 | Hiring |

Weights are centralized in `cri-engine.rules.ts` and sum to 100.

---

## 4. Band Classification

| Band | Score Range | Meaning |
|---|---|---|
| **Highly Ready** | 80–100 | Strong candidate, few gaps |
| **Strong** | 60–79 | Good foundation, minor improvements |
| **Emerging** | 40–59 | Needs development in multiple areas |
| **Not Ready** | 0–39 | Significant gaps across dimensions |

---

## 5. Scoring Rules Summary

### Profile (0–100 raw → weighted to 35)
- Boolean signals: headline (10), bio (15), subjects (15), curriculum (10), experience (15), education (15), languages (10)
- Completeness bonus: up to 10 points from profileCompletenessScore

### Training (0–100 raw → weighted to 25)
- Tiered by course count: 10+ courses = 100, 7+ = 85, 5+ = 70, 3+ = 55, 1+ = 35
- Recency bonus: up to 15 points for recent completions
- Pathway bonus: up to 15 points for completed pathways

### Verification (0–100 raw → weighted to 25)
- Additive per verification type: identity (30), education (25), experience (20), credential (25)

### Hiring Signals (0–100 raw → weighted to 15)
- **No history baseline: 50** (new teachers are not penalized)
- Application activity: up to 10 points
- Shortlist bonus: up to 24 points
- Interview bonus: up to 20 points
- Rejection penalty: max 15 points (soft)

---

## 6. Explainability

Every CRI result includes:
- `breakdownSummary` — human-readable one-liner
- `componentScores` — per-component weighted scores with met/not-met flags
- `reasonCodes` — machine-readable codes with polarity (positive/negative)

Example reason codes:
- `strong_profile_foundation`, `profile_incomplete`
- `strong_training_signal`, `no_training_completed`
- `verified_identity_present`, `no_verified_credentials`
- `no_hiring_signal_yet`, `shortlisted_by_schools`

---

## 7. Snapshot Persistence

The writer maps `CriEngineResult` to `intelligence_cri_snapshots`:

| Engine Field | DB Column |
|---|---|
| `teacherId` | `teacher_id` |
| `criScore` | `score` |
| `componentScores` | `dimensions` (JSONB) |
| — | `gap_term_ids` (derived from reason codes) |
| `computedAt` | `computed_at` |
| — | `staleness` = "fresh" |
| — | `engine_version` = "cri-engine-v1" |

General (non-job-specific) CRI uses sentinel `job_id = 00000000-0000-0000-0000-000000000000`.

---

## 8. Known Limitations (v1)

1. **No job-scoped CRI** — Engine v1 computes general readiness only; the Phase 3B `computeCRI()` with job alignment is preserved separately
2. **No pathway/relevant training** — Only total course count is reliably available; pathway and relevance signals are optional
3. **Trust signals depend on verified-state snapshots** — If no snapshot exists, all trust signals default to false
4. **Client-side RLS** — Snapshot writes require appropriate RLS policies; production should use service-role
5. **Hiring status mapping** — Only "shortlisted", "rejected", and "interview" statuses are recognized

---

## 9. File Map

```
src/intelligence/cri/
  index.ts                              — Public API re-exports
  engine/
    cri-engine.types.ts                 — Input/output type contracts
    cri-engine.ts                       — Pure engine function (scoring)
    cri-engine.rules.ts                 — Weights, thresholds, constants
    cri-engine.inputs.ts                — Signal normalization (pure + async)
    cri-data-loader.ts                  — Parallel Supabase reads
  services/
    cri-refresh.service.ts              — Pipeline orchestration
  writers/
    cri-snapshot-writer.ts              — Snapshot persistence

src/intelligence/handlers/cri/
    cri-refresh.handler.ts              — Intent handler (thin delegation)
```

---

## 10. Relationship to Phase 3B Handler

The Phase 3B handler infrastructure (`src/intelligence/handlers/cri/`) previously contained its own data loader, compute engine, and writer. As of Phase 4D, the handler now delegates entirely to the CRI Engine v1 pipeline (`src/intelligence/cri/`). The old `cri-compute.ts` and `cri-data-loader.ts` in the handlers directory are preserved for backward compatibility but are no longer called by the handler.
