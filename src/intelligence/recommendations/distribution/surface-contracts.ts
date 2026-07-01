/**
 * Surface Contracts — Surface Orchestration Layer
 *
 * Defines the purpose, allowed content, ownership mode, and output shape
 * for each UI surface that consumes recommendations.
 *
 * This is the SINGLE source of truth for "who gets what".
 * Pure data — no logic, no hooks, no side effects.
 *
 * OWNERSHIP MODEL:
 *   - "action_owner": Surface drives user action (Dashboard). Gets primary framing.
 *   - "contextual":   Surface shows domain-filtered subset (Skills, CRI). No primary framing.
 *   - "exploration":  Surface intentionally shows full list (Recommendations page).
 *   - "context_only": Surface shows feedback/status only, no actionable items (ContextBar).
 *   - "bridge":       Surface links to another surface, no inline recs (Training).
 *   - "debug":        Admin-only full view.
 *
 * OVERLAP RULES (explicit):
 *   - action_owner surfaces may show any non-forbidden item.
 *   - contextual surfaces show ONLY their allowedGroupKeys — no overlap beyond that.
 *   - exploration surfaces intentionally overlap with all other surfaces.
 *   - context_only surfaces show NO actionable recommendations.
 *   - Items are NOT excluded from one surface because they appear in another.
 *     Each surface's contract independently defines its own slice.
 */

import type { UIRecommendation } from "@/intelligence/adapters/unified-recommendations.adapter";

// ── Surface Types ─────────────────────────────────────────────

export type SurfaceType =
  | "dashboard"
  | "recommendations_page"
  | "skills"
  | "contextbar"
  | "cri"
  | "training"
  | "school_dashboard"
  | "debug";

// ── Ownership Mode ────────────────────────────────────────────

export type SurfaceOwnershipMode =
  | "action_owner"
  | "contextual"
  | "exploration"
  | "context_only"
  | "bridge"
  | "debug";

// ── Surface Contract ──────────────────────────────────────────

export interface SurfaceContract {
  /** Human-readable purpose */
  purpose: string;
  /** Ownership mode — determines overlap and dedup behavior */
  ownershipMode: SurfaceOwnershipMode;
  /** Which groupKeys are allowed (empty = all allowed) */
  allowedGroupKeys: string[];
  /** Which groupKeys are explicitly forbidden */
  forbiddenGroupKeys: string[];
  /** Use exposed (capped) or full list as source */
  sourceList: "exposed" | "full";
  /** Max items to return for this surface */
  maxItems: number;
  /** Whether completed items should be included */
  includeCompleted: boolean;
}

// ── Contracts Registry ────────────────────────────────────────

export const SURFACE_CONTRACTS: Record<SurfaceType, SurfaceContract> = {
  dashboard: {
    purpose: "Top-priority action + growth actions for daily engagement",
    ownershipMode: "action_owner",
    allowedGroupKeys: [],
    forbiddenGroupKeys: [],
    sourceList: "exposed",
    maxItems: 5,
    includeCompleted: false,
  },

  recommendations_page: {
    purpose: "Canonical exploration surface — intentionally shows full list including items visible on other surfaces",
    ownershipMode: "exploration",
    allowedGroupKeys: [],
    forbiddenGroupKeys: [],
    sourceList: "full",
    maxItems: 50,
    includeCompleted: true,
  },

  skills: {
    purpose: "Skill-related recommendations tied to gaps and training — contextual subset only",
    ownershipMode: "contextual",
    allowedGroupKeys: ["training_actions", "evidence_actions", "certification_actions"],
    forbiddenGroupKeys: ["hiring_actions"],
    sourceList: "full",
    maxItems: 8,
    includeCompleted: false,
  },

  contextbar: {
    purpose: "Completion feedback only — no action prompts, no recommendations",
    ownershipMode: "context_only",
    allowedGroupKeys: [],
    forbiddenGroupKeys: [],
    sourceList: "exposed",
    maxItems: 1,
    includeCompleted: true,
  },

  cri: {
    purpose: "Career-readiness insight only — restricted to certification and evidence signals",
    ownershipMode: "contextual",
    allowedGroupKeys: ["certification_actions", "evidence_actions"],
    forbiddenGroupKeys: ["hiring_actions", "training_actions"],
    sourceList: "exposed",
    maxItems: 3,
    includeCompleted: false,
  },

  training: {
    purpose: "Bridge to recommendations page — no inline recs",
    ownershipMode: "bridge",
    allowedGroupKeys: [],
    forbiddenGroupKeys: [],
    sourceList: "exposed",
    maxItems: 0,
    includeCompleted: false,
  },

  // school_dashboard is an INSIGHT-ONLY surface.
  // It must NEVER consume the recommendation pipeline.
  // Any attempt to use recommendation hooks here is a violation of architecture.
  // It displays aggregated team intelligence only — no individual teacher recommendations.
  school_dashboard: {
    purpose: "Institutional insight surface — aggregated team patterns only, no recommendation consumption",
    ownershipMode: "context_only",
    allowedGroupKeys: [],
    forbiddenGroupKeys: [
      "training_actions",
      "hiring_actions",
      "profile_actions",
      "credential_actions",
      "evidence_actions",
      "certification_actions",
    ],
    sourceList: "exposed",
    maxItems: 0,
    includeCompleted: false,
  },

  debug: {
    purpose: "Full unfiltered view for admin inspection",
    ownershipMode: "debug",
    allowedGroupKeys: [],
    forbiddenGroupKeys: [],
    sourceList: "full",
    maxItems: 999,
    includeCompleted: true,
  },
};

// ── Surface Output ────────────────────────────────────────────

export interface SurfaceRecommendations {
  surface: SurfaceType;
  items: UIRecommendation[];
  /** The single primary action (action_owner surfaces only) */
  primaryAction?: UIRecommendation;
  /** Total available before surface filtering */
  totalBeforeFilter: number;
}
