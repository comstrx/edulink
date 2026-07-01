/**
 * LanguageProficiencyEditor
 * 
 * Manages teacher language-level pairs via the teacher_languages relational table.
 * Each row is a language + optional proficiency level.
 * Saves are immediate (optimistic via invalidation).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherLanguages, TeacherLanguageEntry } from "@/hooks/useTeacherLanguages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LanguageProficiencyEditorProps {
  teacherId: string;
  labels?: {
    title?: string;
    addLanguage?: string;
    selectLanguage?: string;
    selectLevel?: string;
    noLanguages?: string;
  };
}

const LanguageProficiencyEditor = ({ teacherId, labels }: LanguageProficiencyEditorProps) => {
  const qc = useQueryClient();
  const [addingNew, setAddingNew] = useState(false);
  const [newLangId, setNewLangId] = useState("");
  const [newLevelId, setNewLevelId] = useState("");

  // Current languages for this teacher
  const { data: entries = [], isLoading: entriesLoading } = useTeacherLanguages(teacherId);

  // All language terms
  const { data: allLanguages = [] } = useQuery({
    queryKey: ["taxonomy_terms_by_key", "languages"],
    queryFn: async () => {
      const { data: tt } = await supabase
        .from("taxonomy_term_types")
        .select("id")
        .eq("key", "languages")
        .eq("is_active", true)
        .maybeSingle();
      if (!tt) return [];
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .eq("term_type_id", tt.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      return data ?? [];
    },
  });

  // All language level terms
  const { data: allLevels = [] } = useQuery({
    queryKey: ["taxonomy_terms_by_key", "language_levels"],
    queryFn: async () => {
      const { data: tt } = await supabase
        .from("taxonomy_term_types")
        .select("id")
        .eq("key", "language_levels")
        .eq("is_active", true)
        .maybeSingle();
      if (!tt) return [];
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("id, name")
        .eq("term_type_id", tt.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      return data ?? [];
    },
  });

  // Languages already added (to exclude from dropdown)
  const usedLangIds = new Set(entries.map((e) => e.language_term_id));
  const availableLanguages = allLanguages.filter((l) => !usedLangIds.has(l.id));

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newLangId) throw new Error("Select a language");
      const { error } = await supabase.from("teacher_languages").insert({
        teacher_id: teacherId,
        language_term_id: newLangId,
        language_level_term_id: newLevelId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_languages", teacherId] });
      setNewLangId("");
      setNewLevelId("");
      setAddingNew(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Update level mutation
  const updateLevelMutation = useMutation({
    mutationFn: async ({ entryId, levelId }: { entryId: string; levelId: string | null }) => {
      const { error } = await supabase
        .from("teacher_languages")
        .update({ language_level_term_id: levelId })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_languages", teacherId] });
    },
    onError: (err) => toast.error(err.message),
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // Skip legacy entries — they can't be deleted from relational table
      if (entryId.startsWith("legacy-")) {
        throw new Error("Legacy entries must be migrated first");
      }
      const { error } = await supabase
        .from("teacher_languages")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_languages", teacherId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleLevelChange = (entry: TeacherLanguageEntry, levelId: string) => {
    if (entry.id.startsWith("legacy-")) return;
    const resolvedLevel = levelId === "__clear__" ? null : levelId;
    updateLevelMutation.mutate({ entryId: entry.id, levelId: resolvedLevel });
  };

  if (entriesLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Loading languages…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5" />
          {labels?.title ?? "Languages & Proficiency"}
        </Label>
        {!addingNew && availableLanguages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary"
            onClick={() => setAddingNew(true)}
          >
            <Plus className="h-3 w-3" />
            {labels?.addLanguage ?? "Add Language"}
          </Button>
        )}
      </div>

      {/* Existing entries */}
      {entries.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground py-2">
          {labels?.noLanguages ?? "No languages added yet."}
        </p>
      )}

      <div className="space-y-2">
        {entries.map((entry) => {
          const isLegacy = entry.id.startsWith("legacy-");
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-background",
                "transition-colors hover:border-border"
              )}
            >
              {/* Language name */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {entry.language_name ?? "Unknown"}
                </span>
                {isLegacy && (
                  <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1 text-muted-foreground">
                    migrated
                  </Badge>
                )}
              </div>

              {/* Level selector */}
              <Select
                value={entry.language_level_term_id ?? "__clear__"}
                onValueChange={(v) => handleLevelChange(entry, v)}
                disabled={isLegacy}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder={labels?.selectLevel ?? "Set level…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__" className="text-xs text-muted-foreground">
                    {labels?.selectLevel ?? "Set level…"}
                  </SelectItem>
                  {allLevels.map((lv) => (
                    <SelectItem key={lv.id} value={lv.id} className="text-xs">
                      {lv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Remove */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeMutation.mutate(entry.id)}
                disabled={isLegacy || removeMutation.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        {/* Add new row */}
        {addingNew && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
            <Select value={newLangId} onValueChange={setNewLangId}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder={labels?.selectLanguage ?? "Select language…"} />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={newLevelId} onValueChange={setNewLevelId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder={labels?.selectLevel ?? "Set level…"} />
              </SelectTrigger>
              <SelectContent>
                {allLevels.map((lv) => (
                  <SelectItem key={lv.id} value={lv.id} className="text-xs">
                    {lv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => addMutation.mutate()}
              disabled={!newLangId || addMutation.isPending}
            >
              {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { setAddingNew(false); setNewLangId(""); setNewLevelId(""); }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageProficiencyEditor;
