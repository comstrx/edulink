import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useSchoolOnboardingStatus } from "@/hooks/useSchoolOnboardingStatus";

const ONBOARDING_MESSAGE = "Complete your school profile to activate hiring features.";

export function useSchoolHiringGuard() {
  const { isCompleted, isLoading } = useSchoolOnboardingStatus();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const guardHiringAction = useCallback((): boolean => {
    if (isLoading) return false;
    if (isCompleted) return true;

    toast({
      title: "Profile incomplete",
      description: ONBOARDING_MESSAGE,
      variant: "destructive",
    });
    navigate("/app/school/start", {
      replace: true,
      state: { reason: "onboarding", returnTo: pathname },
    });
    return false;
  }, [isCompleted, isLoading, navigate, pathname]);

  return { guardHiringAction, isCompleted, isLoading };
}
