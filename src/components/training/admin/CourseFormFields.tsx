import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import type { CourseFormValues } from "@/lib/training/course-form-schema";

interface CourseFormFieldsProps {
  form: UseFormReturn<CourseFormValues>;
}

/**
 * Course-specific form fields for the training item editor.
 * Only rendered when type = 'course'.
 *
 * Phase 5.1 — Course Model Extension
 */
const CourseFormFields = ({ form }: CourseFormFieldsProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        Course-Specific Fields
      </h3>

      {/* Duration Hours */}
      <FormField
        control={form.control}
        name="duration_hours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Duration (hours)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 12"
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? null : parseInt(val, 10));
                }}
              />
            </FormControl>
            <FormDescription>Estimated total learning hours for this course.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Competency Tags: Skills */}
      <FormField
        control={form.control}
        name="skill_term_ids"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Skills</FormLabel>
            <TaxonomyMultiSelect
              domainKey="skills"
              values={field.value}
              onChange={field.onChange}
              label=""
            />
            <FormDescription>Skill taxonomy terms this course develops.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Competency Tags: Competency Domains */}
      <FormField
        control={form.control}
        name="competency_domain_term_ids"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Competency Domains</FormLabel>
            <TaxonomyMultiSelect
              domainKey="competency_domains"
              values={field.value}
              onChange={field.onChange}
              label=""
            />
            <FormDescription>High-level competency domains this course covers.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* CRI Boost Value */}
      <FormField
        control={form.control}
        name="cri_boost_value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CRI Boost Value</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 15"
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? null : parseInt(val, 10));
                }}
              />
            </FormControl>
            <FormDescription>
              Potential CRI contribution weight (0–100). Static metadata only.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Toggles row */}
      <div className="grid sm:grid-cols-3 gap-6">
        {/* Credential Eligible */}
        <FormField
          control={form.control}
          name="credential_eligible"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Certification Awarded</FormLabel>
                <FormDescription className="text-xs">
                  Completing this course awards a credential.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Micro Assessment */}
        <FormField
          control={form.control}
          name="micro_assessment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Micro Assessment</FormLabel>
                <FormDescription className="text-xs">
                  Course includes embedded assessment.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Mentor Supported */}
        <FormField
          control={form.control}
          name="mentor_supported"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Mentor Supported</FormLabel>
                <FormDescription className="text-xs">
                  Course includes mentor check-ins.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default CourseFormFields;
