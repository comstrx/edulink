import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AccountModuleKey = "teacher_app" | "mentor_workspace" | "provider_portal" | "admin_console";

export interface AccountEntitlement {
  module_key: AccountModuleKey;
  enabled: boolean;
}

export function useAccountEntitlements() {
  const { user } = useAuth();

  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ["account_entitlements", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("account_entitlements")
        .select("module_key, enabled")
        .eq("user_id", user!.id)
        .eq("enabled", true);
      return (data ?? []) as AccountEntitlement[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const enabledModules = entitlements.map((e) => e.module_key);

  return {
    entitlements,
    enabledModules,
    isLoading,
    hasModule: (key: AccountModuleKey) => enabledModules.includes(key),
  };
}
