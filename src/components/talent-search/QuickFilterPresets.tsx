/**
 * QuickFilterPresets — Shared quick filter chips for talent search.
 * Used by both public and school talent search pages.
 */
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaxonomyPresets } from "@/hooks/useTaxonomyPresets";
import type { TalentFilters, SortOption } from "./TalentSearchFilters";

interface QuickFilterPresetsProps {
  filters: TalentFilters;
  sort: SortOption;
  onFiltersChange: (f: TalentFilters) => void;
  onSortChange: (s: SortOption) => void;
}

const Chip = ({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon?: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 text-xs h-8 px-4 font-medium transition-all select-none rounded-full border whitespace-nowrap",
      active
        ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
        : "bg-card text-muted-foreground border-border/60 hover:bg-accent hover:text-foreground hover:border-border"
    )}
  >
    {icon}
    {label}
  </button>
);

const QuickFilterPresets = ({ filters, sort, onFiltersChange, onSortChange }: QuickFilterPresetsProps) => {
  const presets = useTaxonomyPresets();

  if (!presets.isReady) return null;

  const eslActive = presets.eslSubjectIds.length > 0 &&
    presets.eslSubjectIds.every((id) => filters.subjects.includes(id));

  const intlActive = presets.intlCurriculumIds.length > 0 &&
    presets.intlCurriculumIds.every((id) => filters.curriculums.includes(id));

  const availNowActive = filters.availabilityStatuses.length > 0;

  const toggleESL = () => {
    if (presets.eslSubjectIds.length === 0) return;
    onFiltersChange({
      ...filters,
      subjects: eslActive
        ? filters.subjects.filter((id) => !presets.eslSubjectIds.includes(id))
        : [...new Set([...filters.subjects, ...presets.eslSubjectIds])],
    });
  };

  const toggleIntl = () => {
    if (presets.intlCurriculumIds.length === 0) return;
    onFiltersChange({
      ...filters,
      curriculums: intlActive
        ? filters.curriculums.filter((id) => !presets.intlCurriculumIds.includes(id))
        : [...new Set([...filters.curriculums, ...presets.intlCurriculumIds])],
    });
  };

  const toggleAvailableNow = () => {
    // Toggle: if any availability filter is set, clear it; otherwise we need the "available_now" term
    // Since we don't know the exact ID, we toggle the availabilityStatuses presence
    // This is a UI shortcut — the actual filtering happens via the sidebar
    if (availNowActive) {
      onFiltersChange({ ...filters, availabilityStatuses: [] });
    }
    // If not active, we can't reliably set without the term ID
    // So this chip only clears — full selection via sidebar
  };

  const toggleRecommended = () => {
    onSortChange(sort === "recommended" ? "relevant" : "recommended");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip label="ESL / ELT" active={eslActive} onClick={toggleESL} />
      <Chip label="Intl School Exp" active={intlActive} onClick={toggleIntl} />
      <Chip
        label="Recommended"
        active={sort === "recommended"}
        onClick={toggleRecommended}
        icon={<Sparkles className="h-3 w-3" />}
      />
    </div>
  );
};

export default QuickFilterPresets;
