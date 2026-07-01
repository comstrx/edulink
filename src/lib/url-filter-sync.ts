/**
 * url-filter-sync — Shared factory for bidirectional URL ↔ filter state sync.
 *
 * Eliminates duplication between Talent Search and Job Search URL sync hooks.
 * Each search context provides a FilterConfig; the factory returns serializer,
 * deserializer, and a React hook.
 */
import { useEffect, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";

// ── Config types ──

export interface FilterFieldConfig<F> {
  /** Keys whose values are string[] */
  arrayKeys: (keyof F)[];
  /** Keys whose values are string */
  stringKeys: (keyof F)[];
  /** Keys whose values are boolean */
  boolKeys: (keyof F)[];
  /** Keys whose values are number (optional, not all contexts use them) */
  numberKeys?: (keyof F)[];
  /** Short URL param names keyed by filter field name */
  paramMap: Partial<Record<keyof F & string, string>>;
  /** Default/empty filter state — used to skip serialising default values */
  defaults: F;
}

// ── Serializer: filters → URLSearchParams ──

export function filtersToSearchParams<F extends Record<string, any>>(
  filters: F,
  config: FilterFieldConfig<F>,
): URLSearchParams {
  const params = new URLSearchParams();
  const { arrayKeys, stringKeys, boolKeys, numberKeys = [], paramMap, defaults } = config;

  for (const key of arrayKeys) {
    const arr = filters[key] as string[];
    if (arr.length > 0) params.set((paramMap as any)[key] || (key as string), arr.join(","));
  }
  for (const key of stringKeys) {
    const val = filters[key] as string;
    if (val && val !== defaults[key]) params.set((paramMap as any)[key] || (key as string), val);
  }
  for (const key of boolKeys) {
    const val = filters[key] as boolean;
    if (val !== defaults[key]) params.set((paramMap as any)[key] || (key as string), "1");
  }
  for (const key of numberKeys) {
    const val = filters[key] as number;
    if (val !== defaults[key]) params.set((paramMap as any)[key] || (key as string), val.toString());
  }

  return params;
}

// ── Deserializer: URLSearchParams → filters ──

export function searchParamsToFilters<F extends Record<string, any>>(
  params: URLSearchParams,
  config: FilterFieldConfig<F>,
): F {
  const { arrayKeys, stringKeys, boolKeys, numberKeys = [], paramMap, defaults } = config;
  const filters = { ...defaults };

  for (const key of arrayKeys) {
    const paramKey = (paramMap as any)[key] || (key as string);
    const val = params.get(paramKey);
    if (val) (filters as any)[key] = val.split(",").filter(Boolean);
  }
  for (const key of stringKeys) {
    const paramKey = (paramMap as any)[key] || (key as string);
    const val = params.get(paramKey);
    if (val) (filters as any)[key] = val;
  }
  for (const key of boolKeys) {
    const paramKey = (paramMap as any)[key] || (key as string);
    if (params.get(paramKey) === "1") (filters as any)[key] = true;
  }
  for (const key of numberKeys) {
    const paramKey = (paramMap as any)[key] || (key as string);
    const val = params.get(paramKey);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) (filters as any)[key] = num;
    }
  }

  return filters;
}

// ── Hook factory ──

export interface UseFilterUrlSyncOptions {
  enabled?: boolean;
}

/**
 * Creates a bidirectional URL ↔ filter state sync hook.
 * Reads URL → state on mount, writes state → URL on changes.
 */
export function useUrlFilterSync<F extends Record<string, any>>(
  filters: F,
  setFilters: (f: F) => void,
  config: FilterFieldConfig<F>,
  /** Known param values to check whether URL has meaningful filter params */
  options?: UseFilterUrlSyncOptions,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialized = useRef(false);
  const enabled = options?.enabled !== false;

  const knownParams = new Set(
    Object.values(config.paramMap).filter(Boolean) as string[],
  );

  // On mount: URL → state
  useEffect(() => {
    if (!enabled || initialized.current) return;
    initialized.current = true;

    const hasParams = Array.from(searchParams.keys()).some((k) => knownParams.has(k));
    if (hasParams) {
      setFilters(searchParamsToFilters(searchParams, config));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // On change: state → URL
  useEffect(() => {
    if (!enabled || !initialized.current) return;

    const nextParams = filtersToSearchParams(filters, config);
    const nextStr = nextParams.toString();
    const currentStr = new URLSearchParams(location.search).toString();

    if (nextStr !== currentStr) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [enabled, filters, location.search, setSearchParams]);
}
