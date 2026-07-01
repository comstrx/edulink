import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAvailableCourses } from "@/hooks/usePackageCourses";
import { PRICING_TYPES, type PackageFormValues } from "@/lib/training/package-form-schema";

interface PackageFormFieldsProps {
  form: UseFormReturn<PackageFormValues>;
}

/**
 * Package-specific form fields for the training item editor.
 * Only rendered when type = 'package'.
 *
 * Phase 5.2 — Package Model Extension
 */
const PackageFormFields = ({ form }: PackageFormFieldsProps) => {
  const { data: courses, isLoading: coursesLoading } = useAvailableCourses();
  const pricingType = form.watch("pricing_type");
  const bundledIds = form.watch("bundled_course_ids");

  const toggleCourse = (courseId: string) => {
    const current = form.getValues("bundled_course_ids");
    if (current.includes(courseId)) {
      form.setValue("bundled_course_ids", current.filter((id) => id !== courseId), { shouldValidate: true });
    } else {
      form.setValue("bundled_course_ids", [...current, courseId], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
        Package Configuration
      </h3>

      {/* Bundled Courses */}
      <FormField
        control={form.control}
        name="bundled_course_ids"
        render={() => (
          <FormItem>
            <FormLabel>Bundled Courses</FormLabel>
            <FormDescription>Select courses to include in this package. Only course-type items are shown.</FormDescription>
            {coursesLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading courses…
              </div>
            ) : !courses?.length ? (
              <p className="text-sm text-muted-foreground py-2">No courses available. Create courses first.</p>
            ) : (
              <>
                {bundledIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pb-2">
                    {bundledIds.map((id) => {
                      const c = courses.find((c) => c.id === id);
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => toggleCourse(id)}
                        >
                          {c?.title ?? id} ×
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <ScrollArea className="h-48 rounded-md border border-border p-2">
                  <div className="space-y-1">
                    {courses.map((course) => (
                      <label
                        key={course.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={bundledIds.includes(course.id)}
                          onCheckedChange={() => toggleCourse(course.id)}
                        />
                        <span className="flex-1 text-foreground">{course.title}</span>
                        {course.duration && (
                          <span className="text-xs text-muted-foreground">{course.duration}</span>
                        )}
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

      {/* Pricing */}
      <div className="grid sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="pricing_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Type</FormLabel>
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRICING_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {pricingType === "fixed" && (
          <>
            <FormField
              control={form.control}
              name="price_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? null : parseFloat(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select value={field.value ?? "USD"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EGP">EGP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px]">
                    No currency taxonomy yet — controlled list used temporarily.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>

      {/* Toggles */}
      <div className="grid sm:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="credential_eligible"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Credential Eligible</FormLabel>
                <FormDescription className="text-xs">Package awards a credential on completion.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mentor_supported"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Mentor Supported</FormLabel>
                <FormDescription className="text-xs">Package includes mentorship.</FormDescription>
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

export default PackageFormFields;
