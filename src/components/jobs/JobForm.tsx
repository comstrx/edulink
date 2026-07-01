import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolHiringGuard } from "@/hooks/useSchoolHiringGuard";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import { toast } from "sonner";
import { jobPublishSchema, firstZodError } from "@/lib/validation-schemas";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import {
  Briefcase, MapPin, BookOpen, GraduationCap, Globe, Shield,
  Plus, Trash2, Save, X, Eye, Send, Clock, Search, Pencil,
} from "lucide-react";

/* ─── Job Form Component ─── */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

interface JobFormProps {
  job?: Partial<JobRow> | null;
  schoolId: string;
  onClose: () => void;
}

const JobForm = ({ job, schoolId, onClose }: JobFormProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { guardHiringAction } = useSchoolHiringGuard();

  // Free-text fields
  const [title, setTitle] = useState(job?.title || "");
  const [description, setDescription] = useState(job?.description || "");
  const [salaryRange, setSalaryRange] = useState(job?.salary_range || "");
  const [startDate, setStartDate] = useState(job?.start_date || "");
  const [deadline, setDeadline] = useState(job?.deadline || "");
  const [experienceMin, setExperienceMin] = useState<number>(job?.experience_min || 0);
  const [responsibilities, setResponsibilities] = useState<string[]>(job?.responsibilities || [""]);
  const [requirementsText, setRequirementsText] = useState<string[]>(job?.requirements_text || [""]);
  const [benefits, setBenefits] = useState<string[]>(job?.benefits || []);

  // Location (taxonomy IDs)
  const [regionTermId, setRegionTermId] = useState(job?.region_term_id || "");
  const [countryTermId, setCountryTermId] = useState(job?.country_term_id || "");
  const [cityTermId, setCityTermId] = useState(job?.city_term_id || "");

  // Role & School (taxonomy IDs)
  const [roleCategoryTermId, setRoleCategoryTermId] = useState(job?.role_category_term_id || "");
  const [roleTypeTermId, setRoleTypeTermId] = useState(job?.role_type_term_id || "");
  const [schoolTypeTermId, setSchoolTypeTermId] = useState(job?.school_type_term_id || "");
  const [seniorityLevelTermId, setSeniorityLevelTermId] = useState(job?.seniority_level_term_id || "");

  // Teaching context (taxonomy IDs)
  const [subjectTermIds, setSubjectTermIds] = useState<string[]>(job?.subject_term_ids || []);
  const [curriculumTermIds, setCurriculumTermIds] = useState<string[]>(job?.curriculum_term_ids || []);
  const [gradeBandTermIds, setGradeBandTermIds] = useState<string[]>(job?.grade_band_term_ids || []);

  // Contract & work (taxonomy IDs)
  const [employmentTypeTermIds, setEmploymentTypeTermIds] = useState<string[]>(job?.employment_type_term_ids || []);
  const [workArrangementTermIds, setWorkArrangementTermIds] = useState<string[]>(job?.work_arrangement_term_ids || []);

  // Eligibility (taxonomy IDs)
  const [visaStatusTermIds, setVisaStatusTermIds] = useState<string[]>(job?.visa_status_term_ids || []);
  const [languageTermIds, setLanguageTermIds] = useState<string[]>(job?.language_term_ids || []);
  const [languageLevelTermId, setLanguageLevelTermId] = useState(job?.language_level_term_id || "");
  const [certificationTermIds, setCertificationTermIds] = useState<string[]>(job?.certification_term_ids || []);

  // Booleans
  const [visaSponsorship, setVisaSponsorship] = useState(job?.visa_sponsorship || false);
  const [relocationSupport, setRelocationSupport] = useState(job?.relocation_support || false);

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      const payload: Record<string, any> = {
        school_id: schoolId,
        created_by: user?.id,
        title,
        description,
        salary_range: salaryRange || null,
        start_date: startDate || null,
        deadline: deadline || null,
        experience_min: experienceMin,
        responsibilities: responsibilities.filter(r => r.trim()),
        requirements_text: requirementsText.filter(r => r.trim()),
        benefits: benefits.filter(b => b.trim()),
        region_term_id: regionTermId || null,
        country_term_id: countryTermId || null,
        city_term_id: cityTermId || null,
        role_category_term_id: roleCategoryTermId || null,
        role_type_term_id: roleTypeTermId || null,
        school_type_term_id: schoolTypeTermId || null,
        seniority_level_term_id: seniorityLevelTermId || null,
        subject_term_ids: subjectTermIds,
        curriculum_term_ids: curriculumTermIds,
        grade_band_term_ids: gradeBandTermIds,
        employment_type_term_ids: employmentTypeTermIds,
        work_arrangement_term_ids: workArrangementTermIds,
        visa_status_term_ids: visaStatusTermIds,
        language_term_ids: languageTermIds,
        language_level_term_id: languageLevelTermId || null,
        certification_term_ids: certificationTermIds,
        visa_sponsorship: visaSponsorship,
        relocation_support: relocationSupport,
        status,
      };

      let jobId = job?.id;

      if (jobId) {
        const { error } = await supabase
          .from("jobs")
          .update(payload as Database["public"]["Tables"]["jobs"]["Update"])
          .eq("id", jobId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("jobs")
          .insert(payload as Database["public"]["Tables"]["jobs"]["Insert"])
          .select("id")
          .single();
        if (error) throw error;
        jobId = inserted.id;
      }

      return { jobId, status };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["school_jobs"] });
      toast.success(job?.id ? "Job updated" : "Job created");

      // Sprint 9.5-B: Dispatch job published event via Smart Glue
      if (result.status === "published" && result.jobId) {
        dispatchDomainEvent("hiring", EVENT_NAMES.hiring.jobPublished, {
          jobId: result.jobId,
          schoolId,
          title,
          subjectTermIds,
          countryTermId: countryTermId || undefined,
        }).catch(() => {});
      }

      onClose();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save job"),
  });

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, ""]);
  const updateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) =>
    setter(prev => prev.map((item, i) => i === idx ? val : item));
  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) =>
    setter(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{job?.id ? "Edit Job" : "Create Job Posting"}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button variant="outline" size="sm" onClick={() => { if (guardHiringAction()) saveMutation.mutate("draft"); }} disabled={saveMutation.isPending || !title.trim()}>
            <Save className="h-4 w-4 mr-1" /> Save Draft
          </Button>
          <Button size="sm" onClick={() => {
            if (!guardHiringAction()) return;
            const publishCheck = jobPublishSchema.safeParse({
              title, description, subject_term_ids: subjectTermIds, country_term_id: countryTermId,
            });
            if (!publishCheck.success) {
              toast.error(firstZodError(publishCheck.error));
              return;
            }
            saveMutation.mutate("published");
          }} disabled={saveMutation.isPending}>
            <Send className="h-4 w-4 mr-1" /> Publish
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4" /> Job Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Secondary Mathematics Teacher" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe the role, team, and what makes this opportunity unique..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Salary Range</Label>
              <Input value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="e.g. $2,500–$3,200/mo" />
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Application Deadline</Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5 w-1/3">
            <Label>Min. Experience (years)</Label>
            <Input type="number" min={0} max={60} value={experienceMin} onChange={e => setExperienceMin(Math.min(60, Math.max(0, Number(e.target.value))))} />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Location</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <TaxonomySingleSelect domainKey="regions" value={regionTermId} onChange={v => { setRegionTermId(v); setCountryTermId(""); setCityTermId(""); }} label="Region" placeholder="Select region" />
          <TaxonomySingleSelect domainKey="countries" value={countryTermId} onChange={v => { setCountryTermId(v); setCityTermId(""); }} label="Country" placeholder={regionTermId ? "Select country" : "Select region first"} parentId={regionTermId || undefined} />
          <TaxonomySingleSelect domainKey="cities" value={cityTermId} onChange={setCityTermId} label="City / Area" placeholder={countryTermId ? "Select city" : "Select country first"} parentId={countryTermId || undefined} />
          <p className="text-[10px] text-muted-foreground/70">Region → Country → City</p>
        </CardContent>
      </Card>

      {/* Role & School */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4" /> Role & School</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <TaxonomySingleSelect domainKey="role_categories" value={roleCategoryTermId} onChange={v => { setRoleCategoryTermId(v); setRoleTypeTermId(""); }} label="Role Category" placeholder="Select category" />
          <TaxonomySingleSelect domainKey="role_families" value={roleTypeTermId} onChange={setRoleTypeTermId} label="Role Type" placeholder={roleCategoryTermId ? "Select role" : "Select category first"} parentId={roleCategoryTermId || undefined} requiresParent />
          <TaxonomySingleSelect domainKey="school_types" value={schoolTypeTermId} onChange={setSchoolTypeTermId} label="School Type" placeholder="Select school type" />
          <TaxonomySingleSelect domainKey="seniority_levels" value={seniorityLevelTermId} onChange={setSeniorityLevelTermId} label="Seniority Level" placeholder="Select level" />
        </CardContent>
      </Card>

      {/* Teaching Context */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Teaching Context</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TaxonomyMultiSelect domainKey="subjects" values={subjectTermIds} onChange={setSubjectTermIds} label="Subjects" />
          <TaxonomyMultiSelect domainKey="curriculums" values={curriculumTermIds} onChange={setCurriculumTermIds} label="Curriculum" />
          <TaxonomyMultiSelect domainKey="grade_bands" values={gradeBandTermIds} onChange={setGradeBandTermIds} label="Grade Band" />
        </CardContent>
      </Card>

      {/* Contract & Work */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4" /> Contract & Work</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TaxonomyMultiSelect domainKey="employment_types" values={employmentTypeTermIds} onChange={setEmploymentTypeTermIds} label="Employment Type" />
          <TaxonomyMultiSelect domainKey="work_arrangements" values={workArrangementTermIds} onChange={setWorkArrangementTermIds} label="Work Arrangement" />
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" /> Eligibility & Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TaxonomyMultiSelect domainKey="visa_status" values={visaStatusTermIds} onChange={setVisaStatusTermIds} label="Accepted Visa Status" />
          <TaxonomyMultiSelect domainKey="languages" values={languageTermIds} onChange={setLanguageTermIds} label="Required Languages" />
          <TaxonomySingleSelect domainKey="language_levels" value={languageLevelTermId} onChange={setLanguageLevelTermId} label="Min. Language Level" placeholder="Any" />
          <TaxonomyMultiSelect domainKey="certifications" values={certificationTermIds} onChange={setCertificationTermIds} label="Required Certifications" />
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>Visa Sponsorship</Label><p className="text-xs text-muted-foreground">School will sponsor work visa</p></div>
            <Switch checked={visaSponsorship} onCheckedChange={setVisaSponsorship} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Relocation Support</Label><p className="text-xs text-muted-foreground">Flights, housing, or settling-in allowance</p></div>
            <Switch checked={relocationSupport} onCheckedChange={setRelocationSupport} />
          </div>
        </CardContent>
      </Card>

      {/* Responsibilities */}
      <Card>
        <CardHeader><CardTitle className="text-base">Responsibilities</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {responsibilities.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input value={r} onChange={e => updateListItem(setResponsibilities, i, e.target.value)} placeholder="e.g. Plan and deliver engaging lessons" />
              <Button variant="ghost" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => removeListItem(setResponsibilities, i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem(setResponsibilities)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requirementsText.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input value={r} onChange={e => updateListItem(setRequirementsText, i, e.target.value)} placeholder="e.g. Bachelor's in Mathematics or Education" />
              <Button variant="ghost" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => removeListItem(setRequirementsText, i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem(setRequirementsText)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader><CardTitle className="text-base">Benefits</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input value={b} onChange={e => updateListItem(setBenefits, i, e.target.value)} placeholder="e.g. Housing allowance" />
              <Button variant="ghost" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => removeListItem(setBenefits, i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem(setBenefits)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobForm;
