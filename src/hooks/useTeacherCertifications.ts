/**
 * useTeacherCertifications — Read-compatible hook with legacy fallback.
 *
 * Strategy:
 *   1. If teacher_certifications rows exist → use them.
 *   2. Otherwise fallback to teacher_profiles.certification_ids (legacy).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherCertificationEntry {
  id: string;
  certification_term_id: string;
  issued_by: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certification_name?: string;
}

export function useTeacherCertifications(teacherId: string | null) {
  return useQuery({
    queryKey: ["teacher_certifications", teacherId],
    enabled: !!teacherId,
    queryFn: async (): Promise<TeacherCertificationEntry[]> => {
      if (!teacherId) return [];

      const { data: rows, error } = await supabase
        .from("teacher_certifications")
        .select("id, certification_term_id, issued_by, issue_date, expiry_date")
        .eq("teacher_id", teacherId);

      if (error) throw error;

      if (rows && rows.length > 0) {
        const termIds = rows.map((r) => r.certification_term_id);
        const { data: terms } = await supabase
          .from("taxonomy_terms")
          .select("id, name")
          .in("id", termIds);

        const nameMap: Record<string, string> = {};
        terms?.forEach((t) => { nameMap[t.id] = t.name; });

        return rows.map((r) => ({
          id: r.id,
          certification_term_id: r.certification_term_id,
          issued_by: r.issued_by,
          issue_date: r.issue_date,
          expiry_date: r.expiry_date,
          certification_name: nameMap[r.certification_term_id],
        }));
      }

      // Fallback: legacy certification_ids array
      const { data: profile } = await supabase
        .from("teacher_profiles")
        .select("certification_ids")
        .eq("id", teacherId)
        .maybeSingle();

      if (!profile?.certification_ids?.length) return [];

      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .in("id", profile.certification_ids);

      return (terms ?? []).map((t) => ({
        id: `legacy-${t.id}`,
        certification_term_id: t.id,
        issued_by: null,
        issue_date: null,
        expiry_date: null,
        certification_name: t.name,
      }));
    },
  });
}
