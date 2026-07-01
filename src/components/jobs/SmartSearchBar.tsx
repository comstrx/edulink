import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { useRecentSearches } from "@/hooks/useRecentSearches";

interface SuggestionSelection {
  value: string;
  category?: "subject" | "curriculum" | "location" | "role" | "recent";
  termId?: string;
}

interface SmartSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when a taxonomy suggestion is selected — allows parent to set a filter ID instead of text */
  onSuggestionSelect?: (suggestion: SuggestionSelection) => void;
}

const SmartSearchBar = ({ value, onChange, onSuggestionSelect }: SmartSearchBarProps) => {
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Load dynamic suggestions from taxonomy terms
  const { data: suggestions = [], isLoading } = useSearchSuggestions();
  
  // Track recent searches for enhanced suggestions
  const { recentSearches, addSearch } = useRecentSearches();

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Call onChange immediately and track search (debouncing handled in useJobSearch)
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    if (newValue.trim()) {
      addSearch(newValue);
    }
  };

  const handleSuggestionClick = (suggestion: { value: string; category: string; termId?: string }) => {
    // If the suggestion has a termId and the parent supports filter-based selection, use that
    if (suggestion.termId && suggestion.category !== "recent" && onSuggestionSelect) {
      onSuggestionSelect({
        value: suggestion.value,
        category: suggestion.category as SuggestionSelection["category"],
        termId: suggestion.termId,
      });
      // Clear the text search since we're applying a structured filter
      setInputValue("");
      onChange("");
    } else {
      // Fallback: set as text search
      handleInputChange(suggestion.value);
    }
    setFocused(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    // Combine taxonomy suggestions with recent searches
    const combinedSuggestions = [...suggestions];
    
    // Add recent searches as suggestions (but avoid duplicates)
    recentSearches.forEach(recent => {
      if (!combinedSuggestions.some(s => s.value.toLowerCase() === recent.query.toLowerCase())) {
        combinedSuggestions.unshift({
          value: recent.query,
          category: "recent" as const,
        });
      }
    });
    
    if (!combinedSuggestions.length || isLoading) {
      // Fallback suggestions while loading
      const fallbackSuggestions = [
        { value: "Mathematics Teacher", category: "subject" as const },
        { value: "ESL Instructor", category: "subject" as const },
        { value: "IB Curriculum", category: "curriculum" as const },
        { value: "Dubai", category: "location" as const },
        { value: "Head of Department", category: "role" as const },
        { value: "Primary Teacher", category: "role" as const },
      ];
      
      if (!inputValue.trim()) return fallbackSuggestions.slice(0, 6);
      const q = inputValue.toLowerCase();
      return fallbackSuggestions.filter((s) => s.value.toLowerCase().includes(q)).slice(0, 8);
    }
    
    if (!inputValue.trim()) {
      // Show recent searches first, then popular suggestions
      return combinedSuggestions.slice(0, 6);
    }
    
    const q = inputValue.toLowerCase();
    return combinedSuggestions
      .filter((s) => s.value.toLowerCase().includes(q))
      .slice(0, 8);
  }, [inputValue, suggestions, recentSearches, isLoading]);

  const showDropdown = focused && filtered.length > 0;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "subject": return "Subject";
      case "curriculum": return "Curriculum";
      case "location": return "Location";
      case "role": return "Role";
      case "recent": return null;
      default: return null;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 pr-9 h-11 text-sm bg-background border-border/60 shadow-sm"
          placeholder={t("jobs.search.placeholder")}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setFocused(true)}
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => handleInputChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {!inputValue.trim() && (
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("jobs.search.suggestions")}
            </p>
          )}
          {filtered.map((suggestion) => {
            const label = getCategoryLabel(suggestion.category);
            const isRecent = suggestion.category === "recent";
            return (
              <button
                key={`${suggestion.category}-${suggestion.value}`}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(suggestion);
                }}
              >
                {isRecent ? (
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                  <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                <span className="truncate flex-1">{suggestion.value}</span>
                {label && (
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider shrink-0">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SmartSearchBar;
