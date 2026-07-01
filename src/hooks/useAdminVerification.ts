/**
 * useAdminVerification — Admin hook for managing account verifications.
 * Dispatches trust.verification_completed via Smart Glue on status change.
 *
 * Sprint 9.6: Wires trust domain into Smart Glue canonical ingress.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";

type VerificationStatus = "approved" | "rejected";

export function useResolveVerification() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      verificationId: string;
      accountId: string;
      verificationType: string;
      status: VerificationStatus;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const updatePayload: Record<string, unknown> = {
        status: params.status,
        reviewed_by: user.id,
      };

      if (params.status === "approved") {
        updatePayload.verified_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("account_verifications")
        .update(updatePayload)
        .eq("id", params.verificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["account_verifications"] });
      qc.invalidateQueries({ queryKey: ["trust_summary"] });

      // Resolve teacherId from accountId (account_verifications.account_id = auth user id)
      // For trust events, we need the teacher_profiles.id
      supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", variables.accountId)
        .maybeSingle()
        .then(({ data: tp }) => {
          const teacherId = tp?.id ?? variables.accountId;

          dispatchDomainEvent("trust", EVENT_NAMES.trust.verificationCompleted, {
            teacherId,
            verificationType: variables.verificationType,
            status: variables.status,
            completedAt: new Date().toISOString(),
          }).catch((e) => logDispatchFailure(EVENT_NAMES.trust.verificationCompleted, e));
        });
    },
  });
}
