/**
 * useTaxonomyPresets — Resolve taxonomy slugs to IDs at runtime.
 * Replaces hardcoded UUIDs for quick filter presets.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PresetDef {
  key: string;
  domain: string;
  slugs: string[];
}

const PRESET_DEFS: PresetDef[] = [
  { key: "esl", domain: "subjects", slugs: ["english-elt-esl-efl-"] },
  { key: "ib", domain: "curriculums", slugs: ["ib"] },
  { key: "british", domain: "curriculums", slugs: ["british"] },
  { key: "american", domain: "curriculums", slugs: ["american"] },
  { key: "igcse", domain: "curriculums", slugs: ["igcse"] },
];

export interface TaxonomyPresets {
  /** ESL/ELT subject IDs */
  eslSubjectIds: string[];
  /** International curriculum IDs (IB, British, American, IGCSE) */
  intlCurriculumIds: string[];
  /** Individual curriculum IDs by key */
  curriculumIds: Record<string, string[]>;
  /** Whether presets have loaded */
  isReady: boolean;
}

export function useTaxonomyPresets(): TaxonomyPresets {
  const { data, isSuccess } = useQuery({
    queryKey: ["taxonomy_presets"],
    staleTime: 30 * 60 * 1000, // 30 min cache
    queryFn: async () => {
      // Fetch all unique domains
      const domains = [...new Set(PRESET_DEFS.map((p) => p.domain))];
      const allSlugs = PRESET_DEFS.flatMap((p) => p.slugs);

      // Get term_type IDs for each domain
      const { data: types } = await supabase
        .from("taxonomy_term_types")
        .select("id, key")
        .in("key", domains)
        .eq("is_active", true);

      if (!types || types.length === 0) return null;

      const typeMap: Record<string, string> = {};
      types.forEach((t) => { typeMap[t.key] = t.id; });

      // Fetch all matching terms by slug
      const { data: terms } = await supabase
        .from("taxonomy_terms")
        .select("id, slug, term_type_id")
        .in("slug", allSlugs)
        .eq("is_active", true);

      if (!terms) return null;

      // Build lookup: domain+slug → id
      const termLookup: Record<string, string> = {};
      terms.forEach((t) => {
        const domainKey = Object.entries(typeMap).find(([, v]) => v === t.term_type_id)?.[0];
        if (domainKey) termLookup[`${domainKey}:${t.slug}`] = t.id;
      });

      // Resolve each preset, warn on missing slugs in dev
      const resolved: Record<string, string[]> = {};
      for (const def of PRESET_DEFS) {
        const ids: string[] = [];
        for (const slug of def.slugs) {
          const id = termLookup[`${def.domain}:${slug}`];
          if (id) {
            ids.push(id);
          } else if (import.meta.env.DEV) {
            console.warn(
              `[useTaxonomyPresets] Slug "${slug}" in domain "${def.domain}" did not resolve — preset "${def.key}" will be incomplete.`
            );
          }
        }
        resolved[def.key] = ids;
      }

      return resolved;
    },
  });

  const eslSubjectIds = data?.["esl"] ?? [];
  const intlCurriculumIds = [
    ...(data?.["ib"] ?? []),
    ...(data?.["british"] ?? []),
    ...(data?.["american"] ?? []),
    ...(data?.["igcse"] ?? []),
  ];
  const curriculumIds: Record<string, string[]> = {
    ib: data?.["ib"] ?? [],
    british: data?.["british"] ?? [],
    american: data?.["american"] ?? [],
    igcse: data?.["igcse"] ?? [],
  };

  return {
    eslSubjectIds,
    intlCurriculumIds,
    curriculumIds,
    isReady: isSuccess && !!data,
  };
}
