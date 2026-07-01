# Gap Engine v1 — Architecture

> **Status:** Pipeline Live (Phase 6D)  
> **Date:** 2026-03-11  
> **Type:** Architecture & contracts

---

## 1. Purpose

The Gap Engine v1 identifies **professional gaps** that reduce a teacher's employability. Unlike CRI (teacher-facing readiness) or Match Score (school-facing fit), Gaps are actionable deficiencies that can be addressed through profile completion, training, or credential acquisition.

---

## 2. Gaps vs. CRI vs. Matching vs. Recommendations

| Concept | Purpose | Scope |
|---|---|---|
| **CRI** | Teacher readiness coaching score | Teacher-facing, per-job |
| **Match Score** | School-facing fit evaluation | Teacher×Job pair |
| **Gaps** | Actionable deficiencies to address | Teacher-centric |
| **Recommendations** | Suggested actions to close gaps | Derived from gaps |

The Gap Engine feeds into the Recommendation Engine — gaps are the "why", recommendations are the "what to do."

---

## 3. Gap Categories (v1)

| Category | Description |
|---|---|
| `profile_gap` | Missing profile fields (bio, photo, location) |
| `certification_gap` | Missing required certifications |
| `curriculum_gap` | Missing curriculum experience |
| `grade_band_gap` | Missing grade band coverage |
| `language_gap` | Missing language proficiency |
| `verification_gap` | Unverified credentials |
| `training_gap` | Insufficient training completion |
| `experience_gap` | Insufficient years of experience |
| `trust_gap` | Missing trust/verification signals |
| `employability_signal_gap` | Composite employability signals |

---

## 4. Layer Separation

```
Intent (Smart Glue)
  ↓ intent.skill_gap_refresh_requested
Handler (src/intelligence/handlers/gaps/)
  ↓ thin delegation
Service (src/intelligence/gaps/services/gap-refresh.service.ts)
  ↓ assembleGapInput(teacherId)
Input Builder (gap-engine.inputs.ts)
  ↓ reads from profiles, match snapshots, etc.
Engine (gap-engine.ts)
  ↓ pure computation → GapEngineResult
Writer (gap-snapshot-writer.ts)
  ↓ mark-stale + insert
Snapshot Table (intelligence_gap_snapshots)
```

| Layer | Responsibility | DB Access |
|---|---|---|
| **Handler** | Receives intent, delegates to service | None |
| **Service** | Coordinates: load → assemble → compute → write | Orchestration only |
| **Engine** | Pure gap detection: `GapEngineInput → GapEngineResult` | **None** |
| **Writer** | Persists result to snapshot table | Write only |

---

## 5. Input Contract (`GapEngineInput`)

```typescript
interface GapEngineInput {
  teacherId: string;
  profileGapSignals: GapProfileSignals;
  qualificationGapSignals: GapQualificationSignals;
  trustGapSignals: GapTrustSignals;
  trainingGapSignals: GapTrainingSignals;
  hiringGapSignals: GapHiringSignals;
  matchGapSignals: GapMatchSignals;
  metadata: GapComputeMetadata;
}
```

Signals are pre-derived booleans and ID arrays — the engine never parses raw DB rows.

---

## 6. Output Contract (`GapEngineResult`)

```typescript
interface GapEngineResult {
  teacherId: string;
  gapItems: GapItem[];
  totalGaps: number;
  priorityGapIds: string[];
  groupedGapSummary: GapGroupSummary[];
  reasonCodes: GapReasonCode[];
  computedAt: string;
  freshness: GapFreshness;
}
```

Each `GapItem` includes:
- `gapId`, `gapType` (category), `taxonomyTermId`
- `severity` (critical/high/medium/low)
- `confidence` (high/medium/low)
- `evidenceSources` (where this gap was detected)
- Optional `relatedJobId` and `relatedSignals`

---

## 7. File Map

```
src/intelligence/gaps/
  index.ts                              — Public API re-exports
  engine/
    gap-engine.types.ts                 — Input/output type contracts
    gap-engine.ts                       — Pure engine function
    gap-engine.rules.ts                 — Severity, confidence, priority rules
    gap-engine.inputs.ts                — Signal assembly
  services/
    gap-refresh.service.ts              — Orchestration pipeline
  writers/
    gap-snapshot-writer.ts              — Snapshot persistence
```

---

## 8. Computation Model (Phase 6C)

### Inference Rules
The engine uses **rule-based inference** (no ML) across 9 detectors:
- Profile, Certification, Curriculum, Grade Band, Language, Trust/Verification, Training, Experience, Employability

### Severity Resolution
- Base severity from gap category defaults
- Elevated when evidence includes `match_result` or `job_requirement` sources
- Repeated evidence (3+) bumps medium → high

### Confidence Resolution
- Based on evidence source count: 1 = low, 2 = medium, 3+ = high

### Priority Ordering
Composite score: `severity × 10 + confidence × 3 + foundational_boost`

### Policy Constraints
- **No hiring history** → zero employability gaps (no false positives)
- **Single rejection** → low-confidence weak signal only
- **Repeated aligned evidence** → raised confidence/severity
- **Trust gaps** remain distinct from qualification gaps
- **Missing profile data** creates foundational gaps regardless of hiring activity

---

## 9. Live Flow (Phase 6D)

```
intent.skill_gap_refresh_requested
  → GapRefreshHandler (thin — delegates only)
  → GapRefreshService.refreshGaps()
    → assembleGapInput(teacherId) — loads + normalizes
    → runGapEngine(input) — pure computation
    → writeGapSnapshot(result, jobId) — mark-stale + insert
  → HandlerResult { outputsWritten: ["intelligence_gap_snapshots"] }
```

### Snapshot Writer Responsibilities
- Maps `GapEngineResult` → DB row (teacher_id, total_gaps, gaps JSON, staleness, engine_version)
- Mark-stale-then-insert pattern scoped by teacher_id + job_id
- **Never** computes severity, confidence, or gap items
- **Never** fetches domain data

### Handler Responsibilities
- Receives intent payload (teacherId, jobId, triggeredBy)
- Delegates entirely to `refreshGaps()` service
- Returns structured `HandlerResult`

---

## 10. Known Limitations (v1)

- No ML-based inference; purely rule-based
- Rejection reason IDs not yet stored as taxonomy terms
- Training pathway completion not yet tracked
- Match-derived gaps depend on existing match snapshots
- Gap counter resets per engine invocation (IDs are local, not globally unique)
- Writer requires authenticated user for RLS-protected inserts

---

## 11. Relationship to Existing Gap Detection

The existing `src/intelligence/handlers/gaps/gap-detect.ts` (`detectGaps`) is a Phase 3D implementation using flat `GapEntry` types. The Gap Engine v1 supersedes it with richer signals (severity, confidence, evidence sources, match-derived gaps) while maintaining the same profile-analysis and job-requirement gap detection patterns. The `gapRefreshHandler` in `src/intelligence/handlers/gaps/gap-refresh.handler.ts` now uses the v1 engine pipeline.
