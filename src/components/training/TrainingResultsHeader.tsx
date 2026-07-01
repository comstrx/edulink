import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TrainingResultsHeaderProps {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  sortBy: string;
  sortOptions: { value: string; label: string }[];
  onSearchChange: (query: string) => void;
  onSortChange: (sort: string) => void;
  itemLabel?: string;
}

/**
 * Shared header for training catalog results — search bar, result count, sort dropdown.
 */
const TrainingResultsHeader = ({
  totalCount,
  currentPage,
  pageSize,
  searchQuery,
  sortBy,
  sortOptions,
  onSearchChange,
  onSortChange,
  itemLabel = "results",
}: TrainingResultsHeaderProps) => {
  const from = currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${itemLabel}…`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Count + sort row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? `No ${itemLabel} found`
            : `Showing ${from}–${to} of ${totalCount} ${itemLabel}`}
        </p>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TrainingResultsHeader;
