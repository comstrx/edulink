/**
 * useSchoolTeamMentorReviews — fetches mentor reviews for a school's team members.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

export interface TeamMentorReview {
  id: string;
  mentor_id: string;
  teacher_id: string;
  review_decision: string;
  review_notes: string | null;
  reviewed_at: string;
  teacher_name: string;
}

export function useSchoolTeamMentorReviews() {
  const { workspace, isLoading: wsLoading } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;

  return useQuery({
    queryKey: ["mentor_reviews", "school-team", schoolId],
    queryFn: async (): Promise<TeamMentorReview[]> => {
      if (!schoolId) return [];

      const { data: members } = await supabase
        .from("school_team_members")
        .select("teacher_id")
        .eq("school_id", schoolId);

      if (!members || members.length === 0) return [];

      const teacherIds = members.map((m) => m.teacher_id);

      const [reviewsRes, teachersRes] = await Promise.all([
        supabase
          .from("mentor_reviews")
          .select("id, mentor_id, teacher_id, review_decision, review_notes, reviewed_at")
          .in("teacher_id", teacherIds)
          .order("reviewed_at", { ascending: false })
          .limit(20),
        supabase
          .from("teacher_profiles")
          .select("id, full_name")
          .in("id", teacherIds),
      ]);

      if (reviewsRes.error) throw reviewsRes.error;

      const nameMap: Record<string, string> = {};
      teachersRes.data?.forEach((t) => (nameMap[t.id] = t.full_name));

      return (reviewsRes.data ?? []).map((r) => ({
        id: r.id,
        mentor_id: r.mentor_id,
        teacher_id: r.teacher_id,
        review_decision: r.review_decision,
        review_notes: r.review_notes,
        reviewed_at: r.reviewed_at,
        teacher_name: nameMap[r.teacher_id] ?? "Unknown",
      }));
    },
    enabled: !!schoolId && !wsLoading,
  });
}
