import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSchoolPlan } from "@/hooks/useSchoolPlan";
import { useVisitorViewLimit } from "@/hooks/useVisitorViewLimit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyTeacherPublicFilters, TEACHER_PROFILE_PUBLIC_COLUMNS, TEACHER_OWNER_COLUMNS } from "@/lib/visibility-rules";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { type CandidateStatus } from "@/components/talent-search/CandidateStatus";
import CandidatePanel, { AVAILABILITY_CONFIG } from "@/components/teacher-profile/CandidatePanel";
import ProfileSections from "@/components/teacher-profile/ProfileSections";
import TeacherEditMode from "@/components/teacher-profile/TeacherEditMode";
import { Lock, ArrowLeft } from "lucide-react";

type ViewMode = "teacher" | "school" | "public";

// useTaxonomyNames imported from shared hook

/* ── Work badges from profile (taxonomy-driven) ── */
function deriveWorkBadges(profile: Record<string, unknown>, nameMap: Record<string, string>): string[] {
  const ids = profile.opportunity_type_ids as string[] | null;
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.map(id => nameMap[id]).filter(Boolean);
  }
  return ["Onsite"];
}

const TeacherProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isPro, isSchool } = useSchoolPlan();
  const { canView, recordView, viewCount, limit } = useVisitorViewLimit();

  const isGuest = !user;
  const [editing, setEditing] = useState(false);
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>("saved");

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["teacher_profile", id, user?.id],
    queryFn: async () => {
      // First try: owner view (includes user_id, cv_url)
      if (user) {
        const { data: ownerData } = await supabase
          .from("teacher_profiles")
          .select(TEACHER_OWNER_COLUMNS)
          .eq("id", id!)
          .eq("user_id", user.id)
          .maybeSingle();
        if (ownerData) return ownerData;
      }

      // Public view: apply visibility filters + restricted columns
      // This ensures private/demo profiles return null (not found)
      const { data, error } = await applyTeacherPublicFilters(
        supabase
          .from("teacher_profiles")
          .select(TEACHER_PROFILE_PUBLIC_COLUMNS)
      )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (data && isGuest) recordView(data.id);
      return data;
    },
    enabled: !!id,
  });

  const isOwner = !!profile && !!user && "user_id" in profile && profile.user_id === user.id;
  const isDemo = profile?.profile_source === "demo";
  const viewMode: ViewMode = isOwner ? "teacher" : isSchool ? "school" : "public";

  const allIds = useMemo(() => {
    if (!profile) return [];
    const ids: string[] = [];
    if (profile.subject_ids) ids.push(...profile.subject_ids);
    if (profile.curriculum_ids) ids.push(...profile.curriculum_ids);
    if (profile.certification_ids) ids.push(...profile.certification_ids);
    if (profile.grade_band_ids) ids.push(...profile.grade_band_ids);
    if (profile.language_ids) ids.push(...profile.language_ids);
    if (profile.teaching_license_ids) ids.push(...profile.teaching_license_ids);
    if (profile.degree_ids) ids.push(...profile.degree_ids);
    if (profile.curriculum_experience_ids) ids.push(...profile.curriculum_experience_ids);
    if (profile.nationality_id) ids.push(profile.nationality_id);
    if (profile.opportunity_type_ids) ids.push(...profile.opportunity_type_ids);
    return [...new Set(ids)];
  }, [profile]);

  const { data: nameMap } = useTaxonomyNames(allIds);
  const resolve = (tid: string) => nameMap?.[tid] ?? "";

  const { data: similarTeachers } = useQuery({
    queryKey: ["similar_teachers", id, profile?.subject_ids],
    queryFn: async () => {
      let query = applyTeacherPublicFilters(
        supabase
          .from("teacher_profiles")
          .select("id, full_name, avatar_url, city, country, years_of_experience, availability_status")
      )
        .neq("id", id!)
        .limit(4);
      if (profile?.subject_ids && profile.subject_ids.length > 0) {
        query = query.overlaps("subject_ids", profile.subject_ids);
      }
      const { data } = await query;
      return data ?? [];
    },
    enabled: !!profile && !!id && viewMode !== "teacher",
  });

  /* ── Gates ── */
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">{t("tp.loading")}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("tp.notFound")}</h1>
        <p className="text-muted-foreground mb-6">{t("tp.notFoundDesc")}</p>
        <Button asChild variant="outline">
          <Link to="/talent-search"><ArrowLeft className="h-4 w-4 me-2" />{t("tp.backToSearch")}</Link>
        </Button>
      </div>
    );
  }

  if (viewMode === "public" && isGuest && !canView(profile.id)) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("tsearch.viewLimitTitle")}</h1>
        <p className="text-muted-foreground mb-6">{t("tsearch.viewLimitDesc")}</p>
        <div className="flex justify-center gap-3">
          <Button asChild><Link to="/signup?role=school">{t("talent.createSchool")}</Link></Button>
          <Button asChild variant="outline"><Link to="/login?intent=talent_search">{t("talent.loginAsSchool")}</Link></Button>
        </div>
      </div>
    );
  }

  if (!profile.is_public_profile && viewMode === "public") {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{t("tp.privateTitle")}</h1>
        <p className="text-muted-foreground mb-6">{t("tp.privateDesc")}</p>
        <Button asChild variant="outline">
          <Link to="/talent-search"><ArrowLeft className="h-4 w-4 me-2" />{t("tp.backToSearch")}</Link>
        </Button>
      </div>
    );
  }

  /* ── Resolved data ── */
  const subjects = (profile.subject_ids ?? []).map(resolve).filter(Boolean);
  const curriculums = (profile.curriculum_ids ?? []).map(resolve).filter(Boolean);
  const certifications = (profile.certification_ids ?? []).map(resolve).filter(Boolean);
  const gradeBands = (profile.grade_band_ids ?? []).map(resolve).filter(Boolean);
  const languages = (profile.language_ids ?? []).map(resolve).filter(Boolean);
  const licenses = (profile.teaching_license_ids ?? []).map(resolve).filter(Boolean);
  const degrees = (profile.degree_ids ?? []).map(resolve).filter(Boolean);
  const curriculumExperiences = (profile.curriculum_experience_ids ?? []).map(resolve).filter(Boolean);
  const nationality = profile.nationality_id ? resolve(profile.nationality_id) : null;
  const primarySubject = subjects[0] ?? "Educator";
  const primaryCurriculum = curriculums[0] ?? "";
  const primaryGrade = gradeBands[0] ?? "";
  const hasEnglish = languages.some((l) => l.toLowerCase().includes("english"));
  const isEslSpecialist = subjects.some((s) => /\b(esl|elt|efl)\b/i.test(s));
  const workBadges = deriveWorkBadges(profile as unknown as Record<string, unknown>, nameMap ?? {});
  const contextParts = [primaryCurriculum, primaryGrade, curriculumExperiences[0]].filter(Boolean);
  const teachingContextLine = contextParts.join(" • ");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: profile.full_name || "Educator",
            jobTitle: primarySubject + " Teacher",
            ...(profile.city && { addressLocality: profile.city }),
            ...(profile.country && { addressCountry: profile.country }),
          }),
        }}
      />
      <title>{`${profile.full_name} — ${primarySubject} Teacher${primaryCurriculum ? ` | ${primaryCurriculum}` : ""} | EduLink`}</title>
      <meta name="description" content={`${profile.full_name} is a ${primarySubject} teacher${primaryCurriculum ? ` specializing in ${primaryCurriculum} curriculum` : ""}${profile.years_of_experience ? ` with ${profile.years_of_experience} years of experience` : ""}. View full profile on EduLink.`} />

      <div className="max-w-6xl mx-auto py-4 px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to={viewMode === "teacher" ? "/app/teacher/dashboard" : "/talent-search"}>
              <ArrowLeft className="h-3.5 w-3.5 me-1.5" />
              {viewMode === "teacher" ? "Dashboard" : "Talent Search"}
            </Link>
          </Button>
        </div>

        {/* ── TWO COLUMN RECRUITER LAYOUT ── */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* LEFT: Sticky Candidate Panel (4 cols) */}
          <CandidatePanel
            profile={profile}
            primarySubject={primarySubject}
            teachingContextLine={teachingContextLine}
            nationality={nationality}
            hasEnglish={hasEnglish}
            isEslSpecialist={isEslSpecialist}
            workBadges={workBadges}
            primaryCurriculum={primaryCurriculum}
            primaryGrade={primaryGrade}
            certifications={certifications}
            curriculumExperiences={curriculumExperiences}
            viewMode={viewMode}
            isPro={isPro}
            candidateStatus={candidateStatus}
            onCandidateStatusChange={setCandidateStatus}
            onEditClick={() => setEditing(true)}
            isDemo={isDemo}
          />

          {/* RIGHT: Profile Details (8 cols) */}
          {viewMode === "teacher" && editing ? (
            <div className="flex-1 min-w-0">
              <TeacherEditMode
                profile={profile}
                userId={user!.id}
                onClose={() => setEditing(false)}
              />
            </div>
          ) : (
            <ProfileSections
              profile={profile}
              taxonomy={{ subjects, curriculums, certifications, gradeBands, languages, licenses, degrees, curriculumExperiences }}
              workBadges={workBadges}
              hasEnglish={hasEnglish}
              isEslSpecialist={isEslSpecialist}
              viewMode={viewMode}
              isPro={isPro}
            />
          )}
        </div>

        {/* Similar Teachers */}
        {viewMode !== "teacher" && similarTeachers && similarTeachers.length > 0 && (
          <>
            <Separator className="my-6" />
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Similar Teachers</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {similarTeachers.map((tp) => {
                  const tInitials = tp.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";
                  const tLocation = [tp.city, tp.country].filter(Boolean).join(", "); // fallback; prefer city_id/country_id resolution
                  const tAvail = AVAILABILITY_CONFIG[tp.availability_status] ?? AVAILABILITY_CONFIG.open;
                  const TAvailIcon = tAvail.icon;

                  return (
                    <Link
                      key={tp.id}
                      to={`/teachers/${tp.id}`}
                      className="bg-card border border-border/60 rounded-lg p-3 hover:shadow-sm hover:border-border transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Avatar className="h-8 w-8">
                          {tp.avatar_url && <AvatarImage src={tp.avatar_url} alt={tp.full_name} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{tInitials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{tp.full_name}</p>
                          {tLocation && <p className="text-[10px] text-muted-foreground truncate">{tLocation}</p>}
                        </div>
                      </div>
                      <Badge variant="outline" className={`${tAvail.className} border text-[10px] h-4 gap-0.5 px-1.5`}>
                        <TAvailIcon className="h-2.5 w-2.5" />
                        {tAvail.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {viewMode === "public" && isGuest && (
          <p className="text-center text-[11px] text-muted-foreground mt-5">
            Profile views remaining: {limit - viewCount}
          </p>
        )}
      </div>
    </>
  );
};

export default TeacherProfile;
