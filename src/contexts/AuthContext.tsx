import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "teacher" | "school_admin" | "school_recruiter" | "school_academic_lead" | "school_training_manager" | "admin" | "provider";

export interface AccountCore {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  account_status: string;
  preferred_language: string | null;
  timezone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  account: AccountCore | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: (userId?: string) => Promise<AppRole[]>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  account: null,
  loading: true,
  signOut: async () => {},
  refreshRoles: async () => [],
  refreshAccount: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [account, setAccount] = useState<AccountCore | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("[Auth] fetchRoles failed:", error);
      setRoles([]);
      return [];
    }

    const fresh = data ? data.map((r) => r.role as AppRole) : [];
    setRoles(fresh);
    return fresh;
  }, []);

  const fetchAccount = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, account_status, preferred_language, timezone")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] fetchAccount failed:", error);
      setAccount(null);
      return;
    }

    setAccount(data as AccountCore | null);
  }, []);

  const hydrateUser = useCallback(async (userId: string) => {
    await Promise.all([fetchRoles(userId), fetchAccount(userId)]);
  }, [fetchRoles, fetchAccount]);

  useEffect(() => {
    let mounted = true;

    const syncSessionState = (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setRoles([]);
        setAccount(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      void hydrateUser(nextSession.user.id)
        .catch((error) => {
          console.error("[Auth] hydrateUser failed:", error);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        syncSessionState(newSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      syncSessionState(initSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setRoles([]);
    setAccount(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[Auth] signOut backend call failed:", e);
    }
  };

  const refreshRoles = useCallback(async (userId?: string): Promise<AppRole[]> => {
    const targetUserId = userId ?? user?.id;
    if (targetUserId) return fetchRoles(targetUserId);
    return [];
  }, [user, fetchRoles]);

  const refreshAccount = useCallback(async () => {
    if (user) await fetchAccount(user.id);
  }, [user, fetchAccount]);

  return (
    <AuthContext.Provider value={{ user, session, roles, account, loading, signOut, refreshRoles, refreshAccount }}>
      {children}
    </AuthContext.Provider>
  );
};
