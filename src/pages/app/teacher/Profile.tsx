import { useState } from "react";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { teacherProfileSchema, firstZodError } from "@/lib/validation-schemas";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import TaxonomyMultiSelect from "@/components/taxonomy/TaxonomyMultiSelect";
import TaxonomySingleSelect from "@/components/taxonomy/TaxonomySingleSelect";
import LanguageProficiencyEditor from "@/components/teacher-profile/LanguageProficiencyEditor";
import SkillsProficiencyEditor from "@/components/teacher-profile/SkillsProficiencyEditor";
import { toast } from "sonner";
import {
  User, Briefcase, Save, CheckCircle2,
  Award,
} from "lucide-react";


const TeacherProfile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my_teacher_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Local form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [countryId, setCountryId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [yearsExp, setYearsExp] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [availability, setAvailability] = useState("open");
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [curriculumIds, setCurriculumIds] = useState<string[]>([]);
  const [certificationIds, setCertificationIds] = useState<string[]>([]);
  const [gradeBandIds, setGradeBandIds] = useState<string[]>([]);
  const [opportunityTypeIds, setOpportunityTypeIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync from DB on first load
  if (profile && !initialized) {
    setFullName(profile.full_name || "");
    setBio(profile.bio || "");
    setCountryId(profile.country_id || "");
    setRegionId(profile.region_id || "");
    setYearsExp(profile.years_of_experience || 0);
    setIsPublic(profile.is_public_profile);
    setAvailability(profile.availability_status);
    setSubjectIds(profile.subject_ids || []);
    setCurriculumIds(profile.curriculum_ids || []);
    setCertificationIds(profile.certification_ids || []);
    setGradeBandIds(profile.grade_band_ids || []);
    setOpportunityTypeIds(profile.opportunity_type_ids || []);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate critical fields via zod before write
      const validation = teacherProfileSchema.safeParse({
        subject_ids: subjectIds,
        curriculum_ids: curriculumIds,
        years_of_experience: yearsExp,
        country_id: countryId,
        region_id: regionId || "",
      });

      if (!validation.success) {
        throw new Error(firstZodError(validation.error));
      }

      const payload = {
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
        opportunity_type_ids: opportunityTypeIds,
      };

      if (profile) {
        const { error } = await supabase
          .from("teacher_profiles")
          .update(payload)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("teacher_profiles")
          .insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_teacher_profile"] });
      toast.success(t("profile.saved"));

      // Sprint 9.5-B: Dispatch identity event via Smart Glue
      if (profile?.id && user?.id) {
        dispatchDomainEvent("identity", EVENT_NAMES.identity.profileUpdated, {
          userId: user.id,
          teacherId: profile.id,
          profileId: profile.id,
          profileType: "teacher" as const,
          updatedFields: ["full_name", "bio", "subjects", "curriculum", "availability"],
        }).catch(() => {});
      }
    },
    onError: (err: Error) => toast.error(err.message || t("profile.saveError")),
  });

  const isOpenToWork = availability === "open" && opportunityTypeIds.length > 0;
  const initials = fullName ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "??";

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">{t("profile.loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>
            {isOpenToWork && (
              <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                {t("profile.openToWork")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{t("profile.subtitle")}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5">
          <Save className="h-4 w-4" />
          {t("profile.save")}
        </Button>
      </div>

      <Separator />

      <TeacherContextBar
        teacherId={profile?.id}
        contextMessage="Your current readiness and focus areas."
      />

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

          <Separator />

          {/* Language Proficiency Editor */}
          {profile?.id && (
            <LanguageProficiencyEditor teacherId={profile.id} />
          )}

          <Separator />

          {/* Skills Editor */}
          {profile?.id && (
            <SkillsProficiencyEditor teacherId={profile.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherProfile;
