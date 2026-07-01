/**
 * Talent Profile Explanation Adapter
 *
 * Transforms TalentIntelligenceProfile → ExplanationDTOs for the
 * Professional Intelligence surface. Uses the canonical ExplanationDTO
 * structure and EvidencePoint pattern.
 *
 * Phase 6 — Explainability Activation
 */

import type { TalentIntelligenceProfile } from "@/intelligence/talent/types/talent-intelligence.types";
import type { ExplanationDTO, EvidencePoint } from "../types/explanation.types";
import { clampEvidence } from "../utils/explanation-helpers";

// ── Readiness Explanation ──────────────────────────────────────

export function explainReadiness(p: TalentIntelligenceProfile): ExplanationDTO {
  const level = p.readinessLevel;
  const headline =
    level === "highly_ready" ? "Strong career readiness" :
    level === "ready" ? "Good career readiness" :
    level === "developing" ? "Developing career readiness" :
    "Early stage readiness";

  const shortDescription =
    level === "highly_ready" || level === "ready"
      ? "Your profile meets the key markers schools look for in candidates."
      : "Your readiness level is determined by your credentials, training, and gap status.";

  const points: EvidencePoint[] = [];

  // Gaps
  if (p.unresolvedGapCount > 0) {
    points.push({
      label: "Skill gaps",
      detail: `${p.unresolvedGapCount} unresolved gap${p.unresolvedGapCount > 1 ? "s" : ""} affecting your readiness`,
      sentiment: "negative",
    });
  } else if (p.trainingCompletionCount > 0) {
    points.push({
      label: "Skill gaps",
      detail: "All gaps resolved — no skill gaps holding you back",
      sentiment: "positive",
    });
  }

  // Credentials
  if (p.credentialVerifiedCount > 0) {
    points.push({
      label: "Verified credentials",
      detail: `${p.credentialVerifiedCount} verified credential${p.credentialVerifiedCount > 1 ? "s" : ""} strengthening your profile`,
      sentiment: "positive",
    });
  } else if (p.credentialCount === 0) {
    points.push({
      label: "Credentials",
      detail: "No credentials earned yet — this limits your readiness",
      sentiment: "negative",
    });
  } else {
    points.push({
      label: "Credentials",
      detail: `${p.credentialCount} earned but none verified yet`,
      sentiment: "neutral",
    });
  }

  // Training
  if (p.trainingCompletionCount > 0) {
    points.push({
      label: "Training",
      detail: `${p.trainingCompletionCount} completed — contributing to your readiness`,
      sentiment: "positive",
    });
  } else {
    points.push({
      label: "Training",
      detail: "No training completed yet",
      sentiment: "negative",
    });
  }

  // Pathways
  if (p.pathwayCompletionCount > 0) {
    points.push({
      label: "Pathways",
      detail: `${p.pathwayCompletionCount} completed — demonstrating structured growth`,
      sentiment: "positive",
    });
  }

  // Suggestion
  const suggestion =
    level === "highly_ready" || level === "ready"
      ? "Maintain your credentials and continue professional development to stay competitive."
      : p.unresolvedGapCount > 0
        ? "Focus on closing your skill gaps — this has the biggest impact on readiness."
        : p.credentialCount === 0
          ? "Earning and verifying credentials will significantly improve your readiness level."
          : "Continue completing training and pathways to reach a stronger readiness level.";

  return { headline, shortDescription, evidencePoints: clampEvidence(points), suggestion };
}

// ── Match Explanation ──────────────────────────────────────────

export function explainMatch(p: TalentIntelligenceProfile): ExplanationDTO | null {
  if (p.bestMatchScore == null) return null;

  const score = p.bestMatchScore;
  const headline =
    score >= 75 ? "Strong match with available roles" :
    score >= 50 ? "Moderate match with available roles" :
    "Limited match with available roles";

  const shortDescription =
    score >= 75
      ? "Your profile aligns well with the requirements of roles you've been matched against."
      : "There are areas where your profile could better align with role requirements.";

  const points: EvidencePoint[] = [];

  if (p.unresolvedGapCount > 0) {
    points.push({
      label: "Skill gaps",
      detail: `${p.unresolvedGapCount} gap${p.unresolvedGapCount > 1 ? "s" : ""} may be reducing your match strength`,
      sentiment: "negative",
    });
  } else {
    points.push({
      label: "Skill alignment",
      detail: "No skill gaps — your profile covers expected areas",
      sentiment: "positive",
    });
  }

  if (p.credentialVerifiedCount > 0) {
    points.push({
      label: "Credentials",
      detail: `${p.credentialVerifiedCount} verified — supporting your match`,
      sentiment: "positive",
    });
  }

  if (p.verifiedSignalCount > 0) {
    points.push({
      label: "Verified practice",
      detail: `${p.verifiedSignalCount} verified signal${p.verifiedSignalCount > 1 ? "s" : ""} improving alignment`,
      sentiment: "positive",
    });
  }

  const suggestion =
    score < 75 && p.unresolvedGapCount > 0
      ? "Closing your skill gaps is the fastest way to improve your match strength."
      : score < 75
        ? "Adding verified credentials and completing training will strengthen your match."
        : null;

  return { headline, shortDescription, evidencePoints: clampEvidence(points), suggestion };
}

// ── Hiring Advantage Explanation ───────────────────────────────

export function explainHiringAdvantages(p: TalentIntelligenceProfile): ExplanationDTO | null {
  if (p.hiringAdvantageSignals.length === 0) return null;

  const count = p.hiringAdvantageSignals.length;
  const headline = `${count} hiring advantage${count > 1 ? "s" : ""} earned`;
  const shortDescription = "These signals set you apart from other candidates when schools review profiles.";

  const typeToReason: Record<string, string> = {
    verified_teaching_practice: "You completed verified training with confirmed classroom practice",
    credential_strength: "You have a strong portfolio of earned credentials",
    pathway_achieved: "You completed a structured professional pathway",
    verified_classroom_artifact: "Your classroom evidence was reviewed and approved",
    gap_closure: "You resolved all identified skill gaps",
    growth_momentum: "Your recent activity shows consistent professional growth",
    mentor_validated: "A mentor reviewed and validated your teaching practice",
  };

  const points: EvidencePoint[] = p.hiringAdvantageSignals.slice(0, 5).map((s) => ({
    label: s.label,
    detail: typeToReason[s.type] ?? "Earned through professional activity",
    sentiment: "positive" as const,
  }));

  return { headline, shortDescription, evidencePoints: clampEvidence(points), suggestion: null };
}

// ── Consolidated "Why Your Profile Looks This Way" ─────────────

export function explainProfileConsolidated(p: TalentIntelligenceProfile): ExplanationDTO {
  const headline = "Why your profile looks this way";
  const shortDescription = "Your professional intelligence is shaped by these key factors.";

  const points: EvidencePoint[] = [];

  // Negatives first (most impactful to understand)
  if (p.unresolvedGapCount > 0) {
    points.push({
      label: "Unresolved gaps",
      detail: `${p.unresolvedGapCount} skill gap${p.unresolvedGapCount > 1 ? "s" : ""} are limiting your readiness and match potential`,
      sentiment: "negative",
    });
  }

  if (p.credentialCount === 0) {
    points.push({
      label: "No credentials",
      detail: "Missing credentials reduce your profile's credibility with schools",
      sentiment: "negative",
    });
  } else if (p.credentialVerifiedCount === 0) {
    points.push({
      label: "Unverified credentials",
      detail: `${p.credentialCount} credential${p.credentialCount > 1 ? "s" : ""} earned but none verified yet`,
      sentiment: "negative",
    });
  }

  if (p.trainingCompletionCount === 0) {
    points.push({
      label: "No training",
      detail: "No completed training — this limits your growth signals",
      sentiment: "negative",
    });
  }

  if (p.verifiedSignalCount === 0 && p.credentialCount > 0) {
    points.push({
      label: "No verified signals",
      detail: "Verified evidence and mentor reviews strengthen trust",
      sentiment: "negative",
    });
  }

  // Positives
  if (p.credentialVerifiedCount > 0) {
    points.push({
      label: "Verified credentials",
      detail: `${p.credentialVerifiedCount} verified — building trust with schools`,
      sentiment: "positive",
    });
  }

  if (p.trainingCompletionCount > 0) {
    points.push({
      label: "Training completed",
      detail: `${p.trainingCompletionCount} completed — improving your readiness`,
      sentiment: "positive",
    });
  }

  if (p.pathwayCompletionCount > 0) {
    points.push({
      label: "Pathways completed",
      detail: `${p.pathwayCompletionCount} — showing structured professional growth`,
      sentiment: "positive",
    });
  }

  if (p.unresolvedGapCount === 0 && p.trainingCompletionCount > 0) {
    points.push({
      label: "All gaps closed",
      detail: "No skill gaps remain — your profile is well-rounded",
      sentiment: "positive",
    });
  }

  if (p.hiringAdvantageSignals.length > 0) {
    points.push({
      label: "Hiring advantages",
      detail: `${p.hiringAdvantageSignals.length} advantage${p.hiringAdvantageSignals.length > 1 ? "s" : ""} that set you apart`,
      sentiment: "positive",
    });
  }

  // Determine suggestion from the most impactful negative
  let suggestion: string | null = null;
  if (p.unresolvedGapCount > 0) {
    suggestion = "Closing your skill gaps will have the biggest impact on your overall profile.";
  } else if (p.credentialCount === 0) {
    suggestion = "Earning your first credential is the best next step to strengthen your profile.";
  } else if (p.credentialVerifiedCount === 0) {
    suggestion = "Verifying your credentials will improve your profile's credibility.";
  } else if (p.trainingCompletionCount === 0) {
    suggestion = "Completing training will boost your readiness and growth momentum.";
  }

  return { headline, shortDescription, evidencePoints: clampEvidence(points), suggestion };
}

// ── Growth Momentum Explanation ────────────────────────────────

export function explainGrowthMomentum(p: TalentIntelligenceProfile): ExplanationDTO | null {
  const m = p.growthMomentum;
  if (m === "inactive") return null;

  const headline =
    m === "accelerating" ? "Your growth is accelerating" :
    m === "active" ? "You are actively growing" :
    "Your growth is emerging";

  const shortDescription =
    m === "accelerating"
      ? "Your recent activity is significantly above average."
      : m === "active"
        ? "You're maintaining consistent professional development."
        : "You've started building momentum — keep going.";

  const points: EvidencePoint[] = [];

  if (p.verifiedCompletionCount > 0) {
    points.push({
      label: "Verified completions",
      detail: `${p.verifiedCompletionCount} verified training completion${p.verifiedCompletionCount > 1 ? "s" : ""}`,
      sentiment: "positive",
    });
  }

  if (p.trainingCompletionCount > 0) {
    points.push({
      label: "Training activity",
      detail: `${p.trainingCompletionCount} total training${p.trainingCompletionCount > 1 ? "s" : ""} completed`,
      sentiment: "positive",
    });
  }

  if (p.activePathwayCount > 0) {
    points.push({
      label: "Active pathways",
      detail: `${p.activePathwayCount} pathway${p.activePathwayCount > 1 ? "s" : ""} in progress`,
      sentiment: "positive",
    });
  }

  const suggestion =
    m === "emerging"
      ? "Complete more training or start a pathway to build stronger momentum."
      : null;

  return { headline, shortDescription, evidencePoints: clampEvidence(points), suggestion };
}
