import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  parsePathwayFields,
  type TrainingPathwayItem,
  type TrainingItemBase,
} from "@/lib/training/training-item-types";

/**
 * Fetches a single training item by ID or slug with all fields.
 * Returns the full row including JSONB pathway fields, ready for detail pages.
 *
 * Phase 5.3 — Catalog read readiness
 */
export function useTrainingItemDetail(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ["training_item_detail", idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) return null;

      // Try by ID first (UUID pattern), else by slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const column = isUuid ? "id" : "slug";

      const { data, error } = await supabase
        .from("training_items")
        .select("*")
        .eq(column, idOrSlug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // For pathway items, parse JSONB into strongly-typed structures
      if (data.type === "pathway") {
        const pathwayFields = parsePathwayFields(data as Record<string, unknown>);
        return {
          ...data,
          ...pathwayFields,
        } as unknown as TrainingPathwayItem;
      }

      return data as unknown as TrainingItemBase;
    },
    enabled: !!idOrSlug,
    staleTime: 2 * 60 * 1000,
  });
}
