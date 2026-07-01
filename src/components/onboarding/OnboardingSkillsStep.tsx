/**
 * OnboardingSkillsStep — Lightweight skill picker for teacher onboarding.
 *
 * Reuses the same taxonomy query pattern as SkillsProficiencyEditor
 * but stores selections locally (parent component saves to teacher_skills on finish).
 *
 * Does NOT write to DB directly — that happens in the onboarding handleFinish.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillTerm {
  id: string;
  name: string;
  parent_id: string | null;
}

interface SkillGroup {
  parent: SkillTerm;
  children: SkillTerm[];
}

interface OnboardingSkillsStepProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const OnboardingSkillsStep = ({ selectedIds, onChange }: OnboardingSkillsStepProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: skillGroups = [], isLoading } = useQuery({
    queryKey: ["taxonomy_skills_hierarchy"],
    queryFn: async (): Promise<SkillGroup[]> => {
      const { data: tt } = await supabase
        .from("taxonomy_term_types")
        .select("id")
        .eq("key", "skills")
        .eq("is_active", true)
        .maybeSingle();
      if (!tt) return [];

      const { data: allTerms } = await supabase
        .from("taxonomy_terms")
        .select("id, name, parent_id")
        .eq("term_type_id", tt.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");

      if (!allTerms) return [];

      const parents = allTerms.filter((t) => !t.parent_id);
      const children = allTerms.filter((t) => t.parent_id);

      return parents.map((p) => ({
        parent: p,
        children: children.filter((c) => c.parent_id === p.id),
      }));
    },
  });

  const selectedSet = new Set(selectedIds);

  const toggleGroup = (parentId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(parentId) ? next.delete(parentId) : next.add(parentId);
      return next;
    });
  };

  const toggleSkill = (skillId: string) => {
    if (selectedSet.has(skillId)) {
      onChange(selectedIds.filter((id) => id !== skillId));
    } else {
      onChange([...selectedIds, skillId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-foreground justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading skills…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selection count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} skill{selectedIds.length !== 1 ? "s" : ""} selected
          {selectedIds.length < 2 && (
            <span className="text-destructive ml-1">(minimum 2)</span>
          )}
        </p>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedIds.length} selected
          </Badge>
        )}
      </div>

      {/* Hierarchical picker */}
      <div className="rounded-lg border border-border overflow-hidden">
        <ScrollArea className="h-[260px]">
          <div className="p-1.5 space-y-0.5">
            {skillGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.parent.id);
              const totalChildren = group.children.length;
              const selectedCount = group.children.filter((c) => selectedSet.has(c.id)).length;

              return (
                <div key={group.parent.id}>
                  <button
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-medium transition-colors",
                      "hover:bg-accent/50 text-foreground"
                    )}
                    onClick={() => toggleGroup(group.parent.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{group.parent.name}</span>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">
                        {selectedCount}/{totalChildren}
                      </Badge>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-5 space-y-px">
                      {group.children.map((child) => {
                        const isSelected = selectedSet.has(child.id);
                        return (
                          <label
                            key={child.id}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors",
                              isSelected
                                ? "bg-primary/10 text-foreground font-medium"
                                : "text-foreground hover:bg-accent/50"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSkill(child.id)}
                              className="h-3.5 w-3.5"
                            />
                            {child.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default OnboardingSkillsStep;
