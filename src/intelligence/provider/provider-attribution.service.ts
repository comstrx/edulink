/**
 * Provider Attribution Service — Sprint 14 PART 1
 *
 * Resolves providerId from training_items for any training outcome.
 * Uses existing schema — NO new tables or columns.
 *
 * Source: training_items.provider_id (nullable — platform items have none)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ProviderAttribution {
  providerId: string | null;
  providerName: string | null;
  ownershipType: string;
}

const attributionCache = new Map<string, ProviderAttribution>();

/**
 * Resolve provider attribution for a training item (course/pathway).
 * Returns null providerId for platform-owned items.
 */
export async function resolveProviderAttribution(
  trainingItemId: string,
): Promise<ProviderAttribution> {
  // Check cache first
  const cached = attributionCache.get(trainingItemId);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("training_items")
      .select("provider_id, ownership_type, providers:provider_id(id, name)")
      .eq("id", trainingItemId)
      .maybeSingle();

    if (error || !data) {
      return { providerId: null, providerName: null, ownershipType: "platform" };
    }

    const provider = data.providers as unknown as { id: string; name: string } | null;
    const result: ProviderAttribution = {
      providerId: data.provider_id ?? null,
      providerName: provider?.name ?? null,
      ownershipType: data.ownership_type ?? "platform",
    };

    // Cache (training items rarely change provider)
    attributionCache.set(trainingItemId, result);
    return result;
  } catch {
    return { providerId: null, providerName: null, ownershipType: "platform" };
  }
}

/**
 * Clear attribution cache (for testing).
 */
export function clearAttributionCache(): void {
  attributionCache.clear();
}
