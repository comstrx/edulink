import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import {
  fetchComplianceRequirements,
  fetchTeacherComplianceStatuses,
  insertComplianceRequirement,
  type ComplianceRequirementRow,
  type TeacherComplianceStatusRow,
} from "@/lib/supabase-typed-queries";

export type ComplianceRequirement = ComplianceRequirementRow;
export type TeacherComplianceStatus = TeacherComplianceStatusRow;

export interface ComplianceOverview {
  requirement: ComplianceRequirement;
  totalTeachers: number;
  completedCount: number;
  overdueCount: number;
  inProgressCount: number;
  pendingCount: number;
  coveragePct: number;
}

export function useComplianceRequirements() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["compliance_requirements", schoolId],
    queryFn: async (): Promise<ComplianceOverview[]> => {
      if (!schoolId) return [];

      const requirements = await fetchComplianceRequirements(schoolId);
      if (requirements.length === 0) return [];

      const reqIds = requirements.map((r) => r.id);
      const statuses = await fetchTeacherComplianceStatuses(reqIds);

      // Get team size
      const { data: members } = await supabase
        .from("school_team_members")
        .select("teacher_id")
        .eq("school_id", schoolId);

      const teamSize = members?.length ?? 0;

      return requirements.map((req) => {
        const reqStatuses = statuses.filter((s) => s.requirement_id === req.id);
        const completedCount = reqStatuses.filter((s) => s.status === "completed").length;
        const overdueCount = reqStatuses.filter((s) => s.status === "overdue").length;
        const inProgressCount = reqStatuses.filter((s) => s.status === "in_progress").length;
        const pendingCount = teamSize - completedCount - overdueCount - inProgressCount;

        return {
          requirement: req,
          totalTeachers: teamSize,
          completedCount,
          overdueCount,
          inProgressCount,
          pendingCount: Math.max(0, pendingCount),
          coveragePct: teamSize > 0 ? Math.round((completedCount / teamSize) * 100) : 0,
        };
      });
    },
    enabled: !!schoolId && !wsLoading,
  });
}

export function useCreateComplianceRequirement() {
  const { user } = useAuth();
  const { workspace } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { training_item_id: string; title: string; is_mandatory?: boolean; due_date?: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!schoolId) throw new Error("No school workspace");

      return insertComplianceRequirement({
        school_id: schoolId,
        training_item_id: payload.training_item_id,
        title: payload.title,
        is_mandatory: payload.is_mandatory ?? true,
        due_date: payload.due_date ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance_requirements"] });
    },
  });
}
