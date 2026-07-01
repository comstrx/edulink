/**
 * Location Display Helpers — centralized fallback logic.
 * 
 * Single source of truth for resolving location display across:
 * - TeacherResultCard
 * - CandidatePanel
 * - Job cards/details (dashboard + public)
 * 
 * Rule: prefer taxonomy term ID → resolved name; fall back to legacy text.
 */

/**
 * Resolve a location display string from taxonomy IDs with legacy text fallback.
 * 
 * @param opts.cityId - taxonomy term ID for city
 * @param opts.countryId - taxonomy term ID for country
 * @param opts.legacyCityText - legacy free-text city (fallback)
 * @param opts.legacyCountryText - legacy free-text country (fallback)
 * @param nameMap - pre-resolved map of term ID → display name
 * @returns formatted location string e.g. "Cairo, Egypt" or "—"
 */
export function resolveLocationDisplay(
  opts: {
    cityId?: string | null;
    countryId?: string | null;
    legacyCityText?: string | null;
    legacyCountryText?: string | null;
  },
  nameMap: Record<string, string> = {}
): string {
  const city = opts.cityId && nameMap[opts.cityId]
    ? nameMap[opts.cityId]
    : opts.legacyCityText ?? null;

  const country = opts.countryId && nameMap[opts.countryId]
    ? nameMap[opts.countryId]
    : opts.legacyCountryText ?? null;

  const parts = [city, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

/**
 * Collect location-related taxonomy IDs from an object for batch resolution.
 * Useful to include in a batch resolve call alongside other IDs.
 */
export function collectLocationIds(obj: {
  city_id?: string | null;
  country_id?: string | null;
  region_id?: string | null;
}): string[] {
  return [obj.city_id, obj.country_id, obj.region_id].filter(Boolean) as string[];
}
