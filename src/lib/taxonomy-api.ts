/**
 * Taxonomy API utilities — reusable functions for dropdowns, filters, and cascading lookups.
 * All functions return taxonomy term IDs and labels for UI display.
 */
import { supabase } from "@/integrations/supabase/client";

export interface TaxonomyTerm {
  id: string;
  name: string;
  name_en: string;
  name_ar: string | null;
  slug: string;
  parent_id: string | null;
  sort_order: number | null;
  meta: Record<string, unknown> | null;
}

/** Fetch all active terms for a given domain key */
export async function fetchTermsByDomain(domainKey: string): Promise<TaxonomyTerm[]> {
  const { data: tt, error: ttErr } = await supabase
    .from("taxonomy_term_types")
    .select("id")
    .eq("key", domainKey)
    .eq("is_active", true)
    .single();
  if (ttErr) throw ttErr;

  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("id, name, name_en, name_ar, slug, parent_id, sort_order, meta")
    .eq("term_type_id", tt.id)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as TaxonomyTerm[];
}

/** Fetch children of a specific parent term (for cascading location filters) */
export async function fetchChildTerms(domainKey: string, parentId: string): Promise<TaxonomyTerm[]> {
  const { data: tt, error: ttErr } = await supabase
    .from("taxonomy_term_types")
    .select("id")
    .eq("key", domainKey)
    .eq("is_active", true)
    .single();
  if (ttErr) throw ttErr;

  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("id, name, name_en, name_ar, slug, parent_id, sort_order, meta")
    .eq("term_type_id", tt.id)
    .eq("parent_id", parentId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as TaxonomyTerm[];
}

/** Fetch countries by region ID (shortcut for cascading picker) */
export async function fetchCountriesByRegion(regionId: string): Promise<TaxonomyTerm[]> {
  return fetchChildTerms("countries", regionId);
}

/** Fetch cities by country ID (shortcut for cascading picker) */
export async function fetchCitiesByCountry(countryId: string): Promise<TaxonomyTerm[]> {
  return fetchChildTerms("cities", countryId);
}

/** Fetch districts/neighborhoods by city ID (shortcut for cascading picker) */
export async function fetchDistrictsByCity(cityId: string): Promise<TaxonomyTerm[]> {
  return fetchChildTerms("districts", cityId);
}

/** Location-only hierarchy types */
export const LOCATION_TYPES = ["regions", "countries", "cities", "districts"] as const;

/** Check if a domain key is a location type (hierarchy allowed) */
export function isLocationDomain(domainKey: string): boolean {
  return (LOCATION_TYPES as readonly string[]).includes(domainKey);
}

/** Resolve an array of term IDs to their display names */
export async function resolveTermNames(termIds: string[]): Promise<Record<string, string>> {
  if (termIds.length === 0) return {};
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("id, name")
    .in("id", termIds);
  if (error) throw error;
  const map: Record<string, string> = {};
  data?.forEach((t) => { map[t.id] = t.name; });
  return map;
}

/** Resolve a single term ID to its display name */
export async function resolveTermName(termId: string | null): Promise<string> {
  if (!termId) return "";
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("name")
    .eq("id", termId)
    .single();
  if (error) return "";
  return data?.name ?? "";
}

// ─── Resolution Helpers (for migration & backfill) ───

/** Normalize a string to a slug consistent with the app convention */
export function normalizeToSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Resolve a term ID by slug within a domain. Returns null if not found. */
export async function resolveTermIdBySlug(typeKey: string, slug: string): Promise<string | null> {
  const normalized = normalizeToSlug(slug);
  const { data: tt } = await supabase
    .from("taxonomy_term_types")
    .select("id")
    .eq("key", typeKey)
    .eq("is_active", true)
    .single();
  if (!tt) return null;

  const { data } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("term_type_id", tt.id)
    .eq("slug", normalized)
    .eq("is_active", true)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Resolve a term ID by name (case-insensitive exact match).
 * For migration use only — NOT for runtime filtering.
 * Returns null if ambiguous or not found.
 */
export async function resolveTermIdByName(typeKey: string, name: string): Promise<string | null> {
  const { data: tt } = await supabase
    .from("taxonomy_term_types")
    .select("id")
    .eq("key", typeKey)
    .eq("is_active", true)
    .single();
  if (!tt) return null;

  const lowerName = name.trim().toLowerCase();
  const { data } = await supabase
    .from("taxonomy_terms")
    .select("id, name, name_en, name_ar")
    .eq("term_type_id", tt.id)
    .eq("is_active", true);
  if (!data) return null;

  const matches = data.filter(
    (t) =>
      t.name.toLowerCase() === lowerName ||
      t.name_en.toLowerCase() === lowerName ||
      (t.name_ar && t.name_ar.toLowerCase() === lowerName)
  );
  // Ambiguous — return null
  if (matches.length !== 1) return null;
  return matches[0].id;
}

/**
 * Resolve display value with term_id preference over legacy text.
 * If termId is present, resolves from taxonomy. Otherwise falls back to legacyText.
 */
export async function resolveWithFallback(termId: string | null, legacyText: string | null): Promise<string> {
  if (termId) {
    const name = await resolveTermName(termId);
    if (name) return name;
  }
  return legacyText ?? "";
}

// ─── Legacy Fields Inventory ───

export const LEGACY_FREE_TEXT_FIELDS = [
  { table: "teacher_profiles", column: "country", replacement: "country_id", status: "has_id_column" },
  { table: "teacher_profiles", column: "city", replacement: "city_id", status: "has_id_column" },
  { table: "teacher_profiles", column: "visa_status", replacement: "visa_status_term_id", status: "has_id_column" },
  { table: "teacher_profiles", column: "availability_status", replacement: "availability_status_term_id", status: "has_id_column" },
  { table: "teacher_profiles", column: "student_age_range", replacement: "grade_band_ids", status: "covered_by_array" },
] as const;
