# Career Path System

> **Status:** Approved  
> **Date:** 2026-03-14  
> **Sprint:** 8A — Career Path System  
> **Type:** Domain model, evaluation engine, event pipeline

---

## 1. Purpose

Formalize teacher career progression as a structured system with defined paths, stages, requirements, and deterministic evaluation. Enables the platform to answer: what stage is the teacher at, what comes next, what's blocking, and what actions move them forward.

---

## 2. Architecture

### Pipeline Position

```
Training → Evidence → Credential → CRI → Talent Profile → Career Path → UI
```

The Career Path System sits alongside the Career OS layer and consumes signals from the identity, training, trust, and intelligence domains.

---

## 3. Domain Model

### Tables

| Table | Purpose |
|---|---|
| `career_paths` | Track families (Teaching, Leadership, Coaching) |
| `career_stages` | Ordered stages within a path |
| `career_stage_requirements` | Structured requirements per stage |
| `teacher_career_states` | Evaluated career state snapshot |
| `teacher_career_goals` | Teacher's declared target stage |

### Requirement Types

- `credential` — earned credential matching
- `certification` — teaching certification
- `verified_evidence` — mentor-approved evidence count
- `pathway_completion` — completed professional pathways
- `training_completion` — completed training items
- `competency` — competency term matching
- `trust_verification` — trust verification status
- `experience_years` — years of teaching experience
- `language` — language proficiency

---

## 4. Evaluation Engine

### Stage Requirement Engine (`career-stage-requirement-engine.ts`)

Pure function that evaluates each requirement against `TeacherCareerSignals`:
- Returns `RequirementEvaluation` with satisfied/unsatisfied + explanation
- Handles all 9 requirement types deterministically

### Teacher Career State Evaluator (`teacher-career-state-evaluator.ts`)

Walks stages in order; highest fully-satisfied stage = "current stage":
1. Evaluate all stages against teacher signals
2. Identify current (highest all-mandatory-met) stage
3. Identify next stage
4. Calculate readiness percentage for next stage
5. Generate explainable trace

### Gap Report Generator

Produces `CareerStageGapReport`:
- Current vs target stage
- Unmet/satisfied requirements
- Readiness percent
- Actionable next steps

---

## 5. Event Pipeline

### Trigger Events (via Smart Glue)

| Event | Rule |
|---|---|
| `training.completed` | Refresh career state |
| `training.verified_completion` | Refresh career state |
| `trust.credential_issued` | Refresh career state |
| `training.mentor.review.approved` | Refresh career state |
| `intelligence.talent_profile.updated` | Refresh career state |
| `identity.profile_updated` | Refresh career state |

### Intent

`intent.career_state_refresh_requested`

### Output Event

`career.teacher_stage.updated`

### Handler

`careerStateRefreshHandler` — Load → Evaluate → Persist → Log

---

## 6. Signal Sources

Teacher career signals are assembled from:

| Source | Signal |
|---|---|
| `teacher_profiles.years_of_experience` | Experience years |
| `earned_credentials` | Credential source IDs |
| `teacher_certifications` | Certification term IDs |
| `teacher_languages` | Language term IDs |
| `intelligence_talent_profiles` | Verified completions, training count, verified signals |
| `pathway_executions` | Pathway completion count |
| `mentor_reviews` | Approved evidence count |
| `intelligence_verified_state_snapshots` | Trust verification status |

---

## 7. Integration Points

### Teacher Dashboard
- `CareerPathCard` shows current stage, next stage, readiness, and requirement summary

### School-side
- `teacher_career_states` RLS allows schools to read applicant career states
- Career stage signals available for talent evaluation

### Career OS Layer
- Career path system operates alongside existing Career OS (goals, journey, radar)
- Shares the intelligence signal foundation

---

## 8. Validation Checklist

- [x] 5 domain tables created with RLS
- [x] 3 career paths seeded (Teaching, Leadership, Coaching)
- [x] 11 career stages defined
- [x] Stage requirement engine handles 9 requirement types
- [x] Teacher state evaluator produces explainable traces
- [x] Gap report generator with actionable next steps
- [x] Career state refresh service (Load → Evaluate → Persist)
- [x] 6 Smart Glue rules trigger career state refresh
- [x] Intent handler registered in handler bootstrap
- [x] Event names and contracts updated
- [x] Teacher UI card integrated in dashboard
- [x] School-side RLS for applicant career state access
- [x] No engine imports — only platform signals
- [x] All functions are deterministic and explainable
