import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";

export interface FilterChip {
  label: string;
  onRemove: () => void;
}

/**
 * Shared hook that wraps useTaxonomyNames for filter chip resolution.
 * Provides a `resolve` function and helpers for building chips
 * from array-based or single-value taxonomy filters.
 */
export function useFilterChipBuilder(taxonomyIds: string[]) {
  const { data: nameMap } = useTaxonomyNames(taxonomyIds);
  const resolve = (id: string) => nameMap?.[id] ?? id.slice(0, 8);

  /** Build chips from an array of taxonomy IDs, with per-item removal. */
  function arrayChips<F extends object>(
    ids: string[],
    key: keyof F & string,
    filters: F,
    onChange: (f: F) => void
  ): FilterChip[] {
    return ids.map((id) => ({
      label: resolve(id),
      onRemove: () =>
        onChange({
          ...filters,
          [key]: ((filters as any)[key] as string[]).filter((v: string) => v !== id),
        }),
    }));
  }

  /** Build a single chip from a non-empty string taxonomy ID, clearing dependent keys on remove. */
  function singleChip<F extends object>(
    id: string | undefined | null,
    resetKeys: Partial<F>,
    filters: F,
    onChange: (f: F) => void
  ): FilterChip | null {
    if (!id) return null;
    return {
      label: resolve(id),
      onRemove: () => onChange({ ...filters, ...resetKeys }),
    };
  }

  return { resolve, arrayChips, singleChip };
}
