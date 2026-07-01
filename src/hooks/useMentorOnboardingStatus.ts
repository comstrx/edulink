import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getMentorCompleteness, type MentorCompleteness } from "@/lib/mentor-completeness";

export type MentorLifecycleStatus =
  | "not_mentor"
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "rejected"
  | "suspended";

export interface MentorOnboardingState {
  mentorId: string | null;
  mentorStatus: MentorLifecycleStatus;
  onboardingStarted: boolean;
  onboardingCompleted: boolean;
  readiness: MentorCompleteness;
  canAccessMentorWorkspace: boolean;
  isLoading: boolean;
}

export function useMentorOnboardingStatus(): MentorOnboardingState {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["mentor_onboarding_status", user?.id],
    queryFn: async () => {
      // Fetch mentor record
      const { data: mentor } = await supabase
        .from("mentors")
        .select("id, status, bio, headline, years_experience, languages, onboarding_started_at, onboarding_completed_at, onboarding_current_step")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!mentor) {
        return { mentor: null, specializationCount: 0 };
      }

      // Get specialization count
      const { count } = await supabase
        .from("mentor_specializations")
        .select("id", { count: "exact", head: true })
        .eq("mentor_id", mentor.id);

      return { mentor, specializationCount: count ?? 0 };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const mentor = data?.mentor;
  const specializationCount = data?.specializationCount ?? 0;

  if (isLoading || !data) {
    return {
      mentorId: null,
      mentorStatus: "not_mentor",
      onboardingStarted: false,
      onboardingCompleted: false,
      readiness: { isComplete: false, completionPercent: 0, missingFields: [] },
      canAccessMentorWorkspace: false,
      isLoading: true,
    };
  }

  if (!mentor) {
    return {
      mentorId: null,
      mentorStatus: "not_mentor",
      onboardingStarted: false,
      onboardingCompleted: false,
      readiness: { isComplete: false, completionPercent: 0, missingFields: [] },
      canAccessMentorWorkspace: false,
      isLoading: false,
    };
  }

  const readiness = getMentorCompleteness({
    bio: mentor.bio,
    headline: mentor.headline,
    years_experience: mentor.years_experience,
    specialization_count: specializationCount,
    languages: mentor.languages ?? [],
  });

  const status = (mentor.status as MentorLifecycleStatus) ?? "not_mentor";

  // onboardingCompleted is derived from data-driven readiness, NOT the timestamp flag
  const isDataComplete = readiness.isComplete;

  return {
    mentorId: mentor.id,
    mentorStatus: status,
    onboardingStarted: !!mentor.onboarding_started_at,
    onboardingCompleted: isDataComplete,
    readiness,
    canAccessMentorWorkspace: status === "active" && isDataComplete,
    isLoading: false,
  };
}
