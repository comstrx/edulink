import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export type TrainingContext = "teacher" | "school";

export function useTrainingContext() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { roles } = useAuth();

  const isSchoolRole =
    roles.includes("school_admin") ||
    roles.includes("school_recruiter") ||
    roles.includes("school_academic_lead");

  const defaultContext: TrainingContext = isSchoolRole ? "school" : "teacher";

  const context: TrainingContext = useMemo(() => {
    const param = searchParams.get("context");
    if (param === "teacher" || param === "school") return param;
    return defaultContext;
  }, [searchParams, defaultContext]);

  const setContext = useCallback(
    (value: TrainingContext) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("context", value);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  return { context, setContext };
}
