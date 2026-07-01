import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import {
  getTeacherEarnedCredentials,
  computeWalletSummary,
  type EarnedCredential,
} from "@/lib/training/earned-credentials-service";

export function useTeacherEarnedCredentials() {
  return useQuery({
    queryKey: ["earned-credentials", "teacher"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as EarnedCredential[];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [] as EarnedCredential[];
      return getTeacherEarnedCredentials(tp.id);
    },
  });
}

export function useTeacherWalletSummary(credentials: EarnedCredential[] | undefined) {
  return computeWalletSummary(credentials ?? []);
}

export type EarnedCredentialWithTeacher = EarnedCredential & { teacher_name: string };

export function useSchoolTeamEarnedCredentials() {
  const { user } = useAuth();
  const { workspace } = useCurrentSchoolWorkspace();

  return useQuery({
    queryKey: ["earned-credentials", "school-team", workspace?.schoolId],
    queryFn: async (): Promise<EarnedCredentialWithTeacher[]> => {
      if (!user || !workspace) return [];

      // Get team member teacher IDs using canonical org ID
      const { data: members } = await supabase
        .from("school_team_members")
        .select("teacher_id")
        .eq("school_id", workspace.schoolId);

      if (!members || members.length === 0) return [];

      const teacherIds = members.map((m) => m.teacher_id);

      // Fetch credentials scoped to team
      const { data: creds, error } = await supabase
        .from("earned_credentials")
        .select("*")
        .in("teacher_id", teacherIds)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      if (!creds || creds.length === 0) return [];

      // Resolve teacher names
      const { data: teachers } = await supabase
        .from("teacher_profiles")
        .select("id, full_name")
        .in("id", teacherIds);

      const nameMap: Record<string, string> = {};
      teachers?.forEach((t) => (nameMap[t.id] = t.full_name));

      return creds.map((c) => ({
        ...(c as unknown as EarnedCredential),
        teacher_name: nameMap[c.teacher_id] ?? "Unknown",
      }));
    },
    enabled: !!user && !!workspace,
  });
}
