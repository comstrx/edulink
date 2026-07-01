/**
 * School Aggregated Insights Reader — Sprint 10
 *
 * Combines existing snapshot sources into a unified team-level insights model.
 * NO new scoring. Pure aggregation of pre-computed data.
 *
 * Sources:
 *   - intelligence_talent_profiles (gaps, readiness, growth_momentum)
 *   - intelligence_recommendation_snapshots (team recommendations)
 *   - applications / jobs (hiring patterns)
 *   - school_members → teacher_profiles (team scoping)
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  SchoolAggregatedInsights,
  TeamWeakArea,
  HiringPattern,
  TeamRecommendationInsight,
  SchoolIntelligenceAlert,
} from "../types/school-aggregated-insights.types";

// ── Labels ─────────────────────────────────────────────────────

const GAP_CATEGORY_LABELS: Record<string, string> = {
  skill_deficit: "Skills Development",
  certification_gap: "Certification",
  experience_gap: "Experience",
  qualification_gap: "Qualifications",
  language_gap: "Language Proficiency",
  curriculum_gap: "Curriculum Alignment",
  subject_gap: "Subject Knowledge",
};

const REC_TYPE_LABELS: Record<string, string> = {
  course_recommendation: "Course Enrollment",
  pathway_recommendation: "Pathway Enrollment",
  certification_recommendation: "Certification",
  profile_completion_action: "Profile Completion",
  verification_action: "Verification",
  curriculum_alignment_action: "Curriculum Alignment",
  language_improvement_action: "Language Training",
  experience_building_action: "Experience Building",
  submit_evidence_action: "Evidence Submission",
  pursue_credential_action: "Credential Pursuit",
};

const REC_INSTITUTIONAL_ACTIONS: Record<string, string> = {
  course_recommendation: "Course training needs are emerging across multiple staff members",
  pathway_recommendation: "Structured pathway interest is present across parts of your team",
  certification_recommendation: "Certification gaps are concentrated in a portion of your team",
  verification_action: "Profile verification is incomplete for several team members",
  profile_completion_action: "Incomplete profiles are a common pattern across your team",
  curriculum_alignment_action: "Curriculum alignment gaps are observed across team members",
  language_improvement_action: "Language proficiency needs are present across your team",
  experience_building_action: "Experience-building opportunities may benefit affected staff",
  submit_evidence_action: "Evidence submissions are pending for several team members",
  pursue_credential_action: "Credential acquisition needs are emerging across your team",
};

function humanizeGapKey(key: string): string {
  return GAP_CATEGORY_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeRecType(raw: string): string {
  return REC_TYPE_LABELS[raw] ?? raw.replace(/_/g, " ");
}

// ── Main Reader ────────────────────────────────────────────────

export async function resolveSchoolAggregatedInsights(
  schoolId: string,
): Promise<SchoolAggregatedInsights> {
  const empty: SchoolAggregatedInsights = {
    schoolId,
    weakAreas: [],
    hiringPatterns: [],
    recommendationInsights: [],
    alerts: [],
    computedAt: new Date().toISOString(),
  };

  try {
    // 1. Resolve team teacher IDs
    const { data: members } = await supabase
      .from("school_members")
      .select("user_id")
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (!members || members.length === 0) return empty;

    const userIds = members.map((m) => m.user_id).filter(Boolean);
    const { data: teacherProfiles } = await supabase
      .from("teacher_profiles")
      .select("id")
      .in("user_id", userIds);

    const teacherIds = (teacherProfiles ?? []).map((tp) => tp.id);
    if (teacherIds.length === 0) return empty;
    const teamSize = teacherIds.length;

    // 2. Fetch all data in parallel
    const [talentRes, recSnapRes, jobsRes, appsRes] = await Promise.all([
      supabase
        .from("intelligence_talent_profiles")
        .select("teacher_id, unresolved_gap_count, gap_categories, readiness_level, growth_momentum, cri_score")
        .in("teacher_id", teacherIds),
      supabase
        .from("intelligence_recommendation_snapshots")
        .select("teacher_id, recommendations, total_count")
        .in("teacher_id", teacherIds)
        .eq("staleness", "fresh"),
      supabase
        .from("jobs")
        .select("id, status, created_at")
        .eq("school_id", schoolId),
      supabase
        .from("applications")
        .select("id, job_id, status, created_at")
        .eq("status", "applied"),
    ]);

    const talents = talentRes.data ?? [];
    const recSnaps = recSnapRes.data ?? [];
    const jobs = jobsRes.data ?? [];
    const apps = appsRes.data ?? [];

    // 3. Build weak areas from talent profiles
    const weakAreas = buildWeakAreas(talents, teamSize);

    // 4. Build hiring patterns
    const hiringPatterns = buildHiringPatterns(jobs, apps);

    // 5. Build recommendation insights
    const recommendationInsights = buildRecommendationInsights(recSnaps, teamSize);

    // 6. Build alerts from all signals
    const alerts = buildAlerts(weakAreas, hiringPatterns, recommendationInsights, talents, teamSize);

    return {
      schoolId,
      weakAreas,
      hiringPatterns,
      recommendationInsights,
      alerts,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[SchoolAggregatedInsights] Failed:", err);
    return empty;
  }
}

// ── Weak Areas ─────────────────────────────────────────────────

function buildWeakAreas(
  talents: Array<{
    teacher_id: string;
    unresolved_gap_count: number;
    gap_categories: unknown;
    readiness_level: string;
  }>,
  teamSize: number,
): TeamWeakArea[] {
  const categoryData = new Map<string, { count: number; criticalCount: number }>();

  for (const t of talents) {
    const categories = (t.gap_categories as string[]) ?? [];
    const isCritical = t.readiness_level === "early";

    for (const cat of categories) {
      const existing = categoryData.get(cat) ?? { count: 0, criticalCount: 0 };
      existing.count++;
      if (isCritical) existing.criticalCount++;
      categoryData.set(cat, existing);
    }
  }

  return Array.from(categoryData.entries())
    .map(([key, data]) => {
      const affectedPercent = teamSize > 0 ? Math.round((data.count / teamSize) * 100) : 0;
      let severity: "critical" | "moderate" | "low" = "low";
      if (data.criticalCount > 0 && affectedPercent >= 30) severity = "critical";
      else if (affectedPercent >= 20 || data.criticalCount > 0) severity = "moderate";

      return {
        areaKey: key,
        label: humanizeGapKey(key),
        affectedCount: data.count,
        affectedPercent,
        severity,
      };
    })
    .sort((a, b) => {
      const severityOrder = { critical: 0, moderate: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity] || b.affectedCount - a.affectedCount;
    })
    .slice(0, 6);
}

// ── Hiring Patterns ────────────────────────────────────────────

function buildHiringPatterns(
  jobs: Array<{ id: string; status: string; created_at: string }>,
  apps: Array<{ id: string; job_id: string; status: string; created_at: string }>,
): HiringPattern[] {
  const patterns: HiringPattern[] = [];
  const activeJobs = jobs.filter((j) => j.status === "published");
  const activeJobIds = new Set(activeJobs.map((j) => j.id));
  const jobApps = apps.filter((a) => activeJobIds.has(a.job_id));

  // Pattern: Jobs with no applications
  const jobsWithApps = new Set(jobApps.map((a) => a.job_id));
  const jobsNoApps = activeJobs.filter((j) => !jobsWithApps.has(j.id));
  if (jobsNoApps.length > 0) {
    patterns.push({
      patternKey: "jobs_no_applicants",
      label: "Unfilled Positions",
      description: `${jobsNoApps.length} active job${jobsNoApps.length > 1 ? "s have" : " has"} no applicants — consider improving job descriptions or visibility`,
      severity: jobsNoApps.length >= 3 ? "critical" : "warning",
    });
  }

  // Pattern: Low application rate
  if (activeJobs.length > 0 && jobApps.length > 0) {
    const avgAppsPerJob = jobApps.length / activeJobs.length;
    if (avgAppsPerJob < 3) {
      patterns.push({
        patternKey: "low_application_rate",
        label: "Low Application Rate",
        description: `Average of ${avgAppsPerJob.toFixed(1)} applications per job — below healthy pipeline threshold`,
        severity: avgAppsPerJob < 1.5 ? "critical" : "warning",
      });
    }
  }

  // Pattern: High volume (positive signal)
  if (activeJobs.length > 0 && jobApps.length / activeJobs.length >= 10) {
    patterns.push({
      patternKey: "high_volume",
      label: "Strong Candidate Pipeline",
      description: "Good application volume across your open positions",
      severity: "info",
    });
  }

  return patterns;
}

// ── Recommendation Insights ────────────────────────────────────

function buildRecommendationInsights(
  snapshots: Array<{ teacher_id: string; recommendations: unknown; total_count: number }>,
  teamSize: number,
): TeamRecommendationInsight[] {
  const typeCounts = new Map<string, Set<string>>();

  for (const snap of snapshots) {
    const recs = Array.isArray(snap.recommendations) ? snap.recommendations : [];
    for (const r of recs) {
      const rec = r as Record<string, unknown>;
      const recType = (rec.recommendationType ?? rec.type ?? "unknown") as string;
      if (!typeCounts.has(recType)) typeCounts.set(recType, new Set());
      typeCounts.get(recType)!.add(snap.teacher_id);
    }
  }

  return Array.from(typeCounts.entries())
    .map(([actionType, teachers]) => {
      const teacherCount = teachers.size;
      const ratio = teamSize > 0 ? teacherCount / teamSize : 0;
      let priority: "high" | "medium" | "low" = "low";
      if (ratio >= 0.5) priority = "high";
      else if (ratio >= 0.25) priority = "medium";

      return {
        actionType,
        label: humanizeRecType(actionType),
        teacherCount,
        priority,
        institutionalAction:
          REC_INSTITUTIONAL_ACTIONS[actionType] ?? "Review team development needs in this area",
      };
    })
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return pOrder[a.priority] - pOrder[b.priority] || b.teacherCount - a.teacherCount;
    })
    .slice(0, 8);
}

// ── Alerts ─────────────────────────────────────────────────────

function buildAlerts(
  weakAreas: TeamWeakArea[],
  hiringPatterns: HiringPattern[],
  recInsights: TeamRecommendationInsight[],
  talents: Array<{ readiness_level: string; growth_momentum: string; cri_score: number }>,
  teamSize: number,
): SchoolIntelligenceAlert[] {
  const alerts: SchoolIntelligenceAlert[] = [];
  let alertId = 0;

  // Alert: critical weak areas
  const criticalAreas = weakAreas.filter((w) => w.severity === "critical");
  if (criticalAreas.length > 0) {
    alerts.push({
      id: `alert-${alertId++}`,
      source: "gaps",
      severity: "critical",
      title: `Critical gap: ${criticalAreas[0].label}`,
      description: `${criticalAreas[0].affectedCount} team member${criticalAreas[0].affectedCount > 1 ? "s" : ""} affected — this area needs immediate attention`,
      actionLabel: "View Team",
      actionPath: "/app/school/team",
    });
  }

  // Alert: hiring patterns
  for (const pattern of hiringPatterns.filter((p) => p.severity !== "info")) {
    alerts.push({
      id: `alert-${alertId++}`,
      source: "hiring",
      severity: pattern.severity === "critical" ? "critical" : "warning",
      title: pattern.label,
      description: pattern.description,
      actionLabel: "Review Jobs",
      actionPath: "/app/school/hiring/overview",
    });
  }

  // Alert: high-priority team recommendations
  const highPriorityRecs = recInsights.filter((r) => r.priority === "high");
  if (highPriorityRecs.length > 0) {
    alerts.push({
      id: `alert-${alertId++}`,
      source: "training",
      severity: "warning",
      title: `${highPriorityRecs[0].teacherCount} staff need ${highPriorityRecs[0].label}`,
      description: highPriorityRecs[0].institutionalAction,
      actionLabel: "Explore Training",
      actionPath: "/app/school/training/overview",
    });
  }

  // Alert: struggling team members
  const struggling = talents.filter(
    (t) => t.readiness_level === "early" && (t.growth_momentum === "stalled" || t.growth_momentum === "declining"),
  );
  if (struggling.length > 0) {
    alerts.push({
      id: `alert-${alertId++}`,
      source: "team",
      severity: struggling.length >= 3 ? "critical" : "warning",
      title: `${struggling.length} team member${struggling.length > 1 ? "s" : ""} may need support`,
      description: "Staff with early readiness and stalled growth momentum — consider targeted intervention",
      actionLabel: "View Team",
      actionPath: "/app/school/team",
    });
  }

  // Alert: low team CRI average
  const criValues = talents.map((t) => Number(t.cri_score)).filter((c) => c > 0);
  if (criValues.length > 0) {
    const avgCri = criValues.reduce((a, b) => a + b, 0) / criValues.length;
    if (avgCri < 40) {
      alerts.push({
        id: `alert-${alertId++}`,
        source: "team",
        severity: "warning",
        title: "Team readiness is below average",
        description: `Your team's average readiness score is low — focus on training and professional development`,
        actionLabel: "Assign Training",
        actionPath: "/app/school/training/overview",
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts.slice(0, 5);
}
