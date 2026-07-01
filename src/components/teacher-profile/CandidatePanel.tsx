import { Link } from "react-router-dom";
import ReputationBadge from "@/components/reputation/ReputationBadge";
import CareerReadinessBadge from "@/components/growth/CareerReadinessBadge";
import { useCanonicalReadiness } from "@/intelligence/readiness";
import ExplanationPanel from "@/components/explainability/ExplanationPanel";
import { useProfessionalReputation } from "@/reputation/hooks/useProfessionalReputation";
import { useGrowthSummary } from "@/growth/hooks/useGrowthSummary";
import { useTeacherFitExplanation } from "@/explainability/hooks/useTeacherFitExplanation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CandidateStatusSelect, type CandidateStatus } from "@/components/talent-search/CandidateStatus";
import {
  Lock, Mail, Save, CheckCircle2, Clock, XCircle, BookOpen,
  Languages, MapPin, Globe, Pencil, Calendar, Award,
  Monitor, Building2, ArrowRightLeft, Briefcase,
  StickyNote, Tag, CalendarCheck, Video,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AvatarUpload from "./AvatarUpload";
import { resolveLocationDisplay } from "@/lib/location-display";

type ViewMode = "teacher" | "school" | "public";

export const AVAILABILITY_CONFIG: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  open: {
    label: "Available Now",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  available_now: {
    label: "Available Now",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  limited: {
    label: "Available Next Term",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    icon: Clock,
  },
  available_1_month: {
    label: "Available Next Term",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    icon: Clock,
  },
  not_available: {
    label: "Not Available",
    className: "bg-muted text-muted-foreground border-border",
    icon: XCircle,
  },
};

const WORK_ICONS: Record<string, typeof Monitor> = {
  Online: Monitor,
  Onsite: Building2,
  Hybrid: ArrowRightLeft,
};

interface CandidatePanelProps {
  profile: {
    id: string;
    user_id?: string;
    full_name: string;
    avatar_url: string | null;
    is_featured: boolean;
    availability_status: string;
    city: string | null;
    country: string | null;
    country_id?: string | null;
    city_id?: string | null;
    years_of_experience: number | null;
    preferred_start: string | null;
    experience?: unknown;
    visa_status?: string | null;
    visa_status_term_id?: string | null;
  };
  primarySubject: string;
  teachingContextLine: string;
  nationality: string | null;
  hasEnglish: boolean;
  isEslSpecialist?: boolean;
  workBadges: string[];
  primaryCurriculum: string;
  primaryGrade: string;
  certifications: string[];
  curriculumExperiences: string[];
  viewMode: ViewMode;
  isPro?: boolean;
  candidateStatus: CandidateStatus;
  onCandidateStatusChange: (s: CandidateStatus) => void;
  onEditClick?: () => void;
  isDemo?: boolean;
}

const CandidatePanel = ({
  profile, primarySubject, teachingContextLine, nationality, hasEnglish, isEslSpecialist,
  workBadges, primaryCurriculum, primaryGrade, certifications, curriculumExperiences,
  viewMode, isPro,
  candidateStatus, onCandidateStatusChange, onEditClick, isDemo,
}: CandidatePanelProps) => {
  // Only fetch intelligence/reputation data for authenticated viewers (teacher owner or school)
  const shouldShowIntelligence = viewMode === "teacher" || viewMode === "school";
  const repAudience = viewMode === "teacher" ? "internal" as const : viewMode === "school" ? "school" as const : "public" as const;
  const reputation = useProfessionalReputation(shouldShowIntelligence ? profile.id : undefined, repAudience);
  const growth = useGrowthSummary(shouldShowIntelligence ? profile.id : undefined);
  const canonicalReadiness = useCanonicalReadiness(shouldShowIntelligence ? profile.id : undefined);
  const fitExplanation = useTeacherFitExplanation(shouldShowIntelligence ? profile.id : undefined);
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";
  // Resolve location: prefer term_id, fallback to legacy text
  const locationIds = [profile.city_id, profile.country_id, profile.visa_status_term_id].filter(Boolean) as string[];
  const { data: locNames } = useQuery({
    queryKey: ["taxonomy_loc_names", locationIds],
    queryFn: async () => {
      if (locationIds.length === 0) return {};
      const { data } = await supabase.from("taxonomy_terms").select("id, name").in("id", locationIds);
      const map: Record<string, string> = {};
      data?.forEach((t) => (map[t.id] = t.name));
      return map;
    },
    enabled: locationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const location = resolveLocationDisplay(
    { cityId: profile.city_id, countryId: profile.country_id, legacyCityText: profile.city, legacyCountryText: profile.country },
    locNames ?? {}
  );

  const availConfig = AVAILABILITY_CONFIG[profile.availability_status] ?? AVAILABILITY_CONFIG.open;
  const AvailIcon = availConfig.icon;

  // Derive "International School Experience" signal from experience data
  const hasInternationalExp = (() => {
    const exp = profile.experience as unknown as Array<{ school_name?: string }> | null;
    if (!Array.isArray(exp)) return false;
    return exp.some(e => /international|british|american|ib |academy|global/i.test(e.school_name ?? ""));
  })();

  const [recruiterNote, setRecruiterNote] = useState("");
  const [tags, setTags] = useState<string[]>(["Strong Candidate"]);
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed]);
    setNewTag("");
  };

  return (
    <div className="w-full lg:w-[320px] shrink-0">
      <div className="sticky top-20 space-y-3">
        {/* ── SECTION 1: Identity + Hiring Snapshot ── */}
        <Card className="border-border/60 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />
          <CardContent className="pt-5 pb-4 px-4 text-center">
            <div className="flex justify-center">
              <AvatarUpload
                profileId={profile.id}
                userId={profile.user_id ?? ""}
                avatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                size="lg"
                editable={viewMode === "teacher"}
              />
            </div>
            <h1 className="text-base font-bold text-foreground mt-3 leading-tight">{profile.full_name}</h1>
            <p className="text-sm font-semibold text-primary mt-0.5">{primarySubject} Teacher</p>

            {/* Curriculum & Level */}
            {(primaryCurriculum || curriculumExperiences.length > 0 || primaryGrade) && (
              <div className="mt-1.5 space-y-0.5">
                {primaryCurriculum && (
                  <p className="text-xs font-medium text-muted-foreground">{primaryCurriculum} Curriculum</p>
                )}
                {curriculumExperiences.length > 0 && (
                  <p className="text-xs text-muted-foreground">{curriculumExperiences.join(" / ")}</p>
                )}
                {primaryGrade && (
                  <p className="text-xs text-muted-foreground">{primaryGrade}</p>
                )}
              </div>
            )}

            {nationality && (
              <Badge variant="secondary" className="text-[10px] h-5 mt-2 gap-0.5">
                <Globe className="h-3 w-3" /> {nationality}
              </Badge>
            )}
            {profile.is_featured && !isDemo && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] h-5 mt-2 ml-1">
                ⭐ Recommended
              </Badge>
            )}
            {isDemo && (
              <Badge variant="outline" className="text-[10px] h-5 mt-2 ml-1 border-primary/30 bg-primary/5 text-primary gap-0.5">
                ✦ Featured Profile
              </Badge>
            )}

            {/* ── Reputation + Readiness Badges ── */}
            {(reputation.resolvedState === "resolved" && reputation.reputationScore > 0) || growth.resolvedState === "resolved" ? (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {reputation.resolvedState === "resolved" && reputation.reputationScore > 0 && (
                  <ReputationBadge reputation={reputation} showScore size="md" />
                )}
                {growth.resolvedState === "resolved" && (
                  <CareerReadinessBadge level={canonicalReadiness.readinessLevel} size="md" />
                )}
              </div>
            ) : null}

            {/* ── Hiring Signal Badges ── */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-3 pt-3 border-t border-border/40">
              <Badge variant="outline" className={`${availConfig.className} border text-[10px] h-5 gap-0.5 font-semibold px-1.5`}>
                <AvailIcon className="h-2.5 w-2.5" /> {availConfig.label}
              </Badge>
              {hasEnglish && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                  <Languages className="h-2.5 w-2.5" /> Native Speaker
                </Badge>
              )}
              {workBadges.includes("Online") && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                  <Monitor className="h-2.5 w-2.5" /> Online Teaching
                </Badge>
              )}
              {hasInternationalExp && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                  <Building2 className="h-2.5 w-2.5" /> Intl School Experience
                </Badge>
              )}
              {isEslSpecialist && (
                <Badge variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                  <BookOpen className="h-2.5 w-2.5" /> ESL / ELT
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 2: Key Hiring Signals ── */}
        <Card className="border-border/60">
          <CardContent className="px-4 py-3 space-y-2.5">
            {profile.years_of_experience != null && profile.years_of_experience > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">{profile.years_of_experience} Years Experience</span>
              </div>
            )}
            {certifications.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Award className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium text-foreground">{certifications.join(" • ")}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{location}</span>
              </div>
            )}
            {(profile.visa_status || profile.visa_status_term_id) && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Visa Status</p>
                  <span className="text-xs font-medium text-foreground">
                    {profile.visa_status_term_id && locNames?.[profile.visa_status_term_id]
                      ? locNames[profile.visa_status_term_id]
                      : ({ no_visa_required: "No Visa Required", gcc_resident: "GCC Resident", transferable: "Transferable Visa", requires_sponsorship: "Requires Sponsorship" }[profile.visa_status ?? ""] ?? profile.visa_status)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── SECTION 3: Explainability ── */}
        {fitExplanation.status === "ready" && (
          <ExplanationPanel explanation={fitExplanation} />
        )}

        {/* ── SECTION 4: Recruiter Actions ── */}
        <Card className="border-border/60">
          <CardContent className="px-4 py-3 space-y-2">
            {viewMode === "teacher" && !isDemo && (
              <Button size="sm" className="w-full gap-1.5 text-xs" onClick={onEditClick}>
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            )}

            {!isDemo && viewMode === "school" && isPro && (
              <>
                <Button size="sm" className="w-full gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" /> Contact Teacher
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                  <Save className="h-3.5 w-3.5" /> Save Candidate
                </Button>
              </>
            )}

            {!isDemo && viewMode === "school" && !isPro && (
              <>
                <Button asChild size="sm" className="w-full text-xs gap-1.5">
                  <Link to="/pricing">
                    <Lock className="h-3.5 w-3.5" /> Subscription Required
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="w-full text-xs">
                  <Link to="/pricing">View Pricing</Link>
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                  <Save className="h-3.5 w-3.5" /> Save Candidate
                </Button>
              </>
            )}

            {!isDemo && viewMode === "public" && (
              <>
                <Button asChild size="sm" className="w-full text-xs">
                  <Link to="/login?intent=hire_teacher">
                    <Lock className="h-3.5 w-3.5 me-1" /> Contact Teacher (Schools Only)
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="w-full text-xs">
                  <Link to="/signup?role=school">Create School Account</Link>
                </Button>
              </>
            )}

            {isDemo && (
              <p className="text-xs text-muted-foreground text-center py-1">
                This is a featured showcase profile.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── SECTION 5: Candidate Pipeline (school only) ── */}
        {viewMode === "school" && !isDemo && (
          <Card className="border-border/60">
            <CardContent className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Candidate Stage</p>
              <CandidateStatusSelect value={candidateStatus} onChange={onCandidateStatusChange} />
              <Separator className="my-3" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
              <div className="space-y-1.5">
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8">
                  <CalendarCheck className="h-3.5 w-3.5" /> Schedule Interview
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs h-8">
                  <Video className="h-3.5 w-3.5" /> Request Demo Lesson
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SECTION 6: Private Notes (Pro school only) ── */}
        {viewMode === "school" && isPro && !isDemo && (
          <Card className="border-border/60">
            <CardContent className="px-4 py-3 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <StickyNote className="h-3 w-3" /> Private Notes
                </p>
                <Textarea
                  placeholder="Add private notes about this candidate..."
                  className="text-xs min-h-[70px] resize-none"
                  value={recruiterNote}
                  onChange={(e) => setRecruiterNote(e.target.value)}
                />
                <Button size="sm" variant="outline" className="mt-1.5 w-full text-[11px] h-7" disabled={!recruiterNote.trim()}>
                  Save Note
                </Button>
              </div>

              <Separator />

              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] h-5 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    className="flex-1 h-7 text-xs border border-input rounded-md px-2 bg-background"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                  />
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={addTag}>+</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Notes locked for Free school ── */}
        {viewMode === "school" && !isPro && (
          <Card className="border-border/60 opacity-75">
            <CardContent className="px-4 py-3 text-center space-y-2">
              <Lock className="h-4 w-4 text-muted-foreground mx-auto" />
              <p className="text-[11px] text-muted-foreground font-medium">Notes & Tags available on Pro</p>
              <Button asChild size="sm" variant="outline" className="text-[11px] h-7 w-full">
                <Link to="/pricing">Upgrade to Pro</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CandidatePanel;
