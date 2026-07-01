import { useTaxonomyNames } from "@/hooks/useTaxonomyNames";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Eye, CheckCircle2, Clock, XCircle,
  Bookmark, Lock, Star, Globe, Mail,
  Briefcase, GraduationCap, Wifi, Building2, ArrowRightLeft,
} from "lucide-react";
import VerifiedStateBadge from "@/components/intelligence/VerifiedStateBadge";
import ReputationBadge from "@/components/reputation/ReputationBadge";
import type { ReputationMap } from "@/hooks/useTalentSearch";
import type { VerifiedStateConsumptionResult } from "@/intelligence/consumption/types/intelligence-consumption.types";
import { useAuth } from "@/contexts/AuthContext";
import { useSchoolPlan } from "@/hooks/useSchoolPlan";
import { useSchoolHiringGuard } from "@/hooks/useSchoolHiringGuard";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { SortOption } from "./TalentSearchFilters";
import type { MatchResult } from "@/lib/matching";
import MatchScoreBadge from "./MatchScoreBadge";
import IntelligenceSignalBadges, { type IntelligenceSignalEntry } from "@/components/intelligence/IntelligenceSignalBadges";
import ExplanationPanel from "@/components/explainability/ExplanationPanel";
import { useTeacherFitExplanation } from "@/explainability/hooks/useTeacherFitExplanation";

interface TeacherData {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  city: string | null;
  country: string | null;
  years_of_experience: number | null;
  availability_status: string;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  certification_ids: string[] | null;
  curriculum_experience_ids?: string[] | null;
  nationality_id: string | null;
  country_id?: string | null;
  city_id?: string | null;
  language_ids?: string[] | null;
  teaching_license_ids?: string[] | null;
  grade_band_ids?: string[] | null;
  profile_source?: string;
}

interface TeacherResultCardProps {
  teacher: TeacherData;
  isGated?: boolean;
  onPreview?: (teacher: TeacherData) => void;
  sortMode?: SortOption;
  matchResult?: MatchResult | null;
  isSaved?: boolean;
  onToggleSave?: (teacherId: string) => void;
  /** Pre-fetched verification result from batch query — avoids per-card fetching */
  verifiedResult?: VerifiedStateConsumptionResult | null;
  /** Pre-fetched intelligence signals from batch query */
  intelligenceEntry?: IntelligenceSignalEntry;
  /** Pre-fetched reputation entry from batch query */
  reputationEntry?: ReputationMap[string];
}

const AVAILABILITY_MAP: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  open: { label: "Available Now", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: CheckCircle2 },
  available_now: { label: "Available Now", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800", icon: CheckCircle2 },
  available_1_month: { label: "Available Next Term", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: Clock },
  limited: { label: "Available Next Term", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800", icon: Clock },
  not_available: { label: "Not Available", className: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const WORK_ICONS = { Online: Wifi, Hybrid: ArrowRightLeft, Onsite: Building2 } as const;
const WORK_STYLES: Record<string, string> = {
  Online: "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
  Hybrid: "border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
  Onsite: "border-border/60 text-muted-foreground",
};


// useTaxonomyNames imported from shared hook

const TeacherResultCard = ({ teacher, isGated = false, onPreview, sortMode, matchResult, isSaved: isSavedProp, onToggleSave, verifiedResult: verifiedResultProp, intelligenceEntry, reputationEntry }: TeacherResultCardProps) => {
  const { user } = useAuth();
  const { isPro, isSchool } = useSchoolPlan();
  const { guardHiringAction, isCompleted } = useSchoolHiringGuard();
  const isDemo = teacher.profile_source === "demo";
  // Only fetch intelligence explanations for authenticated users — public audience should not see intelligence data
  const fitExplanation = useTeacherFitExplanation(user ? teacher.id : undefined);

  const saved = isSavedProp ?? false;
  const guardedSetSaved = () => {
    if (!guardHiringAction()) return;
    onToggleSave?.(teacher.id);
  };

  const matchScore = matchResult ? matchResult.score : null;
  const verifiedResult = verifiedResultProp ?? null;
  const isTopMatch = matchScore != null && matchScore >= 85;
  const isRecommended = sortMode === "recommended" && matchScore != null && matchScore >= 70;

  const initials = teacher.full_name
    ? teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const availConfig = AVAILABILITY_MAP[teacher.availability_status] ?? AVAILABILITY_MAP.open;
  const AvailIcon = availConfig.icon;

  // Collect all taxonomy IDs (including location IDs for term_id-first resolution)
  const allIds = useMemo(() => {
    const ids: string[] = [];
    if (teacher.subject_ids) ids.push(...teacher.subject_ids);
    if (teacher.curriculum_ids) ids.push(...teacher.curriculum_ids);
    if (teacher.certification_ids) ids.push(...teacher.certification_ids);
    if (teacher.nationality_id) ids.push(teacher.nationality_id);
    if (teacher.language_ids) ids.push(...teacher.language_ids);
    if (teacher.grade_band_ids) ids.push(...teacher.grade_band_ids);
    if (teacher.country_id) ids.push(teacher.country_id);
    if (teacher.city_id) ids.push(teacher.city_id);
    const wat = (teacher as any).work_arrangement_term_ids;
    if (wat) ids.push(...wat);
    return [...new Set(ids)];
  }, [teacher]);

  const { data: nameMap } = useTaxonomyNames(allIds);
  const resolve = (id: string) => nameMap?.[id] ?? "";

  const subjects = (teacher.subject_ids ?? []).map(resolve).filter(Boolean);
  const curriculums = (teacher.curriculum_ids ?? []).map(resolve).filter(Boolean);
  const certifications = (teacher.certification_ids ?? []).map(resolve).filter(Boolean);
  const gradeBands = (teacher.grade_band_ids ?? []).map(resolve).filter(Boolean);
  const nationality = teacher.nationality_id ? resolve(teacher.nationality_id) : null;
  const languages = (teacher.language_ids ?? []).map(resolve).filter(Boolean);

  const isNativeEnglish = languages.some((l) => l.toLowerCase() === "english");
  const isEslSpecialist = subjects.some((s) => /\b(esl|elt|efl)\b/i.test(s));

  // Line 2: Primary specialization
  const primarySubject = subjects[0] ?? null;

  // Line 3: Teaching context — structured lines
  const curriculumLine = curriculums.length > 0 ? curriculums[0] + " Curriculum" : null;
  const levelLine = curriculums.length > 1 ? curriculums.slice(1).join(" / ") : null;
  const gradeLine = gradeBands.length > 0 ? gradeBands.join(" / ") : null;

  // Line 4: Credentials
  const credParts = [
    ...(teacher.years_of_experience != null && teacher.years_of_experience > 0
      ? [`${teacher.years_of_experience} Years Experience`] : []),
    ...certifications.slice(0, 3),
  ];
  const credLine = credParts.join(" • ");

  // Real work arrangement from teacher profile data
  const workArrangementIds = (teacher as any).work_arrangement_term_ids ?? [];
  const workArrangementNames = workArrangementIds.map((id: string) => nameMap?.[id] ?? "").filter(Boolean);

  return (
    <div
      className={cn(
        "relative group bg-card border border-border/60 rounded-lg transition-all duration-200",
        !isGated && "hover:shadow-md hover:border-border hover:-translate-y-px",
        isTopMatch && !isGated && "border-primary/30"
      )}
    >
      {/* Gated overlay */}
      {isGated && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-md rounded-lg">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">Sign in to view more teachers</p>
          <Button asChild size="sm"><Link to="/login">Login to view</Link></Button>
        </div>
      )}

      <div className={cn("p-4", isGated && "select-none")}>
        <div className="flex gap-3">
          {/* LEFT: Avatar column */}
          <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
              {teacher.avatar_url && <AvatarImage src={teacher.avatar_url} alt={teacher.full_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {(isTopMatch || isRecommended) && (
              <Badge className={cn(
                "text-[9px] h-[18px] px-1.5 gap-0.5 font-semibold whitespace-nowrap border",
                isTopMatch
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                  : "bg-primary/10 text-primary border-primary/20"
              )}>
                <Star className="h-2.5 w-2.5 fill-current" />
                {isTopMatch ? "Top Match" : "Recommended"}
              </Badge>
            )}
          </div>

          {/* CENTER: 5-line info block */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* LINE 1: Name + Nationality */}
            <div className="flex items-center gap-2 min-w-0">
              <h3
                className="text-sm font-semibold text-foreground truncate leading-snug cursor-pointer hover:text-primary transition-colors"
                onClick={() => !isGated && onPreview?.(teacher)}
              >
                {teacher.full_name}
              </h3>
              {nationality && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Globe className="h-3 w-3" />
                  {nationality}
                </span>
              )}
            </div>

            {/* LINE 2: Primary Subject (prominent) */}
            {primarySubject && (
              <p className="text-[13px] font-bold text-primary uppercase tracking-wider leading-snug">
                {primarySubject} Teacher
                {isNativeEnglish && primarySubject.toLowerCase().includes("english") && (
                  <span className="text-[10px] font-medium text-muted-foreground ml-1.5 normal-case tracking-normal">
                    • First Language Specialist
                  </span>
                )}
              </p>
            )}

            {/* LINE 3: Teaching Context — structured */}
            {(curriculumLine || levelLine || gradeLine) && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground leading-snug truncate">
                <GraduationCap className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                <span className="truncate">
                  {[curriculumLine, levelLine, gradeLine].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}

            {/* LINE 4: Experience + Credentials + Languages */}
            {credLine && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate leading-snug">
                <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                {credLine}
              </p>
            )}
            {languages.length > 0 && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate leading-snug">
                <Globe className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                {languages.slice(0, 4).join(" · ")}{languages.length > 4 ? ` +${languages.length - 4}` : ""}
              </p>
            )}
              {isEslSpecialist && (
                <Badge variant="outline" className="text-[10px] h-[20px] px-1.5 border border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800 font-medium gap-0.5">
                  <GraduationCap className="h-2.5 w-2.5" />
                  ESL / ELT Specialist
                </Badge>
              )}

            {/* LINE 5: Badges row — availability first */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {isDemo && (
                <Badge variant="outline" className="text-[10px] h-[20px] px-1.5 border border-primary/30 bg-primary/5 text-primary font-medium gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Featured Profile
                </Badge>
              )}
              {matchResult && (
                <MatchScoreBadge result={matchResult} />
              )}
              <Badge variant="outline" className={cn("text-[10px] h-[20px] gap-0.5 px-1.5 border font-medium", availConfig.className)}>
                <AvailIcon className="h-2.5 w-2.5" />
                {availConfig.label}
              </Badge>
              {isNativeEnglish && (
                <Badge variant="outline" className="text-[10px] h-[20px] px-1.5 border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 font-medium gap-0.5">
                  Native Speaker
                </Badge>
              )}
              {workArrangementNames.map((wName: string) => {
                const wKey = Object.keys(WORK_ICONS).find((k) => wName.toLowerCase().includes(k.toLowerCase())) as keyof typeof WORK_ICONS | undefined;
                const WIcon = wKey ? WORK_ICONS[wKey] : Briefcase;
                const wStyle = wKey ? WORK_STYLES[wKey] : "border-border/60 text-muted-foreground";
                return (
                  <Badge key={wName} variant="outline" className={cn("text-[10px] h-[20px] px-1.5 border font-medium gap-0.5", wStyle)}>
                    <WIcon className="h-2.5 w-2.5" />
                    {wName}
                  </Badge>
                );
              })}
              {curriculums.length > 0 && curriculums[0].toLowerCase().includes("ib") && (
                <Badge variant="outline" className="text-[10px] h-[20px] px-1.5 border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-medium">
                  IB Teacher
                </Badge>
              )}
              {/* Intelligence / reputation / verification signals — only for authenticated users */}
              {user && verifiedResult && <VerifiedStateBadge result={verifiedResult} showTooltip={true} />}
              {user && reputationEntry && reputationEntry.reputationScore > 0 && (
                <ReputationBadge
                  reputation={{
                    resolvedState: "resolved",
                    reputationScore: reputationEntry.reputationScore,
                    reputationLevel: reputationEntry.reputationLevel,
                  }}
                  size="sm"
                />
              )}
              {user && <IntelligenceSignalBadges entry={intelligenceEntry} compact />}
              {user && fitExplanation.status === "ready" && fitExplanation.reasons.length > 0 && (
                <ExplanationPanel explanation={fitExplanation} compact />
              )}
            </div>
          </div>

          {/* RIGHT: Actions column — hidden on mobile */}
          <div className="shrink-0 hidden md:flex flex-col items-end justify-between gap-1 w-[125px]" onClick={(e) => e.stopPropagation()}>
            {!isDemo && user && isSchool && isPro ? (
              <Button size="sm" className="h-7 text-[11px] gap-1 px-2.5 w-full font-medium" disabled={!isCompleted} title={!isCompleted ? "Complete your school profile to activate hiring." : undefined}>
                {!isCompleted ? <Lock className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                Contact
              </Button>
            ) : !isDemo && user && isSchool && !isPro ? (
              <Button asChild size="sm" className="h-7 text-[11px] gap-1 px-2.5 w-full font-medium">
                <Link to="/pricing">
                  <Lock className="h-3 w-3" />
                  Subscription Required
                </Link>
              </Button>
            ) : !isDemo && !user ? (
              <Button asChild size="sm" className="h-7 text-[11px] gap-1 px-2.5 w-full font-medium">
                <Link to="/login">
                  <Lock className="h-3 w-3" />
                  Login to Contact
                </Link>
              </Button>
            ) : null}

            <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5 w-full font-medium">
              <Link to={`/teachers/${teacher.id}`}>
                <Eye className="h-3 w-3" />
                {isSchool && !isPro ? "Unlock Profile" : "View Profile"}
              </Link>
            </Button>

            {!isDemo && (
              <Button
                size="sm"
                variant={saved ? "secondary" : "ghost"}
                className="h-7 text-[11px] gap-1 px-2.5 w-full font-medium"
                onClick={guardedSetSaved}
                title="Save Candidate"
              >
                <Bookmark className={cn("h-3 w-3", saved && "fill-primary text-primary")} />
                {saved ? "Saved" : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* MOBILE: Actions row — shown only on mobile */}
        <div className="flex md:hidden items-center gap-2 mt-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5 flex-1 font-medium">
            <Link to={`/teachers/${teacher.id}`}>
              <Eye className="h-3 w-3" />
              {isSchool && !isPro ? "Unlock Profile" : "View Profile"}
            </Link>
          </Button>
          {!isDemo && user && isSchool && isPro ? (
            <Button size="sm" className="h-7 text-[11px] gap-1 px-2.5 flex-1 font-medium" disabled={!isCompleted} title={!isCompleted ? "Complete your school profile to activate hiring." : undefined}>
              {!isCompleted ? <Lock className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
              Contact
            </Button>
          ) : !isDemo && user && isSchool && !isPro ? (
            <Button asChild size="sm" className="h-7 text-[11px] gap-1 px-2.5 flex-1 font-medium">
              <Link to="/pricing">
                <Lock className="h-3 w-3" />
                Subscription Required
              </Link>
            </Button>
          ) : !isDemo && !user ? (
            <Button asChild size="sm" className="h-7 text-[11px] gap-1 px-2.5 flex-1 font-medium">
              <Link to="/login">
                <Lock className="h-3 w-3" />
                Login to Contact
              </Link>
            </Button>
          ) : null}
          {!isDemo && (
            <Button
              size="sm"
              variant={saved ? "secondary" : "ghost"}
              className="h-7 w-7 p-0 shrink-0"
              onClick={guardedSetSaved}
            >
              <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-primary text-primary")} />
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};

export default TeacherResultCard;
