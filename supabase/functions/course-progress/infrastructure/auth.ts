/**
 * Identity resolution. Fixes audit #2: the JWT is verified by Supabase Auth via
 * `getUser()` (signature + expiry checked server-side) instead of being
 * hand-decoded and trusted. Identity is derived only from the verified user.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Errors } from "../domain/errors.ts";
import type { Identity } from "../application/ports.ts";

export async function resolveIdentity(userClient: SupabaseClient): Promise<Identity> {
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw Errors.unauthenticated();
  const userId = data.user.id;

  const { data: profile, error: profileError } = await userClient
    .from("teacher_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) throw Errors.internal("Failed to resolve teacher profile");
  if (!profile) throw Errors.forbidden("No teacher profile for this user");

  return { userId, teacherId: profile.id };
}
