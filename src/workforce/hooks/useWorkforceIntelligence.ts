/**
 * useWorkforceIntelligence — Sprint 8D
 *
 * Hook for school admins to consume workforce intelligence data.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  SchoolWorkforceProfile,
  DepartmentCapability,
  WorkforceGap,
  PromotionReadinessEntry,
  WorkforceInsightSummary,
} from "../types/workforce.types";

export function useWorkforceIntelligence(schoolId: string | undefined) {
  return useQuery<WorkforceInsightSummary | null>({
    queryKey: ["workforce_intelligence", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      if (!schoolId) return null;

      const [profileRes, deptRes, gapRes, promoRes] = await Promise.all([
        supabase
          .from("school_workforce_profiles")
          .select("*")
          .eq("school_id", schoolId)
          .maybeSingle(),
        supabase
          .from("department_capability_snapshots")
          .select("*")
          .eq("school_id", schoolId)
          .order("gap_score", { ascending: false }),
        supabase
          .from("workforce_gap_reports")
          .select("*")
          .eq("school_id", schoolId),
        supabase
          .from("promotion_readiness_entries")
          .select("*")
          .eq("school_id", schoolId)
          .order("readiness_percent", { ascending: false }),
      ]);

      const raw = profileRes.data;
      if (!raw) return null;

      const profile: SchoolWorkforceProfile = {
        schoolId: raw.school_id,
        teacherCount: raw.teacher_count,
        verifiedTeacherCount: raw.verified_teacher_count,
        averageReputationScore: Number(raw.average_reputation_score),
        averageCriScore: Number(raw.average_cri_score),
        credentialCoverage: Number(raw.credential_coverage),
        careerStageDistribution: raw.career_stage_distribution as Record<string, number>,
        reputationDistribution: raw.reputation_distribution as Record<string, number>,
        topGaps: (raw.top_gaps as unknown as WorkforceGap[]) ?? [],
        promotionReadyCount: raw.promotion_ready_count,
        workforceUpdatedAt: raw.workforce_updated_at,
      };

      const departments: DepartmentCapability[] = (deptRes.data ?? []).map((d) => ({
        departmentKey: d.department_key,
        departmentLabel: d.department_label,
        teacherCount: d.teacher_count,
        averageReputationScore: Number(d.average_reputation_score),
        averageCriScore: Number(d.average_cri_score),
        verifiedCount: d.verified_count,
        credentialCoverage: Number(d.credential_coverage),
        stageDistribution: d.stage_distribution as Record<string, number>,
        gapScore: Number(d.gap_score),
      }));

      const gaps: WorkforceGap[] = (gapRes.data ?? []).map((g) => ({
        gapType: g.gap_type as WorkforceGap["gapType"],
        severity: g.severity as WorkforceGap["severity"],
        affectedDepartment: g.affected_department ?? undefined,
        description: g.description,
        recommendedIntervention: g.recommended_intervention ?? undefined,
      }));

      const promotionPipeline: PromotionReadinessEntry[] = (promoRes.data ?? []).map((p) => ({
        teacherId: p.teacher_id,
        currentStage: p.current_stage ?? undefined,
        nextStage: p.next_stage ?? undefined,
        readinessPercent: Number(p.readiness_percent),
        gapCount: p.gap_count,
        blockingGaps: (p.blocking_gaps as unknown as Array<{ key: string; label: string }>) ?? [],
      }));

      return { profile, departments, promotionPipeline, gaps };
    },
  });
}
