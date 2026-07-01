/**
 * Builds the two Supabase clients:
 *   - `user`:  anon key + caller's Authorization header → RLS-scoped, and its
 *              JWT is verified by Supabase (see auth.ts / getUser).
 *   - `admin`: service role → used ONLY for the derived pathway projection,
 *              never for identity. Kept out of the request-critical path.
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface Clients {
  user: SupabaseClient;
  admin: SupabaseClient;
}

export function createClients(authHeader: string): Clients {
  const url = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const user = createClient(url, anonKey, {
    global: { headers: { authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { user, admin };
}

function requireEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
