import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProviderMembership {
  id: string;
  provider_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  provider: {
    id: string;
    type: string;
    legal_name: string;
    display_name: string;
    slug: string;
    logo_url: string | null;
    bio: string | null;
    website_url: string | null;
    contact_email: string | null;
    status: string;
    verification_status: string;
    rejection_reason: string | null;
    created_at: string;
  };
}

export function useProviderMembership() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provider_membership", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_members")
        .select(`
          id, provider_id, user_id, role, status, joined_at,
          provider:provider_id (
            id, type, legal_name, display_name, slug, logo_url,
            bio, website_url, contact_email, status, verification_status, rejection_reason, created_at,
            onboarding_started_at, onboarding_completed_at, onboarding_current_step
          )
        `)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ProviderMembership | null;
    },
  });
}

export function useProviderDetails(providerId: string | undefined) {
  return useQuery({
    queryKey: ["provider_details", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .eq("id", providerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
