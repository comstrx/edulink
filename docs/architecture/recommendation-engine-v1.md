# Recommendation Engine v1 — Architecture

**Status**: Live (Phase 7D)
**Domain**: Intelligence
**Location**: `src/intelligence/recommendations/`

---

## Purpose

The Recommendation Engine generates actionable, teacher-centric recommendations by synthesising signals from multiple intelligence read models (CRI, Gaps, Match, Trust) against the available training catalog and profile state.

Unlike other intelligence engines that analyse a single dimension, recommendations are a **cross-cutting synthesis layer** — they consume the outputs of CRI, Gap, and Match engines to produce prioritised next-best-actions for a teacher.

---

## How It Differs From Other Engines

| Engine | Question Answered |
|--------|-------------------|
| **CRI** | "How career-ready is this teacher overall?" |
| **Match** | "How well does this teacher fit a specific job?" |
| **Gap** | "What is this teacher missing?" |
| **Recommendation** | "What should this teacher do next to improve?" |

Recommendations consume gap and CRI outputs as **input signals**, not as competing logic.

---

## Live Pipeline Flow

```
intent.training_recommendation_requested
  → RecommendationGenerationHandler (thin — delegates only)
    → RecommendationRefreshService (orchestrator)
      → buildRecommendationEngineInput (data loader + normalizer)
        reads: CRI snapshot, Gap snapshot, Match snapshots,
               Verified state, Teacher profile, Training catalog
      → runRecommendationEngine (pure computation)
        generates: profile, trust, gap-driven, match-pattern, CRI actions
        deduplicates, prioritizes, caps at 12
      → writeRecommendationSnapshot (persistence only)
        marks stale → inserts fresh snapshot
```

### Separation of Concerns

| Layer | Responsibility | DB Access |
|-------|---------------|-----------|
| **Handler** | Receive intent, delegate to service | None |
| **Service** | Orchestrate input→engine→writer | Indirect (via loader/writer) |
| **Input Builder** | Read snapshots, normalize signals | Read-only |
| **Engine** | Compute recommendations deterministically | None |
| **Writer** | Persist snapshot | Write-only |

---

## Input Contract (`RecommendationEngineInput`)

| Signal Group | Sources |
|-------------|---------|
| `criSignals` | CRI snapshot (score, band, components, reasons) |
| `gapSignals` | Gap snapshot (items, priorities, grouped summary) |
| `matchSignals` | Recent match snapshots (scores, bands, gap patterns) |
| `trustSignals` | Verified state snapshot |
| `profileSignals` | Teacher profile (completeness, mappings) |
| `trainingCatalogSignals` | Training items catalog (courses, pathways, cert prep) |
| `metadata` | Trigger event, timestamp, freshness hints |

---

## Output Contract (`RecommendationEngineResult`)

| Field | Description |
|-------|-------------|
| `recommendations` | Array of `RecommendationItem` (max 12) |
| `topRecommendationIds` | Priority-sorted top 5 IDs |
| `groupedRecommendationSummary` | Count + highest priority per group |
| `reasonCodes` | Machine-readable explanation codes |
| `freshness` | `fresh` / `stale` / `expired` |

### RecommendationItem

| Field | Description |
|-------|-------------|
| `recommendationId` | Unique ID |
| `recommendationType` | e.g. `course_recommendation`, `verification_action` |
| `targetId` | Optional ID of the recommended item |
| `priority` | `critical` / `high` / `medium` / `low` |
| `confidence` | `high` / `medium` / `low` |
| `reasonCodes` | Why this was recommended |
| `relatedGapIds` | Gap items this addresses |
| `relatedTaxonomyTermIds` | Taxonomy terms involved |
| `actionLabelKey` | i18n key for the action label |
| `groupKey` | Grouping category |

---

## Recommendation Types

| Type | Description |
|------|-------------|
| `course_recommendation` | Enroll in a course to address a gap |
| `pathway_recommendation` | Start a learning pathway |
| `certification_recommendation` | Pursue a missing certification |
| `profile_completion_action` | Fill missing profile fields |
| `verification_action` | Verify a credential |
| `curriculum_alignment_action` | Add curriculum mappings |
| `language_improvement_action` | Improve language proficiency |
| `experience_building_action` | Gain additional experience |

---

## Grouping Model

| Group Key | Contains |
|-----------|----------|
| `immediate_actions` | Critical priority items |
| `profile_actions` | Profile completion recommendations |
| `trust_actions` | Verification recommendations |
| `training_actions` | Course + pathway + language items |
| `certification_actions` | Certification recommendations |
| `curriculum_alignment_actions` | Curriculum mapping items |
| `career_readiness_actions` | Experience + general readiness |

---

## Evidence & Actionability

- Every recommendation links to `relatedGapIds` and `reasonCodes`
- Foundational blockers (profile/trust) outrank content recommendations when severe
- Deduplication prevents duplicate actions targeting the same item/gap
- Unavailable catalog items are not recommended (only mapped offerings are targeted)
- Reason codes are machine-readable and stable across versions

---

## Snapshot Persistence

- Table: `intelligence_recommendation_snapshots`
- Writer marks existing `fresh` snapshots as `stale` before inserting
- JSONB `recommendations` column stores full engine output
- `total_count`, `staleness`, `engine_version`, `computed_at` are top-level columns
- RLS: teachers can read/write own snapshots, admins can manage all

---

## Known v1 Limitations

- No ML or collaborative filtering
- No deduplication against already-completed actions
- No cost/effort estimation per recommendation
- Match-pattern recommendations only trigger for terms appearing in 2+ snapshots
- CRI-driven actions only trigger for scores < 60
- Maximum 12 recommendations per refresh
- No pathway-specific recommendations yet (only courses + cert prep)
