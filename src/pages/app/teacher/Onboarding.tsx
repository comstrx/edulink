import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { safeMutation } from "@/lib/safe-mutation";
import { teacherProfileSchema, educationEntrySchema, firstZodError } from "@/lib/validation-schemas";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, BookOpen, GraduationCap, Clock, MapPin, Sparkles, ArrowRight, ArrowLeft, Plus, Trash2, School, User, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import OnboardingSkillsStep from "@/components/onboarding/OnboardingSkillsStep";

const EXPERIENCE_OPTIONS = [
  { value: "0", label: "0 – 2 years" },
  { value: "3", label: "3 – 5 years" },
  { value: "6", label: "6 – 10 years" },
  { value: "11", label: "10+ years" },
];

interface EducationEntry {
  degree_level: string;
  major: string;
  university: string;
  graduation_year: string;
}

const EMPTY_EDU: EducationEntry = { degree_level: "", major: "", university: "", graduation_year: "" };

const STEPS = [
  { key: "name", icon: User },
  { key: "subject", icon: BookOpen },
  { key: "curriculum", icon: GraduationCap },
  { key: "skills", icon: Target },
  { key: "experience", icon: Clock },
  { key: "education", icon: School },
  { key: "location", icon: MapPin },
] as const;

const TeacherOnboarding = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [curriculumIds, setCurriculumIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState<EducationEntry[]>([{ ...EMPTY_EDU }]);
  const [countryId, setCountryId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [validationError, setValidationError] = useState("");

  const totalSteps = STEPS.length;
  const progress = done ? 100 : ((step + 1) / totalSteps) * 100;

  const canNext = () => {
    if (step === 0) return fullName.trim().length >= 2;
    if (step === 1) return subjectIds.length > 0;
    if (step === 2) return curriculumIds.length > 0;
    if (step === 3) return selectedSkillIds.length >= 2; // min 2 skills
    if (step === 4) return !!experience;
    if (step === 5) return true; // education is optional
    if (step === 6) return !!countryId;
    return false;
  };

  const handleFinish = async () => {
    if (!user || saving) return;
    setValidationError("");

    const years = parseInt(experience, 10) || 0;
    const eduData = education
      .filter(e => e.degree_level || e.major || e.university);

    // Validate education entries individually
    for (const entry of eduData) {
      const eduResult = educationEntrySchema.safeParse(entry);
      if (!eduResult.success) {
        const msg = firstZodError(eduResult.error);
        setValidationError(msg);
        toast.error(msg);
        return;
      }
    }

    // Validate full profile payload
    const profilePayload = {
      full_name: fullName.trim(),
      subject_ids: subjectIds,
      curriculum_ids: curriculumIds,
      years_of_experience: years,
      education: eduData,
      country_id: countryId,
      region_id: regionId || "",
    };

    const result = teacherProfileSchema.safeParse(profilePayload);
    if (!result.success) {
      const msg = firstZodError(result.error);
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);

    // 1. Save profile
    const { success } = await safeMutation(
      () =>
        supabase
          .from("teacher_profiles")
          .update({
            full_name: fullName.trim(),
            subject_ids: subjectIds,
            curriculum_ids: curriculumIds,
            years_of_experience: years,
            education: eduData.length > 0 ? eduData.map(e => ({ ...e, graduation_year: Number(e.graduation_year) || null })) : [],
            country_id: countryId || null,
            region_id: regionId || null,
          })
          .eq("user_id", user.id),
      { errorMessage: "Failed to save your profile. Please try again." }
    );

    if (!success) {
      setSaving(false);
      return;
    }

    // 2. Resolve teacher_profiles.id (needed for skills + event dispatch)
    const { data: tp } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const teacherProfileId = tp?.id;

    // 3. Save skills to teacher_skills (canonical path)
    if (selectedSkillIds.length > 0 && teacherProfileId) {
      const rows = selectedSkillIds.map((skillTermId) => ({
        teacher_id: teacherProfileId,
        skill_term_id: skillTermId,
      }));

      const { error: skillError } = await supabase
        .from("teacher_skills")
        .upsert(rows, { onConflict: "teacher_id,skill_term_id", ignoreDuplicates: true });

      if (skillError) {
        console.error("Failed to save skills:", skillError.message);
      }
    }

    setSaving(false);

    // Invalidate caches
    await qc.invalidateQueries({ queryKey: ["teacher_readiness"] });
    await qc.invalidateQueries({ queryKey: ["my_teacher_profile"] });
    await qc.invalidateQueries({ queryKey: ["teacher_skills"] });
    await qc.invalidateQueries({ queryKey: ["skill_profile_display"] });

    // Dispatch identity event via Smart Glue — teacherId = teacher_profiles.id (canonical)
    if (teacherProfileId) {
      dispatchDomainEvent("identity", EVENT_NAMES.identity.profileUpdated, {
        userId: user.id,
        teacherId: teacherProfileId,
        profileId: teacherProfileId,
        profileType: "teacher" as const,
        updatedFields: ["subjects", "curriculum", "experience", "education", "country", "skill_term_ids"],
      }).catch(() => {});
    }

    setDone(true);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("onboarding.done.title")}</h1>
            <p className="text-muted-foreground">{t("onboarding.done.subtitle")}</p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("onboarding.done.subtitle")}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/jobs", { replace: true })}>
              {t("onboarding.done.browseJobs")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/app/teacher/dashboard", { replace: true })}>
              {t("onboarding.done.goDashboard")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("onboarding.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.step")} {step + 1} / {totalSteps}
          </p>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                  i < step
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === step
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{t(`onboarding.steps.${STEPS[step].key}.title`)}</h2>
                <p className="text-sm text-muted-foreground">{t(`onboarding.steps.${STEPS[step].key}.desc`)}</p>
              </div>
            </div>

            {step === 0 && (
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  placeholder="e.g. Sarah Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
                {fullName.length > 0 && fullName.trim().length < 2 && (
                  <p className="text-xs text-destructive">Name must be at least 2 characters</p>
                )}
              </div>
            )}

            {step === 1 && (
              <TaxonomyMultiSelect
                domainKey="subjects"
                values={subjectIds}
                onChange={setSubjectIds}
                label={t("onboarding.steps.subject.placeholder")}
              />
            )}

            {step === 2 && (
              <TaxonomyMultiSelect
                domainKey="curriculums"
                values={curriculumIds}
                onChange={setCurriculumIds}
                label={t("onboarding.steps.curriculum.placeholder")}
              />
            )}

            {step === 3 && (
              <OnboardingSkillsStep
                selectedIds={selectedSkillIds}
                onChange={setSelectedSkillIds}
              />
            )}

            {step === 4 && (
              <RadioGroup value={experience} onValueChange={setExperience} className="grid gap-3">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`exp-${opt.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      experience === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/30"
                    )}
                  >
                    <RadioGroupItem value={opt.value} id={`exp-${opt.value}`} />
                    {opt.label}
                  </Label>
                ))}
              </RadioGroup>
            )}

            {step === 5 && (
              <div className="space-y-4">
                {education.map((edu, i) => (
                  <div key={i} className="space-y-3 p-3 rounded-lg border border-border/60 relative">
                    {education.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setEducation(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Degree Level</Label>
                        <Input
                          placeholder="e.g. BA, BSc, MA"
                          value={edu.degree_level}
                          onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, degree_level: e.target.value } : item))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Major / Field</Label>
                        <Input
                          placeholder="e.g. English Literature"
                          value={edu.major}
                          onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, major: e.target.value } : item))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">University</Label>
                        <Input
                          placeholder="e.g. University of Leeds"
                          value={edu.university}
                          onChange={e => setEducation(prev => prev.map((item, idx) => idx === i ? { ...item, university: e.target.value } : item))}
                        />
                      </div>
                      <div className="space-y-1">
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
                  onClick={() => setEducation(prev => [...prev, { ...EMPTY_EDU }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another Degree
                </Button>
                <p className="text-xs text-muted-foreground">You can skip this step and add education later.</p>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <TaxonomySingleSelect
                  domainKey="countries"
                  value={countryId}
                  onChange={(v) => { setCountryId(v); setRegionId(""); }}
                  label={t("onboarding.steps.location.country")}
                  placeholder={t("onboarding.steps.location.countryPlaceholder")}
                />
                {countryId && (
                  <TaxonomySingleSelect
                    domainKey="regions"
                    value={regionId}
                    onChange={setRegionId}
                    parentId={countryId}
                    label={t("onboarding.steps.location.region")}
                    placeholder={t("onboarding.steps.location.regionPlaceholder")}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("onboarding.back")}
          </Button>
          <Button onClick={handleNext} disabled={!canNext() || saving}>
            {step === totalSteps - 1 ? t("onboarding.finish") : t("onboarding.next")}
            {step < totalSteps - 1 && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
          {validationError && (
            <p className="text-sm text-destructive text-right">{validationError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherOnboarding;
