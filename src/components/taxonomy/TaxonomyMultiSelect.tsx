import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxonomyMultiSelectProps {
  domainKey: string;
  values: string[];
  onChange: (termIds: string[]) => void;
  label?: string;
}

const TaxonomyMultiSelect = ({
  domainKey,
  values,
  onChange,
  label,
}: TaxonomyMultiSelectProps) => {
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

  const filtered = terms?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasMany = (terms?.length ?? 0) > 6;
  const showSearch = hasMany;

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium text-muted-foreground">{label}</Label>}

      {/* Selected badges */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((id) => {
            const name = terms?.find((t) => t.id === id)?.name ?? id;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer text-[11px] h-5 gap-0.5 px-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => toggle(id)}
              >
                {name}
                <X className="h-2.5 w-2.5" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Search + list container */}
      <div className={cn(
        "rounded-md border border-border bg-background overflow-hidden",
        "transition-colors focus-within:ring-1 focus-within:ring-ring"
      )}>
        {/* Search input */}
        {showSearch && (
          <div className="relative border-b border-border">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              className="pl-7 h-7 text-xs border-0 rounded-none shadow-none focus-visible:ring-0 bg-transparent"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Options list */}
        <ScrollArea className={cn(hasMany ? "h-[140px]" : "h-auto max-h-[140px]")}>
          <div className="p-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-3 gap-1.5 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : filtered && filtered.length > 0 ? (
              <div className="space-y-px">
                {filtered.map((t) => {
                  const isSelected = values.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 py-1 px-1.5 cursor-pointer rounded text-xs transition-colors",
                        isSelected
                          ? "bg-primary/5 text-foreground font-medium"
                          : "text-foreground hover:bg-accent/50"
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
                })}
              </div>
            ) : search ? (
              <p className="text-muted-foreground text-[11px] py-3 text-center">No matches</p>
            ) : (
              <p className="text-muted-foreground text-[11px] py-3 text-center">No terms available</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TaxonomyMultiSelect;
