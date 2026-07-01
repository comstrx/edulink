/**
 * Growth Domain — Canonical Contract
 * Sprint 2 Step 2: Formalizes Growth as an independent intelligence domain.
 *
 * ═══════════════════════════════════════════════════════════════
 * WHAT IS GROWTH?
 * ═══════════════════════════════════════════════════════════════
 *
 * Growth is a **feedback-driven intervention domain** that converts
 * hiring outcomes, gap signals, and training progress into
 * actionable professional development recommendations.
 *
 * Growth answers: "What should this teacher do NEXT to improve?"
 *
 * ═══════════════════════════════════════════════════════════════
 * HOW GROWTH DIFFERS FROM OTHER DOMAINS
 * ═══════════════════════════════════════════════════════════════
 *
 * │ Domain          │ Question Answered                        │
 * │─────────────────│──────────────────────────────────────────│
 * │ Recommendations │ "What training matches this gap?"        │
 * │ Readiness       │ "Is this teacher ready for hiring?"      │
 * │ Career State    │ "Where is this teacher on their path?"   │
 * │ **Growth**      │ "What should the teacher do NEXT?"       │
 *
 * - Recommendations = gap→training matching (catalog-aware)
 * - Readiness = aggregate hiring signal (boolean/level)
 * - Career State = stage on career path (positional)
 * - **Growth** = actionable intervention (prescriptive, state-aware)
 *
 * Growth is the ONLY domain that:
 *   1. Reads hiring rejection reasons as causal input
 *   2. Checks teacher runtime state before recommending
 *   3. Produces state-aware actions (not just "enroll X")
 *   4. Manages recommendation lifecycle (active→completed→stale)
 *
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL INPUTS (upstream signals Growth depends on)
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. Hiring Signals (hiring_signals table)
 *    - rejection reasons (term IDs + slugs from metadata)
 *    - → mapped via hiring-growth-mapper.ts
 *
 * 2. Gap Snapshots (intelligence_gap_snapshots)
 *    - gap term IDs from latest fresh snapshot
 *    - → used as secondary competency gap signals
 *
 * 3. Match Snapshots (intelligence_match_snapshots)
 *    - unmatched term IDs from recent snapshots
 *    - → used as weak competency gap signals
 *
 * 4. Teacher Runtime State (multiple domain tables)
 *    - active enrollments (training_enrollments)
 *    - active pathway executions (pathway_executions)
 *    - training completions (training_completions)
 *    - evidence status (training_evidence)
 *    - earned credentials (earned_credentials)
 *    - → used by engine to determine state-aware action
 *
 * 5. Training Catalog (training_items)
 *    - published items mapped by taxonomy term IDs
 *    - → used to resolve recommended items
 *
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL PIPELINE
 * ═══════════════════════════════════════════════════════════════
 *
 * Event (rejection/training/trust)
 *   → Smart Glue Rule (growth-rules.ts)
 *     → Intent: growthRecommendationRefreshRequested
 *       → Handler: growthRecommendationRefreshHandler
 *         → Service: refreshGrowthRecommendations
 *           → Step 1: loadGrowthRawData (data loader)
 *           → Step 2: mapHiringToGrowth (mapper)
 *           → Step 3: runGrowthRecommendationEngine (engine)
 *           → Step 4: writeGrowthRecommendations (writer)
 *
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL OUTPUT
 * ═══════════════════════════════════════════════════════════════
 *
 * Writer: writeGrowthRecommendations (growth-recommendation-writer.ts)
 * Target: growth_recommendations table
 *
 * Fields written:
 *   - teacher_id
 *   - source_type (canonical: rejection_feedback | gap_analysis | training_completion)
 *   - source_term_ids
 *   - recommended_action_type (canonical: see growth-contract.ts)
 *   - recommended_item_id / recommended_item_type
 *   - recommendation_reason (human-readable)
 *   - recommendation_trace (structured JSON)
 *   - priority_score (numeric, urgency + source boost)
 *   - status (active | completed | dismissed | stale)
 *
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL READERS (Dual-Reader Model)
 * ═══════════════════════════════════════════════════════════════
 *
 * Growth has TWO canonical readers for different purposes:
 *
 * 1. AGGREGATE SIGNALS (summary/dashboard):
 *    useGrowthSummary (src/growth/hooks/useGrowthSummary.ts)
 *      → reads from intelligence_talent_profiles (canonical snapshot)
 *      → reads from intelligence_gap_snapshots (for gap list)
 *      → provides: counts, flags, momentum, gap list
 *      → used by: Teacher Dashboard, CandidatePanel, Explainability
 *
 * 2. INDIVIDUAL RECOMMENDATIONS (actionable items):
 *    useGrowthRecommendations (src/growth/hooks/useGrowthRecommendations.ts)
 *      → reads from growth_recommendations table directly
 *      → provides: individual recommendations with normalized vocabulary
 *      → used by: Growth action surfaces, outcome tracking
 *      → applies canonical normalization via growth-normalization.ts
 *
 * 3. OUTCOME/FEEDBACK (internal service):
 *    outcome-signal.service.ts
 *      → reads from growth_recommendations for completion tracking
 *      → used by: Smart Glue context resolution, feedback loops
 *      → NOT a UI consumer
 *
 * ═══════════════════════════════════════════════════════════════
 * TRIGGER EVENTS (via Smart Glue rules)
 * ═══════════════════════════════════════════════════════════════
 *
 * From growth-rules.ts:
 *   - hiring.application_rejected
 *   - training.completed
 *   - training.verified_completion
 *   - trust.credential_issued
 *   - training.evidence.submitted
 *   - training.mentor.review.approved
 *
 * ═══════════════════════════════════════════════════════════════
 * VOCABULARY CONTRACT
 * ═══════════════════════════════════════════════════════════════
 *
 * Defined in: src/lib/growth/growth-contract.ts
 *
 * source_type: rejection_feedback | gap_analysis | training_completion
 * action_type: enroll_course | continue_pathway | submit_evidence |
 *              request_mentor_validation | start_pathway |
 *              revise_evidence | pursue_credential | complete_missing_course
 *
 * ═══════════════════════════════════════════════════════════════
 * CANONICAL STATUS & KNOWN GAPS
 * ═══════════════════════════════════════════════════════════════
 *
 * Current status: TRANSITIONAL CANONICAL
 *
 * Growth is canonical and operational, but uses a row-per-recommendation
 * storage model instead of the snapshot pattern used by other domains.
 * This is stable and functional — no immediate migration needed.
 *
 * Resolved (Sprint 2 Step 3):
 *   ✅ Canonical reader for individual recommendations (useGrowthRecommendations)
 *   ✅ Dual-reader model documented (aggregate + individual)
 *   ✅ Output target confirmed (growth_recommendations table)
 *
 * Resolved (Sprint 2 Step 4):
 *   ✅ Explainability attached to Growth handler output
 *
 * Resolved (Sprint 2 Step 5):
 *   ✅ Feedback loop closed: training completion → detectRecommendationOutcome
 *      → completeRecommendationsForCourse → status="completed"
 *   ✅ Loop completion service: growth-loop-completion.service.ts
 *   ✅ Wired into training-rules.ts context resolution
 *
 * Remaining gaps:
 *   1. No snapshot table (row-per-rec vs single-row-per-teacher)
 *      - Stable for now; consider intelligence_growth_snapshots for parity later
 *   2. Credential loop completion not yet wired into trust rules
 *      - completeRecommendationsForCredential exists but not yet called
 *   3. Completed recommendation count not yet propagated to talent profile
 *      - resolveTeacherFeedback reads it, but talent profile doesn't store it
 */

// ── Domain Identity ────────────────────────────────────────────

export const GROWTH_DOMAIN = {
  name: "growth",
  intentName: "intent.growth_recommendation_refresh_requested",
  handler: "growth-recommendation-refresh-handler",
  writer: "growth-recommendation-writer",
  loopCompletion: "growth-loop-completion.service.ts",
  table: "growth_recommendations",
  readers: {
    aggregate: "useGrowthSummary",
    individual: "useGrowthRecommendations",
    outcome: "outcome-signal.service.ts",
  },
  readerSources: {
    aggregate: "intelligence_talent_profiles",
    individual: "growth_recommendations",
  },
} as const;

// ── Input Sources ──────────────────────────────────────────────

export const GROWTH_INPUT_SOURCES = [
  "hiring_signals",
  "intelligence_gap_snapshots",
  "intelligence_match_snapshots",
  "training_enrollments",
  "pathway_executions",
  "training_completions",
  "training_evidence",
  "earned_credentials",
  "training_items",
] as const;

// ── Trigger Events ─────────────────────────────────────────────

export const GROWTH_TRIGGER_EVENTS = [
  "hiring.application_rejected",
  "training.completed",
  "training.verified_completion",
  "trust.credential_issued",
  "training.evidence.submitted",
  "training.mentor.review.approved",
] as const;

// ── Pipeline Stages ────────────────────────────────────────────

export const GROWTH_PIPELINE_STAGES = [
  "data_load",
  "hiring_mapping",
  "engine_resolution",
  "write",
] as const;

export type GrowthPipelineStage = (typeof GROWTH_PIPELINE_STAGES)[number];
