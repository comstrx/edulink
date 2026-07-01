import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxonomyCompactSelectProps {
  domainKey: string;
  values: string[];
  onChange: (termIds: string[]) => void;
  label?: string;
  placeholder?: string;
}

const TaxonomyCompactSelect = ({
  domainKey,
  values,
  onChange,
  label,
  placeholder = "Select…",
}: TaxonomyCompactSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: terms, isLoading } = useQuery({
    queryKey: ["taxonomy_terms_by_key", domainKey],
    queryFn: async () => {
      const { data: tt, error: ttErr } = await supabase
        .from("taxonomy_term_types")
        .select("id")
        .eq("key", domainKey)
        .eq("is_active", true)
        .maybeSingle();
      if (ttErr) throw ttErr;
      if (!tt) return [];
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .eq("term_type_id", tt.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggle = (id: string) => {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  };

  const filtered = useMemo(() =>
    terms?.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) ?? [],
    [terms, search]
  );

  const selectedNames = useMemo(() => {
    if (!terms) return [];
    return values.map((id) => terms.find((t) => t.id === id)?.name ?? id).filter(Boolean);
  }, [terms, values]);

  const triggerLabel = values.length === 0
    ? placeholder
    : values.length === 1
      ? selectedNames[0]
      : `${values.length} selected`;

  return (
    <div className="space-y-1">
      {label && <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-8 justify-between text-xs font-normal border-border/60",
              values.length === 0 && "text-muted-foreground"
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          {/* Search */}
          <div className="relative border-b border-border">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="pl-7 h-8 text-xs border-0 rounded-none shadow-none focus-visible:ring-0 bg-transparent"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {/* Options */}
          <ScrollArea className="h-[180px]">
            <div className="p-1">
              {isLoading ? (
                <p className="text-[11px] text-muted-foreground text-center py-4">Loading…</p>
              ) : filtered.length > 0 ? (
                filtered.map((t) => {
                  const isSelected = values.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 py-1 px-2 cursor-pointer rounded text-xs transition-colors",
                        isSelected ? "bg-primary/5 font-medium" : "hover:bg-accent/50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(t.id)}
                        className="h-3.5 w-3.5"
                      />
                      {t.name}
                    </label>
                  );
                })
              ) : (
                <p className="text-[11px] text-muted-foreground text-center py-4">No results</p>
              )}
            </div>
          </ScrollArea>
          {/* Selected count + clear */}
          {values.length > 0 && (
            <div className="border-t border-border px-2 py-1.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{values.length} selected</span>
              <Button variant="ghost" size="sm" className="h-5 text-[11px] px-1.5 text-destructive" onClick={() => onChange([])}>
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {/* Selected badges inline */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {selectedNames.slice(0, 3).map((name, i) => (
            <Badge
              key={values[i]}
              variant="secondary"
              className="cursor-pointer text-[10px] h-5 gap-0.5 px-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => toggle(values[i])}
            >
              {name}
              <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
          {values.length > 3 && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              +{values.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxonomyCompactSelect;
