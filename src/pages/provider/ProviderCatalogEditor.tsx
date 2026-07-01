import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchProviderTrainingItem,
  updateProviderTrainingItem,
  insertProviderTrainingItem,
  submitProviderItemForReview,
} from "@/lib/supabase-typed-queries";
import { useAuth } from "@/contexts/AuthContext";
import { useProviderMembership } from "@/hooks/useProviderProfile";
import { toast } from "sonner";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import CourseFormFields from "@/components/training/admin/CourseFormFields";
import PackageFormFields from "@/components/training/admin/PackageFormFields";
import PathwayFormFields from "@/components/training/admin/PathwayFormFields";
import { parsePathwayFields, serializePathwayPayload } from "@/lib/training/training-item-types";
import { courseFieldsSchema, emptyCourseForm } from "@/lib/training/course-form-schema";
import { packageFieldsSchema, emptyPackageForm } from "@/lib/training/package-form-schema";
import { pathwayFieldsSchema, emptyPathwayForm } from "@/lib/training/pathway-form-schema";
import { usePackageCourseIds, syncPackageCourses } from "@/hooks/usePackageCourses";
import ProviderStatusBanner from "@/components/provider/ProviderStatusBanner";
import { ArrowLeft, Loader2, Save, Send, Lock, AlertTriangle } from "lucide-react";

type ItemType = "course" | "package" | "pathway";

function getSchemaForType(type: ItemType) {
  if (type === "package") return packageFieldsSchema;
  if (type === "pathway") return pathwayFieldsSchema;
  return courseFieldsSchema;
}

function getDefaultsForType(type: ItemType) {
  if (type === "package") return emptyPackageForm;
  if (type === "pathway") return emptyPathwayForm;
  return emptyCourseForm;
}

const TYPE_LABELS: Record<ItemType, string> = {
  course: "Course",
  package: "Package",
  pathway: "Pathway",
};

const EDITABLE_REVIEW_STATES = ["draft", "changes_requested"];

const ProviderCatalogEditor = () => {
  const { id, type: routeType } = useParams<{ id?: string; type?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useProviderMembership();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [itemType, setItemType] = useState<ItemType>((routeType as ItemType) || "course");
  const [reviewStatus, setReviewStatus] = useState<string>("draft");
  const [itemProviderId, setItemProviderId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);

  const schema = getSchemaForType(itemType);
  // Multi-schema form: FieldValues allows dynamic field access across course/package/pathway schemas
  const form = useForm<FieldValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultsForType(itemType),
  });

  const { data: existingCourseIds } = usePackageCourseIds(isEdit && itemType === "package" ? id : undefined);

  const providerId = membership?.provider?.id;
  const providerStatus = membership?.provider?.status;
  const isSuspended = providerStatus === "suspended";
  const isProviderActive = providerStatus === "active";
  const canOperate = !isSuspended && providerStatus !== "inactive";
  const isEditable = EDITABLE_REVIEW_STATES.includes(reviewStatus) && canOperate;
  const isReadOnly = isEdit && !isEditable;

  // Load existing item
  useEffect(() => {
    if (!id || !providerId) return;
    (async () => {
      const data = await fetchProviderTrainingItem(id!, providerId!);

      if (!data) {
        toast.error("Item not found or access denied");
        navigate("/app/provider/catalog");
        return;
      }

      setReviewStatus((data.review_status as string) || "draft");
      setReviewNotes((data.review_notes as string) || null);
      setReviewedAt((data.reviewed_at as string) || null);
      setItemProviderId((data.provider_id as string) || null);
      const detectedType = data.type as ItemType;
      setItemType(detectedType);

      const shared = {
        title: data.title,
        slug: data.slug,
        description: data.description,
        short_description: data.short_description,
        overview: data.overview,
        duration: data.duration,
        audience: data.audience,
        outcomes: data.outcomes ?? [],
        syllabus: data.syllabus ?? [],
        status: data.status as "draft" | "published" | "archived",
        skill_term_ids: data.skill_term_ids ?? [],
        competency_domain_term_ids: data.competency_domain_term_ids ?? [],
        credential_eligible: data.credential_eligible,
        mentor_supported: data.mentor_supported,
        subject_term_ids: data.subject_term_ids ?? [],
        curriculum_term_ids: data.curriculum_term_ids ?? [],
        grade_band_term_ids: data.grade_band_term_ids ?? [],
        learning_format_term_id: data.learning_format_term_id,
        training_level_term_id: data.training_level_term_id,
        credential_type_term_id: data.credential_type_term_id,
      };

      if (detectedType === "course") {
        form.reset({ ...shared, duration_hours: data.duration_hours, micro_assessment: data.micro_assessment, cri_boost_value: data.cri_boost_value });
      } else if (detectedType === "package") {
        form.reset({ ...shared, bundled_course_ids: [], pricing_type: data.pricing_type ?? null, price_amount: data.price_amount != null ? Number(data.price_amount) : null, price_currency: data.price_currency ?? "USD", target_segment_term_ids: data.target_segment_term_ids ?? [] });
      } else if (detectedType === "pathway") {
        form.reset({ ...shared, ...parsePathwayFields(data as Record<string, unknown>) });
      }
      setInitialLoading(false);
    })();
  }, [id, providerId, form, navigate]);

  useEffect(() => {
    if (existingCourseIds && itemType === "package") {
      form.setValue("bundled_course_ids", existingCourseIds);
    }
  }, [existingCourseIds, form, itemType]);

  const onSubmit = async (values: FieldValues) => {
    if (!user || !providerId || !canOperate) return;
    setLoading(true);

    const payload: Record<string, unknown> = {
      type: itemType,
      title: values.title,
      slug: values.slug,
      description: values.description,
      short_description: values.short_description,
      overview: values.overview,
      duration: values.duration,
      audience: values.audience,
      outcomes: values.outcomes,
      syllabus: values.syllabus,
      status: values.status,
      skill_term_ids: values.skill_term_ids,
      competency_domain_term_ids: values.competency_domain_term_ids,
      credential_eligible: values.credential_eligible,
      mentor_supported: values.mentor_supported,
      subject_term_ids: values.subject_term_ids,
      curriculum_term_ids: values.curriculum_term_ids,
      grade_band_term_ids: values.grade_band_term_ids,
      learning_format_term_id: values.learning_format_term_id,
      training_level_term_id: values.training_level_term_id,
      credential_type_term_id: values.credential_type_term_id,
    };

    if (itemType === "course") {
      payload.duration_hours = values.duration_hours;
      payload.micro_assessment = values.micro_assessment;
      payload.cri_boost_value = values.cri_boost_value;
    } else if (itemType === "package") {
      payload.pricing_type = values.pricing_type;
      payload.price_amount = values.price_amount;
      payload.price_currency = values.price_currency;
      payload.target_segment_term_ids = values.target_segment_term_ids;
    } else if (itemType === "pathway") {
      Object.assign(payload, serializePathwayPayload({
        required_course_ids: values.required_course_ids,
        cri_target: values.cri_target,
        milestones: values.milestones,
        reflection_prompts: values.reflection_prompts,
      }));
    }

    try {
      let savedId = id;

      if (isEdit) {
        await updateProviderTrainingItem(id!, providerId!, payload);
      } else {
        const insertPayload = {
          ...payload,
          created_by: user.id,
          ownership_type: "provider",
          provider_id: providerId,
          review_status: "draft",
        };
        savedId = await insertProviderTrainingItem(insertPayload);
      }

      if (itemType === "package" && savedId) {
        await syncPackageCourses(savedId, values.bundled_course_ids ?? []);
      }

      toast.success(isEdit ? `${TYPE_LABELS[itemType]} updated` : `${TYPE_LABELS[itemType]} created`);
      navigate("/app/provider/catalog");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id || !providerId) return;
    setLoading(true);
    try {
      await submitProviderItemForReview(id!, providerId!);
      toast.success("Item submitted for review");
      navigate("/app/provider/catalog");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  if (membershipLoading || initialLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!membership) {
    return <div className="p-8"><p className="text-muted-foreground">No provider found.</p></div>;
  }

  // Ownership guard for edits
  if (isEdit && itemProviderId && itemProviderId !== providerId) {
    return <div className="p-8"><p className="text-muted-foreground">Access denied — this item belongs to another provider.</p></div>;
  }

  const typeLabel = TYPE_LABELS[itemType];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/provider/catalog")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          {isEdit ? (isReadOnly ? `View ${typeLabel}` : `Edit ${typeLabel}`) : `Create ${typeLabel}`}
        </h1>
        {isEdit && (
          <Badge variant="outline" className="capitalize">{reviewStatus.replace(/_/g, " ")}</Badge>
        )}
      </div>

      <ProviderStatusBanner status={membership.provider.status} rejectionReason={membership.provider.rejection_reason} />

      {isReadOnly && (
        <div className="bg-muted/50 border border-border rounded-md p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Read-only</p>
            <p className="text-xs text-muted-foreground">
              This item is in "{reviewStatus.replace(/_/g, " ")}" status and cannot be edited.
            </p>
          </div>
        </div>
      )}

      {/* Review Feedback Banner */}
      {isEdit && reviewNotes && ["rejected", "changes_requested"].includes(reviewStatus) && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {reviewStatus === "rejected" ? "Rejection Feedback" : "Changes Requested by Admin"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{reviewNotes}</p>
            {reviewedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Reviewed on {new Date(reviewedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Type selector — new items only */}
      {!isEdit && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Item Type:</span>
              <Select value={itemType} onValueChange={(v) => {
                const newType = v as ItemType;
                setItemType(newType);
                form.reset(getDefaultsForType(newType));
              }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="package">Package</SelectItem>
                  <SelectItem value="pathway">Pathway</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <fieldset disabled={isReadOnly}>
            {/* Core Fields */}
            <Card>
              <CardHeader><CardTitle className="text-base">Core Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder={`${typeLabel} title`} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel>Slug</FormLabel><FormControl><Input placeholder={`${typeLabel.toLowerCase()}-slug`} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="short_description" render={({ field }) => (
                  <FormItem><FormLabel>Short Description</FormLabel><FormControl><Input placeholder="Brief summary" value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Full Description</FormLabel><FormControl><Textarea placeholder="Detailed description" rows={4} value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="overview" render={({ field }) => (
                  <FormItem><FormLabel>Overview</FormLabel><FormControl><Textarea placeholder="Overview for detail page" rows={3} value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem><FormLabel>Duration Label</FormLabel><FormControl><Input placeholder="e.g. 8 weeks" value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="audience" render={({ field }) => (
                    <FormItem><FormLabel>Audience</FormLabel><FormControl><Input placeholder="e.g. Early years educators" value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Taxonomy */}
            <Card className="mt-8">
              <CardHeader><CardTitle className="text-base">Taxonomy & Classification</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="learning_format_term_id" render={({ field }) => (
                    <FormItem><TaxonomySingleSelect domainKey="learning_formats" value={field.value ?? ""} onChange={field.onChange} label="Learning Format" /></FormItem>
                  )} />
                  <FormField control={form.control} name="training_level_term_id" render={({ field }) => (
                    <FormItem><TaxonomySingleSelect domainKey="training_levels" value={field.value ?? ""} onChange={field.onChange} label="Training Level" /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="subject_term_ids" render={({ field }) => (
                  <FormItem><TaxonomyMultiSelect domainKey="subjects" values={field.value} onChange={field.onChange} label="Subjects" /></FormItem>
                )} />
                <FormField control={form.control} name="curriculum_term_ids" render={({ field }) => (
                  <FormItem><TaxonomyMultiSelect domainKey="curriculums" values={field.value} onChange={field.onChange} label="Curricula" /></FormItem>
                )} />
                <FormField control={form.control} name="grade_band_term_ids" render={({ field }) => (
                  <FormItem><TaxonomyMultiSelect domainKey="grade_bands" values={field.value} onChange={field.onChange} label="Grade Bands" /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Type-specific */}
            <Card className="mt-8">
              <CardHeader><CardTitle className="text-base">{typeLabel} Configuration</CardTitle></CardHeader>
              <CardContent>
                {itemType === "course" && <CourseFormFields form={form} />}
                {itemType === "package" && <PackageFormFields form={form as any} />}
                {itemType === "pathway" && <PathwayFormFields form={form as any} />}
              </CardContent>
            </Card>
          </fieldset>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate("/app/provider/catalog")}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? `Update ${typeLabel}` : `Create ${typeLabel}`}
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Submit for review — only for saved draft items */}
      {isEdit && (reviewStatus === "draft" || reviewStatus === "changes_requested") && canOperate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {reviewStatus === "changes_requested" ? "Resubmit for Review" : "Submit for Review"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reviewStatus === "changes_requested"
                    ? "After making corrections, resubmit this item for admin review."
                    : "Send this item to the platform team for approval."}
                </p>
              </div>
              <Button onClick={handleSubmitForReview} disabled={loading}>
                <Send className="h-4 w-4 mr-1" /> {reviewStatus === "changes_requested" ? "Resubmit" : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderCatalogEditor;
