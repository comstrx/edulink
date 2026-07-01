import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useShellSnapshot } from "@/hooks/useShellSnapshot";

export type OrgModuleKey = "hiring" | "training" | "mentorship" | "credentials" | "provider_portal" | "talent_pool";

export interface OrgEntitlement {
  module_key: OrgModuleKey;
  enabled: boolean;
}

export function useOrganizationEntitlements() {
  const { user } = useAuth();
  const { shellArea, currentSchoolId, currentProviderId } = useShellSnapshot();

  // Determine which org to query
  const orgType = shellArea === "school" ? "school" : shellArea === "provider" ? "provider" : null;
  const orgId = shellArea === "school" ? currentSchoolId : shellArea === "provider" ? currentProviderId : null;

  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ["org_entitlements", orgType, orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_entitlements")
        .select("module_key, enabled")
        .eq("organization_type", orgType!)
        .eq("organization_id", orgId!)
        .eq("enabled", true);
      return (data ?? []) as OrgEntitlement[];
    },
    enabled: !!user && !!orgType && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const enabledModules = entitlements.map((e) => e.module_key);

  return {
    entitlements,
    enabledModules,
    isLoading,
    hasModule: (key: OrgModuleKey) => enabledModules.includes(key),
  };
}
