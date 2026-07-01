/**
 * useSchoolGrowthSummary — Sprint 5 (Unified)
 *
 * School-scoped aggregate read layer for growth recommendations.
 * Returns ONLY aggregate counts — no teacher names, no personal details.
 *
 * NOW reads from intelligence_recommendation_snapshots (single source of truth)
 * instead of the legacy growth_recommendations table.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSchoolTeamTeacherIds } from "@/lib/supabase-typed-queries";

export interface SchoolGrowthSummary {
  totalRecommendations: number;
  affectedTeachers: number;
  topAreas: { label: string; count: number }[];
}

/** Map engine recommendation type strings to display labels */
function recTypeLabel(raw: string): string {
  const labels: Record<string, string> = {
    course_recommendation: "Course Enrollment",
    pathway_recommendation: "Pathway Enrollment",
    certification_recommendation: "Certification",
    profile_completion_action: "Profile Completion",
    verification_action: "Verification",
    curriculum_alignment_action: "Curriculum Alignment",
    language_improvement_action: "Language",
    experience_building_action: "Experience",
    continue_pathway_action: "Continue Pathway",
    submit_evidence_action: "Submit Evidence",
    revise_submission_action: "Revise Submission",
    request_mentor_validation_action: "Mentor Review",
    pursue_credential_action: "Credential",
  };
  return labels[raw] ?? raw.replace(/_/g, " ");
}

export function useSchoolGrowthSummary(schoolId?: string) {
  return useQuery({
    queryKey: ["school_growth_summary", schoolId],
    queryFn: async (): Promise<SchoolGrowthSummary> => {
      const teacherIds = await fetchSchoolTeamTeacherIds(schoolId!);

      if (teacherIds.length === 0) {
        return { totalRecommendations: 0, affectedTeachers: 0, topAreas: [] };
      }

      // Read from snapshot table — one row per teacher (latest fresh)
      const { data: snapshots, error } = await supabase
        .from("intelligence_recommendation_snapshots")
        .select("teacher_id, recommendations, total_count")
        .in("teacher_id", teacherIds)
        .eq("staleness", "fresh");

      if (error) throw error;
      if (!snapshots || snapshots.length === 0) {
        return { totalRecommendations: 0, affectedTeachers: 0, topAreas: [] };
      }

      const uniqueTeachers = new Set(snapshots.map((s) => s.teacher_id));
      let totalRecs = 0;
      const areaCounts = new Map<string, number>();

      for (const snap of snapshots) {
        const recs = Array.isArray(snap.recommendations) ? snap.recommendations : [];
        totalRecs += recs.length;

        for (const r of recs) {
          const rec = r as Record<string, unknown>;
          const recType = (rec.recommendationType ?? rec.type ?? "unknown") as string;
          const label = recTypeLabel(recType);
          areaCounts.set(label, (areaCounts.get(label) ?? 0) + 1);
        }
      }

      const topAreas = Array.from(areaCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalRecommendations: totalRecs,
        affectedTeachers: uniqueTeachers.size,
        topAreas,
      };
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });
}
