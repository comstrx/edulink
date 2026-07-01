# Match Engine v1 — Architecture

> **Status:** Live (Phase 5D — Full Pipeline)  
> **Date:** 2026-03-11  
> **Type:** Architecture & contracts

---

## 1. Purpose

The Match Engine v1 computes a **school-facing fit score** for a teacher–job pair using deterministic, rule-based logic. It evaluates taxonomy overlaps (subjects, curriculums, grade bands, languages, certifications), location compatibility, experience requirements, and trust signals to produce a 0–100 score with a band classification.

**Match Score ≠ CRI.** CRI is a teacher-facing "coaching/readiness" metric. Match Score is a school-facing "fit/evaluation" metric used for ranking candidates against a specific job.

---

## 2. Filters → Matching → Ranking → Recommendations

| Concept | Purpose | Where |
|---|---|---|
| **Filters** | Narrow candidates by hard criteria (location, availability) | UI / query layer |
| **Matching** | Score how well a teacher fits a specific job | Match Engine |
| **Ranking** | Order candidates by match score + trust signals | Consumer of engine output |
| **Recommendations** | Suggest jobs/training based on gaps | Recommendation engine |

The Match Engine is responsible ONLY for matching. It does not filter, rank, or recommend.

---

## 3. Layer Separation

```
Intent (Smart Glue)
  ↓ intent.match_refresh_requested
Handler (src/intelligence/handlers/matching/)
  ↓ thin delegation
Service (src/intelligence/matching/services/match-refresh.service.ts)
  ↓ assembleMatchInput(teacherId, jobId)
Data Loader (future: match-data-loader.ts)
  ↓ parallel Supabase reads
Input Normalizer (match-engine.inputs.ts)
  ↓ MatchEngineInput
Engine (match-engine.ts)
  ↓ pure computation → MatchEngineResult
Writer (match-snapshot-writer.ts)
  ↓ mark-stale + insert
Snapshot Table (intelligence_match_snapshots)
```

| Layer | Responsibility | DB Access |
|---|---|---|
| **Handler** | Receives intent, delegates to service | None |
| **Service** | Coordinates: load → assemble → compute → write | Orchestration only |
| **Engine** | Pure scoring: `MatchEngineInput → MatchEngineResult` | **None** |
| **Writer** | Persists result to snapshot table | Write only |

---

## 4. Input Contract (`MatchEngineInput`)

```typescript
interface MatchEngineInput {
  teacherId: string;
  jobId: string;
  teacherProfile: MatchTeacherProfileSignals;       // subjects, location, experience
  teacherQualifications: MatchTeacherQualificationSignals;  // certs, degrees, skills
  teacherTrust: MatchTeacherTrustSignals;            // verification status
  teacherTraining: MatchTeacherTrainingSignals;      // completed courses/pathways
  jobRequirements: MatchJobRequirementSignals;       // required + preferred signals
  metadata: MatchComputeMetadata;
}
```

All signals are **pre-derived taxonomy IDs and booleans** — the engine never parses raw DB rows.

---

## 5. Output Contract (`MatchEngineResult`)

```typescript
interface MatchEngineResult {
  teacherId: string;
  jobId: string;
  matchScore: number;          // 0–100
  matchBand: MatchBand;        // "weak" | "partial" | "strong" | "high"
  componentScores: MatchComponentScore[];
  eligibility: MatchEligibilityFlags;
  strengths: MatchSignalEntry[];
  gaps: MatchSignalEntry[];
  reasonCodes: MatchReasonCode[];
  computedAt: string;
  freshness: MatchFreshness;
}
```

---

## 6. Band Classification

| Band | Score Range | Meaning |
|---|---|---|
| **High Match** | 80–100 | Excellent fit across most dimensions |
| **Strong Match** | 60–79 | Good fit, minor gaps |
| **Partial Match** | 40–59 | Some alignment, notable gaps |
| **Weak Match** | 0–39 | Poor fit for this role |

---

## 7. Component Weights (v1)

| Component | Weight | Source |
|---|---|---|
| Subjects | 20 | Teacher subjects ↔ Job required subjects |
| Curriculums | 15 | Teacher curriculums ↔ Job required curriculums |
| Grade Bands | 10 | Teacher grade bands ↔ Job grade bands |
| Location | 10 | Teacher location ↔ Job location |
| Employment Type | 10 | Teacher prefs ↔ Job type |
| Work Arrangement | 10 | Teacher prefs ↔ Job arrangement |
| Languages | 10 | Teacher languages ↔ Job languages |
| Visa Status | 5 | Teacher visa ↔ Job visa requirements |
| Certifications | 5 | Teacher certs ↔ Job required certs |
| Experience | 5 | Teacher years ↔ Job min experience |

Weights are centralized in `match-engine.rules.ts` and sum to 100.

---

## 8. Eligibility Flags

Eligibility flags are **separate from score**. They indicate whether hard requirements are satisfied:

```typescript
interface MatchEligibilityFlags {
  hasRequiredSubjectMatch: boolean;
  hasRequiredCurriculumMatch: boolean;
  hasRequiredCertificationMatch: boolean;
  meetsMinimumExperience: boolean;
  locationCompatible: boolean;
  hasRequiredLanguageMatch: boolean;
  hasVerifiedTrustSignals: boolean;
  hardRequirementsMet: number;
  hardRequirementsTotal: number;
}
```

A teacher may score 70/100 (Strong Match) but fail eligibility if they lack a required certification. Consumers decide how to use eligibility flags for filtering vs. display.

---

## 9. File Map

```
src/intelligence/matching/
  index.ts                              — Public API re-exports
  engine/
    match-engine.types.ts               — Input/output type contracts
    match-engine.ts                     — Pure engine function (5C)
    match-engine.rules.ts               — Weights, thresholds, helpers
    match-engine.inputs.ts              — Signal assembly from raw data (5B)
    match-data-loader.ts                — Parallel Supabase reads (5B)
  services/
    match-refresh.service.ts            — Orchestration pipeline (5D)
  writers/
    match-snapshot-writer.ts            — Snapshot persistence (5D)

src/intelligence/handlers/matching/
  match-refresh.handler.ts              — Thin intent handler (5D)
```

---

## 10. Live Flow (Phase 5D)

1. Smart Glue emits `intent.match_refresh_requested`
2. `MatchRefreshHandler` validates teacherId + jobId, delegates to service
3. `refreshMatch()` calls `assembleMatchInput()` (loads 9 parallel queries)
4. `runMatchEngine(input)` computes score, band, eligibility, strengths, gaps, reason codes
5. `writeMatchSnapshot(result)` marks stale, inserts fresh row
6. UI reads snapshot via read-model selectors

---

## 11. Handler / Service / Engine / Writer Separation

| Layer | Responsibility | DB Access |
|---|---|---|
| **Handler** | Receives intent, validates IDs, delegates | None |
| **Service** | Coordinates: load → assemble → compute → write | Orchestration only |
| **Engine** | Pure scoring: `MatchEngineInput → MatchEngineResult` | **None** |
| **Writer** | mark-stale + insert to `intelligence_match_snapshots` | Write only |

---

## 12. Snapshot Write Responsibilities

The writer:
- Maps `MatchEngineResult` to the DB row (score, confidence, dimensions, matched/unmatched term IDs)
- Derives confidence from eligibility ratio (not from the engine)
- Never computes scores or infers missing data
- Uses mark-stale-then-insert pattern for freshness

---

## 13. Relationship to Existing Matching

The existing `src/lib/matching.ts` (`matchTeacherToJob`) remains for CRI Phase 3B job alignment scoring. The Match Engine v1 supersedes it for school-facing matching with richer signals (trust, training, eligibility, structured reason codes).

---

## 14. Known Limitations (v1)

- Training relevance is limited to course count; no per-course taxonomy matching yet
- Trust signals are boolean flags, not weighted by recency
- No preferred signal boosting beyond skill requirements
- Confidence derivation is simple (eligibility-based), not ML-calibrated
- Batch matching (all teachers × all jobs) not yet supported
