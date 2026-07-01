/**
 * SkillsProficiencyEditor
 *
 * Manages teacher skills via the teacher_skills relational table.
 * Skills taxonomy is hierarchical (parent categories → child skills).
 * Each skill can have an optional proficiency level and years of experience.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherSkills, TeacherSkillEntry } from "@/hooks/useTeacherSkills";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROFICIENCY_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
] as const;

interface SkillsProficiencyEditorProps {
  teacherId: string;
  labels?: {
    title?: string;
    addSkills?: string;
    noSkills?: string;
    level?: string;
    years?: string;
  };
}

interface SkillTerm {
  id: string;
  name: string;
  parent_id: string | null;
}

interface SkillGroup {
  parent: SkillTerm;
  children: SkillTerm[];
}

const SkillsProficiencyEditor = ({ teacherId, labels }: SkillsProficiencyEditorProps) => {
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: entries = [], isLoading: entriesLoading } = useTeacherSkills(teacherId);

  // Load hierarchical skills taxonomy
  const { data: skillGroups = [] } = useQuery({
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

  const addedSkillIds = new Set(entries.map((e) => e.skill_term_id));

  const toggleGroup = (parentId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(parentId) ? next.delete(parentId) : next.add(parentId);
      return next;
    });
  };

  // Add skill mutation
  const addMutation = useMutation({
    mutationFn: async (skillTermId: string) => {
      const { error } = await supabase.from("teacher_skills").insert({
        teacher_id: teacherId,
        skill_term_id: skillTermId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_skills", teacherId] });
      qc.invalidateQueries({ queryKey: ["skill_profile_display", teacherId] });
      toast.success("Skill added 🎯");
    },
    onError: (err) => toast.error(err.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      entryId,
      proficiency_level,
      years_experience,
    }: {
      entryId: string;
      proficiency_level?: string | null;
      years_experience?: number | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (proficiency_level !== undefined) updates.proficiency_level = proficiency_level;
      if (years_experience !== undefined) updates.years_experience = years_experience;

      const { error } = await supabase
        .from("teacher_skills")
        .update(updates)
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_skills", teacherId] });
      qc.invalidateQueries({ queryKey: ["skill_profile_display", teacherId] });
    },
    onError: (err) => toast.error(err.message),
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("teacher_skills")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_skills", teacherId] });
      qc.invalidateQueries({ queryKey: ["skill_profile_display", teacherId] });
      toast.success("Skill removed");
    },
    onError: (err) => toast.error(err.message),
  });

  if (entriesLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Loading skills…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {labels?.title ?? "Professional Skills"}
        </Label>
        {!showPicker && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary"
            onClick={() => setShowPicker(true)}
          >
            <Plus className="h-3 w-3" />
            {labels?.addSkills ?? "Add Skills"}
          </Button>
        )}
      </div>

      {/* Current skills list */}
      {entries.length === 0 && !showPicker && (
        <p className="text-xs text-muted-foreground py-2">
          {labels?.noSkills ?? "No skills added yet."}
        </p>
      )}

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-background hover:border-border transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">
                {entry.skill_name ?? "Unknown"}
              </span>
            </div>

            {/* Proficiency level */}
            <Select
              value={entry.proficiency_level ?? "__clear__"}
              onValueChange={(v) =>
                updateMutation.mutate({
                  entryId: entry.id,
                  proficiency_level: v === "__clear__" ? null : v,
                })
              }
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder={labels?.level ?? "Level…"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__" className="text-xs text-muted-foreground">
                  {labels?.level ?? "Level…"}
                </SelectItem>
                {PROFICIENCY_LEVELS.map((lv) => (
                  <SelectItem key={lv.value} value={lv.value} className="text-xs">
                    {lv.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Years experience */}
            <Input
              type="number"
              min={0}
              max={50}
              placeholder={labels?.years ?? "Yrs"}
              className="w-[70px] h-8 text-xs"
              value={entry.years_experience ?? ""}
              onChange={(e) =>
                updateMutation.mutate({
                  entryId: entry.id,
                  years_experience: e.target.value ? Number(e.target.value) : null,
                })
              }
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeMutation.mutate(entry.id)}
              disabled={removeMutation.isPending}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Hierarchical skill picker */}
      {showPicker && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <span className="text-xs font-medium text-foreground">Select skills to add</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowPicker(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ScrollArea className="h-[220px]">
            <div className="p-1.5 space-y-0.5">
              {skillGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.parent.id);
                const availableChildren = group.children.filter(
                  (c) => !addedSkillIds.has(c.id)
                );
                const totalChildren = group.children.length;
                const addedCount = totalChildren - availableChildren.length;

                return (
                  <div key={group.parent.id}>
                    {/* Category header */}
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
                      {addedCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">
                          {addedCount}/{totalChildren}
                        </Badge>
                      )}
                    </button>

                    {/* Child skills */}
                    {isExpanded && (
                      <div className="ml-5 space-y-px">
                        {group.children.map((child) => {
                          const isAdded = addedSkillIds.has(child.id);
                          return (
                            <label
                              key={child.id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors",
                                isAdded
                                  ? "bg-primary/10 text-foreground font-medium"
                                  : "text-foreground hover:bg-accent/50"
                              )}
                            >
                              <Checkbox
                                checked={isAdded}
                                disabled={addMutation.isPending}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    addMutation.mutate(child.id);
                                  } else {
                                    const entry = entries.find(
                                      (e) => e.skill_term_id === child.id
                                    );
                                    if (entry) removeMutation.mutate(entry.id);
                                  }
                                }}
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
      )}
    </div>
  );
};

export default SkillsProficiencyEditor;
