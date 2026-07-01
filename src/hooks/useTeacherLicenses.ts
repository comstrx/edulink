/**
 * useTeacherLicenses — Read-compatible hook with legacy fallback.
 *
 * Strategy:
 *   1. If teacher_licenses rows exist → use them.
 *   2. Otherwise fallback to teacher_profiles.teaching_license_ids (legacy).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherLicenseEntry {
  id: string;
  license_term_id: string;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  license_name?: string;
}

export function useTeacherLicenses(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacher_licenses", teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<TeacherLicenseEntry[]> => {
      if (!teacherId) return [];

      const { data: rows, error } = await supabase
        .from("teacher_licenses")
        .select("id, license_term_id, issuing_authority, issue_date, expiry_date")
        .eq("teacher_id", teacherId);

      if (error) throw error;

      if (rows && rows.length > 0) {
        const termIds = rows.map((r) => r.license_term_id);
        const { data: terms } = await supabase
          .from("taxonomy_terms")
          .select("id, name")
          .in("id", termIds);

        const nameMap: Record<string, string> = {};
        terms?.forEach((t) => { nameMap[t.id] = t.name; });

        return rows.map((r) => ({
          id: r.id,
          license_term_id: r.license_term_id,
          issuing_authority: r.issuing_authority,
          issue_date: r.issue_date,
          expiry_date: r.expiry_date,
          license_name: nameMap[r.license_term_id],
        }));
      }

      // Fallback: legacy teaching_license_ids array
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("teaching_license_ids")
        .eq("id", teacherId)
        .maybeSingle();

      if (!profile?.teaching_license_ids?.length) return [];

      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", profile.teaching_license_ids);

      return (terms ?? []).map((t) => ({
        id: `legacy-${t.id}`,
        license_term_id: t.id,
        issuing_authority: null,
        issue_date: null,
        expiry_date: null,
        license_name: t.name,
      }));
    },
  });
}
