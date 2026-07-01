import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import { toast } from "sonner";
import {
  User, Briefcase, Globe, Save, Award,
  GraduationCap, X, Plus, Trash2, Video,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface TeacherEditModeProps {
  profile: Record<string, any>;
  userId: string;
  onClose: () => void;
}

const TeacherEditMode = ({ profile, userId, onClose }: TeacherEditModeProps) => {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState(profile.full_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [countryId, setCountryId] = useState(profile.country_id || "");
  const [regionId, setRegionId] = useState(profile.region_id || "");
  const [yearsExp, setYearsExp] = useState(profile.years_of_experience || 0);
  const [isPublic, setIsPublic] = useState(profile.is_public_profile);
  const [availability, setAvailability] = useState(profile.availability_status);
  const [subjectIds, setSubjectIds] = useState<string[]>(profile.subject_ids || []);
  const [curriculumIds, setCurriculumIds] = useState<string[]>(profile.curriculum_ids || []);
  const [certificationIds, setCertificationIds] = useState<string[]>(profile.certification_ids || []);
  const [gradeBandIds, setGradeBandIds] = useState<string[]>(profile.grade_band_ids || []);
  const [languageIds, setLanguageIds] = useState<string[]>(profile.language_ids || []);
  const [workArrangementTermIds, setWorkArrangementTermIds] = useState<string[]>(profile.work_arrangement_term_ids || []);
  const [employmentTypeTermIds, setEmploymentTypeTermIds] = useState<string[]>(profile.employment_type_term_ids || []);
  const [availabilityStatusTermIds, setAvailabilityStatusTermIds] = useState<string[]>(profile.availability_status_term_ids || []);
  const [opportunityTypeIds, setOpportunityTypeIds] = useState<string[]>(profile.opportunity_type_ids || []);
  const [education, setEducation] = useState<{ degree_level: string; major: string; faculty: string; university: string; graduation_year: number | string }[]>(() => {
    const stored = profile.education as unknown;
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return [];
  });
  const [teachingDemo, setTeachingDemo] = useState<{ type: string; url: string; title: string }[]>(() => {
    const stored = profile.teaching_demo as unknown;
    if (Array.isArray(stored) && stored.length > 0) return stored.map((d: any) => ({ type: d.type || "video", url: d.url || "", title: d.title || "" }));
    return [];
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        full_name: fullName,
        bio,
        country_id: countryId || null,
        region_id: regionId || null,
        years_of_experience: yearsExp,
        is_public_profile: isPublic,
        availability_status: availability,
        subject_ids: subjectIds,
        curriculum_ids: curriculumIds,
        certification_ids: certificationIds,
        grade_band_ids: gradeBandIds,
        language_ids: languageIds,
        work_arrangement_term_ids: workArrangementTermIds,
        employment_type_term_ids: employmentTypeTermIds,
        availability_status_term_ids: availabilityStatusTermIds,
        opportunity_type_ids: opportunityTypeIds,
        education: education.map(e => ({ ...e, graduation_year: Number(e.graduation_year) || null })),
        teaching_demo: teachingDemo.filter(d => d.url.trim()),
      };

      if (profile.id) {
        const { error } = await supabase
          .from("teacher_profiles")
          .update(payload)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("teacher_profiles")
          .insert({ ...payload, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_profile"] });
      qc.invalidateQueries({ queryKey: ["my_teacher_profile"] });
      toast.success(t("profile.saved"));
      onClose();
    },
    onError: () => toast.error(t("profile.saveError")),
  });




  return (
    <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("profile.title")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="gap-1.5">
            <Save className="h-4 w-4" />
            {t("profile.save")}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {t("profile.basicInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("profile.fullName")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.yearsExp")}</Label>
              <Input type="number" min={0} value={yearsExp} onChange={(e) => setYearsExp(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TaxonomySingleSelect domainKey="countries" value={countryId} onChange={(v) => { setCountryId(v); setRegionId(""); }} label={t("profile.country")} />
            <TaxonomySingleSelect domainKey="regions" value={regionId} onChange={setRegionId} parentId={countryId} label={t("profile.region")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("profile.bio")}</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Open to Opportunities */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            {t("profile.openToOpportunities")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("profile.oppDesc")}</p>
          <TaxonomyMultiSelect domainKey="opportunity_types" values={opportunityTypeIds} onChange={setOpportunityTypeIds} label={t("profile.openToOpportunities")} />

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">{t("profile.availability")}</Label>
              <p className="text-xs text-muted-foreground">{t("profile.availabilityDesc")}</p>
            </div>
            <Switch
              checked={availability === "open"}
              onCheckedChange={(v) => setAvailability(v ? "open" : "not_available")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">{t("profile.publicProfile")}</Label>
              <p className="text-xs text-muted-foreground">{t("profile.publicProfileDesc")}</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </CardContent>
      </Card>

      {/* Teaching Expertise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4" />
            {t("profile.expertise")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TaxonomyMultiSelect domainKey="subjects" values={subjectIds} onChange={setSubjectIds} label={t("tsearch.filter.subject")} />
          <TaxonomyMultiSelect domainKey="curriculums" values={curriculumIds} onChange={setCurriculumIds} label={t("tsearch.filter.curriculum")} />
          <TaxonomyMultiSelect domainKey="grade_bands" values={gradeBandIds} onChange={setGradeBandIds} label={t("tsearch.filter.gradeBand")} />
          <TaxonomyMultiSelect domainKey="certifications" values={certificationIds} onChange={setCertificationIds} label={t("tsearch.filter.certifications")} />
          <TaxonomyMultiSelect domainKey="languages" values={languageIds} onChange={setLanguageIds} label="Languages" />
        </CardContent>
      </Card>

      {/* Work Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Work Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TaxonomyMultiSelect domainKey="work_arrangements" values={workArrangementTermIds} onChange={setWorkArrangementTermIds} label="Work Arrangement" />
          <TaxonomyMultiSelect domainKey="employment_types" values={employmentTypeTermIds} onChange={setEmploymentTypeTermIds} label="Employment Type" />
          <TaxonomyMultiSelect domainKey="availability_status" values={availabilityStatusTermIds} onChange={setAvailabilityStatusTermIds} label="Availability Status" />
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {education.map((edu, i) => (
            <div key={i} className="space-y-3 p-3 rounded-lg border border-border/60 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Degree Level</Label>
                  <Input
                    placeholder="e.g. BA, BSc, MA, PGCE"
                    value={edu.degree_level}
                    onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, degree_level: e.target.value } : item))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Major / Field</Label>
                  <Input
                    placeholder="e.g. English Literature"
                    value={edu.major}
                    onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, major: e.target.value } : item))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Faculty</Label>
                  <Input
                    placeholder="e.g. Faculty of Education"
                    value={edu.faculty}
                    onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, faculty: e.target.value } : item))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">University</Label>
                  <Input
                    placeholder="e.g. University of Leeds"
                    value={edu.university}
                    onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, university: e.target.value } : item))}
                  />
                </div>
              </div>
              <div className="w-1/2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Graduation Year</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2018"
                    value={edu.graduation_year}
                    onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, graduation_year: e.target.value } : item))}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEducation(prev => [...prev, { degree_level: "", major: "", faculty: "", university: "", graduation_year: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add Education
          </Button>
        </CardContent>
      </Card>

      {/* Teaching Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4" />
            Teaching Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Add a demo video, sample lesson PDF, or portfolio link. International schools often require a short demo lesson.</p>
          {teachingDemo.map((demo, i) => (
            <div key={i} className="space-y-3 p-3 rounded-lg border border-border/60 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setTeachingDemo(prev => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={demo.type} onValueChange={v => setTeachingDemo(prev => prev.map((item, idx) => idx === i ? { ...item, type: v } : item))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Demo Video</SelectItem>
                      <SelectItem value="lesson_pdf">Sample Lesson PDF</SelectItem>
                      <SelectItem value="portfolio">Portfolio Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">URL</Label>
                  <Input
                    placeholder={demo.type === "video" ? "https://youtube.com/watch?v=..." : demo.type === "lesson_pdf" ? "https://drive.google.com/..." : "https://behance.net/..."}
                    value={demo.url}
                    onChange={e => setTeachingDemo(prev => prev.map((item, idx) => idx === i ? { ...item, url: e.target.value } : item))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Title (optional)</Label>
                <Input
                  placeholder="e.g. Grade 10 Physics Demo Lesson"
                  value={demo.title}
                  onChange={e => setTeachingDemo(prev => prev.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setTeachingDemo(prev => [...prev, { type: "video", url: "", title: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add Demo Material
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherEditMode;
