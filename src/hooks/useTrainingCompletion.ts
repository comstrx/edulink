import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  completeAndIssueIfEligible,
  recordTrainingCompletion,
  type TrainingCompletion,
} from "@/lib/training/credential-issuance-evaluator";
import type { CredentialSourceType } from "@/lib/training/earned-credentials-service";
import type { EarnedCredential } from "@/lib/training/earned-credentials-service";
import { supabase } from "@/integrations/supabase/client";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { resolveProviderAttribution } from "@/intelligence/provider/provider-attribution.service";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";

interface CompleteAndIssueResult {
  completion: TrainingCompletion;
  evaluation: { eligible: boolean; reason: string };
  credential: EarnedCredential | null;
}

/**
 * Hook to record training completion and automatically issue a credential
 * if the training item is credential-eligible.
 */
export function useCompleteAndIssue() {
  const queryClient = useQueryClient();

  return useMutation<
    CompleteAndIssueResult,
    Error,
    {
      teacherId: string;
      sourceType: CredentialSourceType;
      sourceId: string;
      evidence?: Record<string, unknown>;
    }
  >({
    mutationFn: ({ teacherId, sourceType, sourceId, evidence }) =>
      completeAndIssueIfEligible(teacherId, sourceType, sourceId, evidence),
    onSuccess: async (result, variables) => {
      // User feedback
      const credentialMsg = result.credential ? " and credential earned! 🏆" : "";
      toast.success(`Course completed 🎓${credentialMsg}`);

      queryClient.invalidateQueries({ queryKey: ["earned-credentials"] });
      queryClient.invalidateQueries({ queryKey: ["training-completions"] });
      // Cross-domain: completion affects reputation, growth, and enrollment state
      queryClient.invalidateQueries({ queryKey: ["prof_rep_training"] });
      queryClient.invalidateQueries({ queryKey: ["career_growth_training"] });
      queryClient.invalidateQueries({ queryKey: ["career_growth_credentials"] });
      queryClient.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment_status"] });
      // Dashboard refresh
      queryClient.invalidateQueries({ queryKey: ["teacher_application_count"] });
      queryClient.invalidateQueries({ queryKey: ["intelligence_talent_profile"] });

      // Sprint 14: Resolve provider attribution + skill IDs in parallel
      const [{ data: skillRows }, attribution] = await Promise.all([
        supabase
          .from("teacher_skills")
          .select("skill_term_id")
          .eq("teacher_id", variables.teacherId),
        resolveProviderAttribution(variables.sourceId),
      ]);
      const resolvedSkillIds = (skillRows ?? []).map(r => r.skill_term_id);

      dispatchDomainEvent("training", EVENT_NAMES.training.completed, {
        teacherId: variables.teacherId,
        courseId: variables.sourceId,
        completedAt: new Date().toISOString(),
        skillIds: resolvedSkillIds,
        evidenceType: "certificate" as const,
        providerId: attribution.providerId,
      }).catch((e) => logDispatchFailure(EVENT_NAMES.training.completed, e));

      // Sprint 8: credential issued event
      if (result.credential?.id) {
        dispatchDomainEvent("trust", EVENT_NAMES.trust.credentialIssued, {
          teacherId: variables.teacherId,
          credentialId: result.credential.id,
          sourceType: "training" as const,
          evidenceType: "completion",
          issuedAt: new Date().toISOString(),
        }).catch((e) => logDispatchFailure(EVENT_NAMES.trust.credentialIssued, e));
      }
    },
  });
}

/**
 * Hook to record training completion without credential issuance evaluation.
 * Use when you only need to mark something as complete.
 */
export function useRecordCompletion() {
  const queryClient = useQueryClient();

  return useMutation<
    TrainingCompletion,
    Error,
    {
      teacherId: string;
      sourceType: CredentialSourceType;
      sourceId: string;
      evidence?: Record<string, unknown>;
    }
  >({
    mutationFn: ({ teacherId, sourceType, sourceId, evidence }) =>
      recordTrainingCompletion(teacherId, sourceType, sourceId, evidence),
    onSuccess: async (_result, variables) => {
      toast.success("Training completed 🎓");

      queryClient.invalidateQueries({ queryKey: ["training-completions"] });
      // Cross-domain: completion affects reputation and growth
      queryClient.invalidateQueries({ queryKey: ["prof_rep_training"] });
      queryClient.invalidateQueries({ queryKey: ["career_growth_training"] });
      queryClient.invalidateQueries({ queryKey: ["teacher_enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment_status"] });
      queryClient.invalidateQueries({ queryKey: ["intelligence_talent_profile"] });

      // Sprint 14: Resolve provider attribution + skill IDs in parallel
      const [{ data: skillRows }, attribution] = await Promise.all([
        supabase
          .from("teacher_skills")
          .select("skill_term_id")
          .eq("teacher_id", variables.teacherId),
        resolveProviderAttribution(variables.sourceId),
      ]);
      const resolvedSkillIds = (skillRows ?? []).map(r => r.skill_term_id);

      dispatchDomainEvent("training", EVENT_NAMES.training.completed, {
        teacherId: variables.teacherId,
        courseId: variables.sourceId,
        completedAt: new Date().toISOString(),
        skillIds: resolvedSkillIds,
        evidenceType: "certificate" as const,
        providerId: attribution.providerId,
      }).catch((e) => logDispatchFailure(EVENT_NAMES.training.completed, e));
    },
  });
}
