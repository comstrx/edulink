# Smart Glue Rules Layer — Architecture

> **Phase:** 3A  
> **Status:** Approved  
> **Date:** 2026-03-11

---

## 1. Purpose

The Smart Glue layer is a **routing-only** orchestration layer that listens to domain events and emits **intent signals**. It decides *what* should happen but never *how*.

**Key constraint:** Rules contain zero scoring/computation logic.

---

## 2. Architecture

```
Domain Event (trigger)
       │
       ▼
┌─────────────────────┐
│  Smart Glue Rule    │
│  ┌───────────────┐  │
│  │ condition()   │──── optional filter (e.g. status === "rejected")
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ emitIntents() │──── produces 1..N intent signals
│  └───────────────┘  │
└─────────────────────┘
       │
       ▼
Intent Event (output)
```

---

## 3. Trigger → Intent Mapping

### Hiring Domain

| Trigger | Condition | Intents Emitted |
|---|---|---|
| `hiring.job_applied` | — | `intent.cri_refresh_requested` + `intent.skill_gap_refresh_requested` + `intent.match_refresh_requested` + `intent.reputation_refresh_requested` |
| `hiring.application_rejected` | — | `intent.skill_gap_refresh_requested` + `intent.training_recommendation_requested` + (conditional: `intent.cri_refresh_requested` if ≥3 gaps) + (conditional: `intent.growth_recommendation_refresh_requested` if no existing recs) |
| `hiring.application.status_changed` | `newStatus === "withdrawn"` | `intent.cri_refresh_requested` |
| `hiring.job_published` | — | `intent.match_refresh_requested` |

### Training Domain

| Trigger | Condition | Intents Emitted |
|---|---|---|
| `training.completed` | — | `intent.cri_refresh_requested` + `intent.skill_gap_refresh_requested` + `intent.training_recommendation_requested` |

### Trust Domain

| Trigger | Condition | Intents Emitted |
|---|---|---|
| `trust.verification_completed` | `status === "approved"` | `intent.verified_state_refresh_requested` + `intent.cri_refresh_requested` |
| `trust.credential_issued` | — | `intent.cri_refresh_requested` |

### Identity Domain

| Trigger | Condition | Intents Emitted |
|---|---|---|
| `identity.profile_updated` | `profileType === "teacher"` | `intent.cri_refresh_requested` + `intent.match_refresh_requested` |

---

## 4. Intent Definitions

| Intent | Meaning | Executor (Phase 3B+) |
|---|---|---|
| `intent.cri_refresh_requested` | Recompute CRI for a teacher (optionally scoped to a job) | `computeCRI()` |
| `intent.match_refresh_requested` | Recompute match scores (teacher×job or all teachers×job) | `matchTeacherToJob()` |
| `intent.skill_gap_refresh_requested` | Run gap analysis for a teacher | Gap detector (future) |
| `intent.training_recommendation_requested` | Generate training recommendations based on gaps | Recommender (future) |
| `intent.verified_state_refresh_requested` | Update profile verified badges/flags | Profile updater (future) |

---

## 5. File Structure

```
src/smart-glue/
├── types.ts              # GlueRule, IntentEmission interfaces
├── rule-registry.ts      # Central registry with getAllRules(), getRulesForEvent()
└── rules/
    ├── hiring-rules.ts   # 4 rules
    ├── training-rules.ts # 1 rule
    ├── trust-rules.ts    # 2 rules
    └── identity-rules.ts # 1 rule
```

---

## 6. Guardrails

- ✅ Rules only route — no scoring, no DB writes, no side effects
- ✅ No direct import between Hiring ↔ Training ↔ Trust internals
- ✅ Rules reference only `EVENT_NAMES` constants — no magic strings
- ✅ All intents carry `triggeredBy` for traceability
- ✅ Conditional rules use `condition()` — not buried in `emitIntents()`
- ✅ Intelligence-aware rules use `resolveContext()` for async reads (Sprint 9)
- ✅ Context resolution is fault-tolerant — rules degrade gracefully
- ❌ Rules do NOT persist anything

---

## 7. Sprint 9: Intelligence-Aware Rules

Rules can optionally define `resolveContext()` — an async function that reads
intelligence snapshots before `emitIntents()` decides what to emit.

```
Domain Event → resolveContext() → intelligence snapshot reads → emitIntents(event, context) → targeted intents
```

**First activation:** `hiring.application_rejected`
- Reads: gap snapshot, recommendation snapshot, CRI snapshot
- Decisions:
  - ≥3 existing gaps → also refresh CRI (systemic readiness issue)
  - No existing recommendations → add growth recommendation refresh
- Fallback: if context read fails, emits baseline intents (gaps + recommendations)


---

## 7. Validation Checklist

- [x] Every approved trigger event has at least one rule
- [x] No scoring logic inside any rule
- [x] No cross-domain internal imports (only contracts)
- [x] All rules registered in `rule-registry.ts`
- [x] Intent payloads match `intent.contracts.ts` shapes
- [ ] Executor wiring (Phase 3B — deferred)
