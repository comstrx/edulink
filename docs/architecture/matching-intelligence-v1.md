# Matching Intelligence v1 — Architecture Note

> **Phase 4.6** | Status: Live | Date: 2026-03-12

## Purpose

Matching Intelligence v1 provides a **rule-based compatibility score** (0–100) between a teacher profile and a job's requirements. It improves talent discovery and applicant evaluation without introducing AI or external services.

## Design Principles

- **Deterministic**: Same inputs always produce the same score
- **Transparent**: Score breakdown shows exactly why a score is high or low
- **Non-invasive**: Matching never blocks search, applications, or hiring workflows
- **Read-only**: Scores are computed on-the-fly; no derived data stored in transactional tables

## Scoring Factors (Weights)

| Factor | Weight | Logic |
|---|---|---|
| Subjects | 20% | Overlap ratio of teacher subjects vs job requirements |
| Curriculums | 15% | Overlap ratio of teacher curriculums vs job requirements |
| Grade Bands | 10% | Overlap ratio |
| Location | 10% | City match (full), country match (partial), or miss |
| Employment Type | 10% | Overlap ratio |
| Work Arrangement | 10% | Overlap ratio |
| Languages | 10% | Overlap ratio |
| Visa Status | 5% | Exact match against accepted statuses |
| Certifications | 5% | Overlap ratio |
| Experience | 5% | Meets minimum requirement |

Total = 100 points. If a job doesn't specify a requirement, the teacher gets full credit for that dimension.

## Integration Points

### Talent Search
- School users can select a job to "match against" from a dropdown
- When active, all results display a Match Score badge with tooltip breakdown
- Results are re-ranked client-side by match score (highest first)
- Matching influences ranking, not filtering — all results remain visible

### Applicant List
- Match scores are displayed via the `ApplicantIntelligenceRow` component
- Scores come from pre-computed intelligence snapshots (read-model layer)
- Scores are informational only — they do not auto-reject or auto-advance candidates

## What Matching Does NOT Do

- Does not replace hiring decisions
- Does not auto-filter candidates
- Does not trigger workflow automation
- Does not use AI or machine learning
- Does not store scores in transactional tables

## Future Evolution

Future versions may incorporate:
- AI-assisted matching with semantic understanding
- Training completion signals
- Trust/verification weighting
- Batch matching for recommendation systems

V1 remains deterministic and rule-based as the foundation.
