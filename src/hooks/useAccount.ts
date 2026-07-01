import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccountProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  account_status: string;
  preferred_language: string | null;
  timezone: string | null;
  phone: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

type AccountUpdateFields = Pick<
  Partial<AccountProfile>,
  "display_name" | "avatar_url" | "preferred_language" | "timezone" | "phone"
>;

export function useAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const {
    data: account,
    isLoading,
    error,
  } = useQuery<AccountProfile | null>({
    queryKey: ["account_profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as AccountProfile | null;
    },
    enabled: !!user,
  });

  const updateAccount = useMutation({
    mutationFn: async (updates: AccountUpdateFields) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account_profile", user?.id] });
    },
  });

  return { account, isLoading, error, updateAccount };
}
