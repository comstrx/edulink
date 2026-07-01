# Phase 5 — Assessment & CRI Modeling Decision Note

> **Status**: FROZEN | **Date**: 2026-03-13 | **Sprint**: P5

---

## Purpose

Freeze architectural boundaries for Assessment and CRI fields before Phase 5 field execution. This decision prevents mixing content metadata, user state, and intelligence output inside the training catalog.

---

## 1. `micro_assessment` — Content Metadata

**Decision**: `micro_assessment` is a boolean flag on `training_items` indicating the item includes a micro assessment component.

It does **NOT** represent: assessment attempts, scores, pass/fail, or number of attempts. Those belong to a separate user-level assessment state system (deferred).

```sql
micro_assessment boolean NOT NULL DEFAULT false
```

---

## 2. `cri_boost_value` — Content Metadata

**Decision**: `cri_boost_value` is fixed item metadata describing the **potential** CRI contribution weight of completing the item.

It does **NOT** represent: user CRI score, CRI delta, or CRI result applied to the user. The CRI engine calculates actual scores based on completion events, metadata weights, and other intelligence signals.

```sql
cri_boost_value smallint NULL
```

---

## 3. `cri_target` — Pathway Metadata

**Decision**: `cri_target` is pathway metadata only. It defines the target CRI readiness level a pathway aims to achieve. Individual courses do not define readiness targets.

```sql
cri_target smallint NULL
```

**Usage rule**: Only meaningful when `training_items.type = 'pathway'`. Whether the user reached the target is determined by comparing `intelligence_cri_snapshots.score` vs `cri_target`.

---

## 4. Prohibited in Catalog

The following must **never** be stored in `training_items`:

- Assessment attempts
- Assessment scores
- Pass/fail state
- User CRI score
- CRI delta
- Credential issuance state

### Layer Responsibility

| Layer | Responsibility |
|---|---|
| Catalog (`training_items`) | Content metadata |
| Completion (`training_completions`) | User completion events |
| Assessment (deferred) | Attempts, scores, pass/fail |
| Intelligence (`intelligence_*_snapshots`) | CRI score calculation |
| Credentials (`earned_credentials`) | Issued badges/certificates |

---

## 5. Phase 5 Field Execution Summary

### Safe to implement now

| Field | Table | Purpose |
|---|---|---|
| `micro_assessment` | `training_items` | Indicates item includes micro assessment |
| `cri_boost_value` | `training_items` | Potential CRI contribution weight |
| `cri_target` | `training_items` | Pathway CRI target |

### Deferred to later phases

- Assessment attempts system
- Assessment scoring
- Pass/fail logic
- CRI engine v2 weighting
- Pathway target tracking

---

## 6. Non-Duplication Rules

- `micro_assessment = true` ≠ user passed; a separate attempt record is required
- `cri_boost_value` on item ≠ user CRI score; engine derives actual impact
- `cri_target` on pathway ≠ user achievement; compare against `intelligence_cri_snapshots.score`
- `training_completions` records events; `intelligence_*_snapshots` records derived state
- Catalog describes eligibility and potential; tracking tables capture actual progress

---

## 7. Canonical Data Flow

```
Content Metadata (training_items)
        ↓
User Completion (training_completions)
        ↓
Assessment Result (deferred: assessment_attempts)
        ↓
CRI Intelligence Engine (cri-engine)
        ↓
User CRI Score (intelligence_cri_snapshots)
```

**Catalog must never store user results or intelligence outputs.**
