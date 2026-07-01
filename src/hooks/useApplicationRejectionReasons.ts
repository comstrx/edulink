import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRejectionReasons } from "@/hooks/useRejectionReasons";

/**
 * Batch-fetches rejection reason labels for a set of rejected application IDs.
 * Single query to hiring_signals + taxonomy mapping. No per-row queries.
 *
 * Returns: Map<applicationId, readableReasonLabel>
 */
export function useApplicationRejectionReasons(
  rejectedApplicationIds: string[]
) {
  const { data: reasonTerms } = useRejectionReasons();

  return useQuery<Record<string, string>>({
    queryKey: ["application-rejection-reasons", rejectedApplicationIds],
    enabled: rejectedApplicationIds.length > 0 && !!reasonTerms,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_signals")
        .select("application_id, metadata")
        .eq("signal_type", "application_rejected")
        .in("application_id", rejectedApplicationIds);

      if (error) throw error;

      const termMap = new Map(
        (reasonTerms ?? []).map((t) => [t.id, t.name])
      );

      const result: Record<string, string> = {};
      for (const signal of data ?? []) {
        const appId = signal.application_id;
        const termId = (signal.metadata as any)?.rejectionReasonTermId;
        if (appId && termId) {
          const label = termMap.get(termId);
          if (label) {
            result[appId] = label;
          }
        }
      }
      return result;
    },
  });
}
