import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TaxonomySingleSelectProps {
  domainKey: string;
  value: string;
  onChange: (termId: string) => void;
  label?: string;
  placeholder?: string;
  parentId?: string;
  /** When true, won't fetch terms until parentId is provided */
  requiresParent?: boolean;
  disabled?: boolean;
  /** Extra classes for the SelectTrigger */
  triggerClassName?: string;
}

const TaxonomySingleSelect = ({
  domainKey,
  value,
  onChange,
  label,
  placeholder = "Select…",
  parentId,
  requiresParent = false,
  disabled = false,
  triggerClassName,
}: TaxonomySingleSelectProps) => {
  const shouldFetch = !requiresParent || !!parentId;

  const { data: terms, isLoading } = useQuery({
    queryKey: ["taxonomy_terms_by_key", domainKey, parentId],
    queryFn: async () => {
      const { data: tt, error: ttErr } = await supabase
        .from("taxonomy_term_types")
        .select("id")
        .eq("key", domainKey)
        .eq("is_active", true)
        .single();
      if (ttErr) throw ttErr;

      let query = supabase
        .from("taxonomy_terms")
        .select("id, name")
        .eq("term_type_id", tt.id)
        .eq("is_active", true);

      if (parentId) {
        query = query.eq("parent_id", parentId);
      }

      const { data, error } = await query.order("sort_order").order("name");
      if (error) throw error;
      return data;
    },
    enabled: shouldFetch,
  });

  const isDisabled = disabled || isLoading || !shouldFetch;

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium text-muted-foreground">{label}</Label>}
      <Select value={value || "__clear__"} onValueChange={(v) => onChange(v === "__clear__" ? "" : v)} disabled={isDisabled}>
        <SelectTrigger className={triggerClassName || "h-8 text-xs"}>
          <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__" className="text-xs text-muted-foreground">
            {placeholder}
          </SelectItem>
          {terms?.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-xs">
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TaxonomySingleSelect;
