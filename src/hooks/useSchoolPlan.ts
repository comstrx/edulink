import { useAuth } from "@/contexts/AuthContext";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

export function useSchoolPlan() {
  const { roles } = useAuth();
  const { workspace, isLoading } = useCurrentSchoolWorkspace();

  const isSchool = roles.some((r) =>
    ["school_admin", "school_recruiter", "school_academic_lead", "school_training_manager"].includes(r)
  );

  const plan = (workspace?.plan as "free" | "pro") ?? "free";
  const isPro = plan === "pro";

  return { plan, isPro, isSchool, isLoading };
}
