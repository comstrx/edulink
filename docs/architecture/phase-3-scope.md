# Phase 3 — Career Readiness Index (CRI) Scope

> **Status:** Approved  
> **Date:** 2026-03-11  
> **Type:** Architecture guardrails & scope definition

---

## 1. Purpose

Phase 3 wires the **Career Readiness Index (CRI)** — a teacher-facing readiness score — using the existing rule-based matching engine. No AI, no new infrastructure.

---

## 2. What's IN Scope (MVP)

| # | Deliverable | Layer |
|---|---|---|
| 1 | `computeCRI()` function that reuses `matchTeacherToJob` | Rule Layer |
| 2 | CRI score displayed on Job Details (CareerReadinessIndicator) | UI |
| 3 | CRI breakdown by dimension (skills, location, experience…) | UI |
| 4 | Missing-requirements list derived from `unmatchedTermIds` | UI |
| 5 | "CRI Boost" labels on training courses (static mapping) | UI |
| 6 | Gap-to-training linking (unmatched term → recommended course) | Rule Layer |

## 3. What's OUT of Scope

| Item | Why excluded |
|---|---|
| AI-based scoring or embeddings | Intelligence Layer, not Rule Layer |
| Persisting CRI scores to database | No DB writes in Phase 3 |
| `intelligence.match_score.computed` event emission | Deferred to Phase 4+ |
| `intelligence.skill_gap.detected` event emission | Deferred to Phase 4+ |
| Smart Glue cross-domain rules | Separate workstream (Step C) |
| School-side candidate ranking by CRI | Requires Intelligence Layer |
| CRI historical tracking / trends | Requires persistence |

---

## 4. CRI vs Match Score — Critical Distinction

| | **CRI (Career Readiness Index)** | **Match Score** |
|---|---|---|
| **Question answered** | "How ready is this teacher for this job?" | "How well does this teacher fit this job's requirements?" |
| **Perspective** | Teacher-facing (self-improvement) | School-facing (hiring decisions) |
| **Audience** | Teacher sees their own CRI | School sees match scores for candidates |
| **Tone** | Coaching: "here's what to improve" | Evaluation: "here's how they rank" |
| **Domain** | Orchestration (Rule Layer) | Intelligence (future) |
| **Data source (Phase 3)** | `matchTeacherToJob()` — same engine | `matchTeacherToJob()` — same engine |
| **Presentation** | Breakdown + gaps + training recommendations | Numeric badge + rank order |
| **Persistence** | None (computed on-the-fly) | Future: cached in DB |

> **Key rule:** CRI = readiness (coaching). Match Score = fit (evaluation).  
> They use the same engine today but serve different audiences and will diverge.

---

## 5. Rule Layer vs Intelligence Layer

| | **Rule Layer** (Phase 3) | **Intelligence Layer** (Phase 4+) |
|---|---|---|
| **Logic** | Deterministic taxonomy-ID overlap | ML/AI scoring, embeddings, signals |
| **Code location** | `src/lib/matching.ts` | Future: edge functions / external API |
| **Inputs** | Taxonomy UUIDs + numeric fields only | Free text, behavioral signals, history |
| **Output** | `MatchResult` with breakdown | `MatchScoreComputedPayload` event |
| **Transparency** | 100% explainable dimension-by-dimension | May include opaque model scores |
| **Events emitted** | None (pure function) | `intelligence.match_score.computed`, `intelligence.skill_gap.detected` |
| **DB writes** | None | Persists scores + gaps |

> **Guardrail:** Phase 3 MUST NOT emit Intelligence domain events or write to the database. It is a pure computation layer.

---

## 6. Readiness vs Fit — Glossary

| Term | Definition | Used by |
|---|---|---|
| **Readiness** | How prepared a teacher is for a specific role, with actionable improvement paths | CRI, CareerReadinessIndicator |
| **Fit** | How well a candidate matches a job's hard requirements for ranking/filtering | Match Score, TalentSearch |
| **Gap** | A specific unmatched requirement (term ID) between teacher and job | Both (different framing) |
| **Boost** | Projected CRI increase from completing a training item | CRI only |

---

## 7. Architecture Boundary Diagram

```
┌─────────────────────────────────────────────┐
│  UI Layer                                   │
│  ├─ CareerReadinessIndicator (teacher)      │
│  └─ MatchScoreBadge (school)                │
├─────────────────────────────────────────────┤
│  Rule Layer (Phase 3) ← WE ARE HERE        │
│  ├─ matchTeacherToJob()                     │
│  ├─ computeCRI()          ← new             │
│  └─ getTopReasons()                         │
├─────────────────────────────────────────────┤
│  Intelligence Layer (Phase 4+)              │
│  ├─ AI scoring                              │
│  ├─ Event emission                          │
│  └─ Score persistence                       │
├─────────────────────────────────────────────┤
│  Domain Events (wired in Step C)            │
│  ├─ intelligence.skill_gap.detected         │
│  └─ intelligence.match_score.computed       │
└─────────────────────────────────────────────┘
```

---

## 8. Validation Checklist

- [ ] `computeCRI()` calls `matchTeacherToJob()` — no duplicate logic
- [ ] No DB writes in any Phase 3 code
- [ ] No Intelligence domain events emitted
- [ ] CRI terminology used only in teacher-facing contexts
- [ ] Match Score terminology used only in school-facing contexts
- [ ] CareerReadinessIndicator consumes CRI, not raw Match Score
