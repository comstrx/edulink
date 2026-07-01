import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Shared page-replace pagination: Prev / numbered (with ellipsis) / Next.
 * Consumed by Jobs Hub, Public Talent Search, and School Talent Search.
 * Uses 0-indexed pages internally; displays 1-indexed labels.
 */
const SearchPagination = ({ currentPage, totalPages, isLoading, onPageChange, className }: SearchPaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-1 pt-6 pb-2", className)}>
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-8 px-3"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0 || isLoading}
      >
        Prev
      </Button>
      {Array.from({ length: totalPages }, (_, i) => {
        if (
          totalPages <= 7 ||
          i === 0 ||
          i === totalPages - 1 ||
          (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
          return (
            <Button
              key={i}
              variant={i === currentPage ? "default" : "outline"}
              size="sm"
              className="text-xs h-8 w-8 p-0"
              onClick={() => onPageChange(i)}
              disabled={isLoading}
            >
              {i + 1}
            </Button>
          );
        }
        if (i === currentPage - 2 || i === currentPage + 2) {
          return (
            <span key={i} className="text-xs text-muted-foreground px-1">…</span>
          );
        }
        return null;
      })}
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-8 px-3"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1 || isLoading}
      >
        Next
      </Button>
    </div>
  );
};

export default SearchPagination;
