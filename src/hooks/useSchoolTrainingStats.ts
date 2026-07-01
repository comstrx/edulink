/**
 * useSchoolTrainingStats — Canonical read hook for school training overview stats.
 *
 * Sprint 2.6 — Single source of truth for school training KPIs.
 * Replaces inline multi-query aggregation in Overview.tsx.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

export interface SchoolTrainingStats {
  totalMembers: number;
  activeAssignments: number;
  completedAssignments: number;
  credentialsEarned: number;
}

export interface OverdueAssignment {
  id: string;
  due_date: string;
  assigned_to_teacher_id: string;
  assigned_item_id: string;
  assigned_item_type: string;
  status: string;
  teacher_name: string;
  item_title: string;
}

export function useSchoolTrainingStats() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["school_training_stats", schoolId],
    enabled: !!schoolId && !wsLoading,
    staleTime: 60_000,
    queryFn: async (): Promise<SchoolTrainingStats> => {
      if (!schoolId) throw new Error("No school context");

      const [membersRes, activeRes, completedRes, teamRes] = await Promise.all([
        supabase
          .from("school_team_members")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId),
        supabase
          .from("training_assignments")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .in("status", ["assigned", "in_progress"]),
        supabase
          .from("training_assignments")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "completed"),
        supabase
          .from("school_team_members")
          .select("teacher_id")
          .eq("school_id", schoolId),
      ]);

      const teacherIds = (teamRes.data ?? []).map((m) => m.teacher_id);
      let credentialsEarned = 0;
      if (teacherIds.length > 0) {
        const { count } = await supabase
          .from("earned_credentials")
          .select("id", { count: "exact", head: true })
          .in("teacher_id", teacherIds);
        credentialsEarned = count ?? 0;
      }

      return {
        totalMembers: membersRes.count ?? 0,
        activeAssignments: activeRes.count ?? 0,
        completedAssignments: completedRes.count ?? 0,
        credentialsEarned,
      };
    },
  });
}

export function useSchoolOverdueCount() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["school_overdue_count", schoolId],
    enabled: !!schoolId && !wsLoading,
    staleTime: 60_000,
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count } = await supabase
        .from("training_assignments")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("status", ["assigned", "in_progress"])
        .lt("due_date", new Date().toISOString());
      return count ?? 0;
    },
  });
}

export function useSchoolOverdueAssignments() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["school_overdue_assignments", schoolId],
    enabled: !!schoolId && !wsLoading,
    staleTime: 60_000,
    queryFn: async (): Promise<OverdueAssignment[]> => {
      if (!schoolId) return [];

      const { data } = await supabase
        .from("training_assignments")
        .select("id, due_date, assigned_to_teacher_id, assigned_item_id, assigned_item_type, status")
        .eq("school_id", schoolId)
        .in("status", ["assigned", "in_progress"])
        .lt("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(10);

      if (!data || data.length === 0) return [];

      const teacherIds = [...new Set(data.map((d) => d.assigned_to_teacher_id))];
      const itemIds = [...new Set(data.map((d) => d.assigned_item_id))];

      const [teachersRes, itemsRes] = await Promise.all([
        supabase.from("teacher_profiles").select("id, full_name").in("id", teacherIds),
        supabase.from("training_items").select("id, title").in("id", itemIds),
      ]);

      const teacherMap = new Map((teachersRes.data ?? []).map((t) => [t.id, t.full_name ?? "Unknown"]));
      const itemMap = new Map((itemsRes.data ?? []).map((i) => [i.id, i.title]));

      return data.map((d) => ({
        ...d,
        teacher_name: teacherMap.get(d.assigned_to_teacher_id) ?? "Unknown",
        item_title: itemMap.get(d.assigned_item_id) ?? "Training Item",
      }));
    },
  });
}
