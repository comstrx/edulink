import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAvailableCourses } from "@/hooks/usePackageCourses";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import type { PathwayFormValues, MilestoneEntry, ReflectionPromptEntry } from "@/lib/training/pathway-form-schema";

interface PathwayFormFieldsProps {
  form: UseFormReturn<PathwayFormValues>;
}

/**
 * Pathway-specific form fields for the training item editor.
 * Only rendered when type = 'pathway'.
 *
 * Phase 5.3 — Pathway Model Extension
 */
const PathwayFormFields = ({ form }: PathwayFormFieldsProps) => {
  const { data: courses, isLoading: coursesLoading } = useAvailableCourses();
  const requiredCourseIds = form.watch("required_course_ids");
  const milestones = form.watch("milestones");
  const reflectionPrompts = form.watch("reflection_prompts");

  const toggleCourse = (courseId: string) => {
    const current = form.getValues("required_course_ids");
    if (current.includes(courseId)) {
      form.setValue("required_course_ids", current.filter((id) => id !== courseId), { shouldValidate: true });
    } else {
      form.setValue("required_course_ids", [...current, courseId], { shouldValidate: true });
    }
  };

  // ── Milestone helpers ──
  const addMilestone = () => {
    const current = form.getValues("milestones");
    const newOrder = current.length + 1;
    form.setValue("milestones", [
      ...current,
      { id: `milestone_${Date.now()}`, title: "", description: null, order: newOrder, linked_course_ids: [] },
    ]);
  };

  const removeMilestone = (index: number) => {
    const current = form.getValues("milestones");
    form.setValue(
      "milestones",
      current.filter((_, i) => i !== index).map((m, i) => ({ ...m, order: i + 1 })),
      { shouldValidate: true },
    );
  };

  const updateMilestone = (index: number, field: keyof MilestoneEntry, value: unknown) => {
    const current = [...form.getValues("milestones")];
    current[index] = { ...current[index], [field]: value };
    form.setValue("milestones", current, { shouldValidate: true });
  };

  const toggleMilestoneCourse = (milestoneIndex: number, courseId: string) => {
    const current = [...form.getValues("milestones")];
    const milestone = current[milestoneIndex];
    const linked = milestone.linked_course_ids.includes(courseId)
      ? milestone.linked_course_ids.filter((id) => id !== courseId)
      : [...milestone.linked_course_ids, courseId];
    current[milestoneIndex] = { ...milestone, linked_course_ids: linked };
    form.setValue("milestones", current, { shouldValidate: true });
  };

  // ── Reflection prompt helpers ──
  const addPrompt = () => {
    const current = form.getValues("reflection_prompts");
    const newOrder = current.length + 1;
    form.setValue("reflection_prompts", [
      ...current,
      { id: `prompt_${Date.now()}`, prompt: "", stage_id: null, order: newOrder },
    ]);
  };

  const removePrompt = (index: number) => {
    const current = form.getValues("reflection_prompts");
    form.setValue(
      "reflection_prompts",
      current.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i + 1 })),
      { shouldValidate: true },
    );
  };

  const updatePrompt = (index: number, field: keyof ReflectionPromptEntry, value: unknown) => {
    const current = [...form.getValues("reflection_prompts")];
    current[index] = { ...current[index], [field]: value };
    form.setValue("reflection_prompts", current, { shouldValidate: true });
  };

  // Resolve course titles for display
  const getCourseTitle = (id: string) => courses?.find((c) => c.id === id)?.title ?? id;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        Pathway Configuration
      </h3>

      {/* Target Competencies */}
      <div className="space-y-4">
        <FormField control={form.control} name="skill_term_ids" render={({ field }) => (
          <FormItem>
            <TaxonomyMultiSelect domainKey="skills" values={field.value} onChange={field.onChange} label="Target Skills" />
            <FormDescription className="text-xs">Skills this pathway is designed to build.</FormDescription>
          </FormItem>
        )} />
        <FormField control={form.control} name="competency_domain_term_ids" render={({ field }) => (
          <FormItem>
            <TaxonomyMultiSelect domainKey="competency_domains" values={field.value} onChange={field.onChange} label="Target Competency Domains" />
            <FormDescription className="text-xs">High-level competency domains targeted by this pathway.</FormDescription>
          </FormItem>
        )} />
      </div>

      {/* Required Courses */}
      <FormField
        control={form.control}
        name="required_course_ids"
        render={() => (
          <FormItem>
            <FormLabel>Required Courses</FormLabel>
            <FormDescription>Select courses that constitute the pathway journey. Only course-type items are shown.</FormDescription>
            {coursesLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
              </div>
            ) : !courses?.length ? (
              <p className="text-sm text-muted-foreground py-2">No courses available. Create courses first.</p>
            ) : (
              <>
                {requiredCourseIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pb-2">
                    {requiredCourseIds.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleCourse(id)}>
                        {getCourseTitle(id)} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <ScrollArea className="h-48 rounded-md border border-border p-2">
                  <div className="space-y-1">
                    {courses.map((course) => (
                      <label key={course.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                        <Checkbox checked={requiredCourseIds.includes(course.id)} onCheckedChange={() => toggleCourse(course.id)} />
                        <span className="flex-1 text-foreground">{course.title}</span>
                        {course.duration && <span className="text-xs text-muted-foreground">{course.duration}</span>}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* CRI Target */}
      <FormField control={form.control} name="cri_target" render={({ field }) => (
        <FormItem>
          <FormLabel>CRI Target Value</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              className="w-40"
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
            />
          </FormControl>
          <FormDescription className="text-xs">Intended CRI readiness target for pathway completion. Metadata only.</FormDescription>
          <FormMessage />
        </FormItem>
      )} />

      {/* Toggles */}
      <div className="grid sm:grid-cols-2 gap-6">
        <FormField control={form.control} name="credential_eligible" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-sm">Credential Eligible</FormLabel>
              <FormDescription className="text-xs">Pathway awards a credential on completion.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="mentor_supported" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-sm">Mentor Supported</FormLabel>
              <FormDescription className="text-xs">Pathway includes mentorship.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <FormLabel>Milestones</FormLabel>
          <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
            <Plus className="h-3 w-3 mr-1" /> Add Milestone
          </Button>
        </div>
        <FormDescription className="text-xs">Define the progression stages of this pathway. Design metadata only.</FormDescription>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No milestones defined yet.</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone, mi) => (
              <div key={milestone.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Stage {milestone.order}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMilestone(mi)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Title</label>
                    <Input
                      value={milestone.title}
                      onChange={(e) => updateMilestone(mi, "title", e.target.value)}
                      placeholder="e.g. Foundations"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">ID</label>
                    <Input
                      value={milestone.id}
                      onChange={(e) => updateMilestone(mi, "id", e.target.value)}
                      placeholder="e.g. foundations"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Description</label>
                  <Textarea
                    value={milestone.description ?? ""}
                    onChange={(e) => updateMilestone(mi, "description", e.target.value || null)}
                    placeholder="Brief description of this stage"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                {requiredCourseIds.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-foreground">Linked Courses</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {requiredCourseIds.map((cid) => (
                        <Badge
                          key={cid}
                          variant={milestone.linked_course_ids.includes(cid) ? "default" : "outline"}
                          className="text-xs cursor-pointer"
                          onClick={() => toggleMilestoneCourse(mi, cid)}
                        >
                          {getCourseTitle(cid)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reflection Prompts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <FormLabel>Reflection Prompts</FormLabel>
          <Button type="button" variant="outline" size="sm" onClick={addPrompt}>
            <Plus className="h-3 w-3 mr-1" /> Add Prompt
          </Button>
        </div>
        <FormDescription className="text-xs">Pedagogical prompts for professional growth reflection. Design metadata only.</FormDescription>
        {reflectionPrompts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No reflection prompts defined yet.</p>
        ) : (
          <div className="space-y-3">
            {reflectionPrompts.map((rp, ri) => (
              <div key={rp.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Prompt {rp.order}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePrompt(ri)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Prompt Text</label>
                  <Textarea
                    value={rp.prompt}
                    onChange={(e) => updatePrompt(ri, "prompt", e.target.value)}
                    placeholder="What changed in your classroom practice after this stage?"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                {milestones.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-foreground">Linked Stage</label>
                    <Select
                      value={rp.stage_id ?? ""}
                      onValueChange={(v) => updatePrompt(ri, "stage_id", v || null)}
                    >
                      <SelectTrigger className="w-48 mt-1"><SelectValue placeholder="Select stage…" /></SelectTrigger>
                      <SelectContent>
                        {milestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.title || m.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PathwayFormFields;
