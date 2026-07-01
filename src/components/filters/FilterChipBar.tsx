import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FilterChip {
  label: string;
  onRemove: () => void;
}

interface FilterChipBarProps {
  chips: FilterChip[];
  onClearAll: () => void;
  clearLabel?: string;
}

/**
 * Shared presentation component for rendering active filter chips
 * with a "Clear All" action. Used by both Job Search and Talent Search.
 */
const FilterChipBar = ({ chips, onClearAll, clearLabel }: FilterChipBarProps) => {
  const { t } = useLanguage();

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="gap-1 cursor-pointer pl-2 pr-1 py-0.5 text-[11px] hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={chip.onRemove}
        >
          {chip.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-[11px] h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onClearAll}
      >
        {clearLabel ?? t("jobs.chip.clearAll")}
      </Button>
    </div>
  );
};

export default FilterChipBar;
