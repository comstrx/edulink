import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherEarnedCredentials } from "@/hooks/useEarnedCredentials";
import {
  Briefcase, FileText, GraduationCap, Lightbulb, AlertTriangle, Bookmark, Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import AvatarUpload from "@/components/teacher-profile/AvatarUpload";
import TeacherContextBar from "@/components/teacher/TeacherContextBar";
import ReadinessScoreCard from "@/components/intelligence/ReadinessScoreCard";
import ReadinessUnlockerCard from "@/components/intelligence/ReadinessUnlockerCard";
import GapSummaryCard from "@/components/intelligence/GapSummaryCard";

import VerifiedStateBadge from "@/components/intelligence/VerifiedStateBadge";
import VerificationProgressCard from "@/components/intelligence/VerificationProgressCard";
import GrowthActionsCard from "@/components/intelligence/GrowthActionsCard";
import { useTeacherCriSnapshot } from "@/intelligence/consumption/hooks/useTeacherCriSnapshot";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useTeacherVerifiedStateSnapshot } from "@/intelligence/consumption/hooks/useTeacherVerifiedStateSnapshot";
import { useSurfaceRecommendations, distributeDashboard } from "@/intelligence/recommendations/distribution";
import { getUserExperienceMode, applyOnboardingSurfacePolicy } from "@/intelligence/experience/onboarding-mode";
import CareerPathCard from "@/components/career/CareerPathCard";
import ReputationCard from "@/components/reputation/ReputationCard";
import MobilityCard from "@/components/mobility/MobilityCard";
import GrowthOverviewCard from "@/components/growth/GrowthOverviewCard";
import SkillProfileCard from "@/components/growth/SkillProfileCard";
import { useGrowthSummary } from "@/growth/hooks/useGrowthSummary";
import { useSkillProfileDisplay } from "@/growth/hooks/useSkillProfileDisplay";
import { useReadinessExplanation } from "@/explainability/hooks/useReadinessExplanation";
import { useCanonicalReadiness } from "@/intelligence/readiness";
import PostAuthNextStep from "@/components/auth/PostAuthNextStep";
import DashboardEmptyState from "@/components/teacher/DashboardEmptyState";
import ActivePathwaySummaryCard from "@/components/intelligence/ActivePathwaySummaryCard";
import DailyActionCard from "@/components/intelligence/DailyActionCard";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { EVENT_NAMES } from "@/contracts/core/event-names";

const TeacherDashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const intelligenceTriggeredRef = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ["my_teacher_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_profiles")
        .select("id, user_id, full_name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: latestJobId } = useQuery({
    queryKey: ["latest_application_job", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("job_id")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.job_id ?? undefined;
    },
    enabled: !!profile?.id,
  });

  const criResult = useTeacherCriSnapshot(profile?.id, latestJobId);
  const gapResult = useTeacherGapSnapshot(profile?.id);
  const { items: surfaceItems, isLoading: recsLoading, error: recsError, messaging: segmentMessaging, segment } = useSurfaceRecommendations(profile?.id, "dashboard");
  const experienceMode = getUserExperienceMode(segment, surfaceItems.filter(i => i.status === "completed").length, user?.created_at);
  const effectiveItems = experienceMode === "onboarding" ? applyOnboardingSurfacePolicy("dashboard", surfaceItems) : surfaceItems;
  const dashboardDist = distributeDashboard(effectiveItems);
  const verifiedStateResult = useTeacherVerifiedStateSnapshot(profile?.id);

  const growthSummary = useGrowthSummary(profile?.id);
  const { data: skills, isLoading: skillsLoading } = useSkillProfileDisplay(profile?.id);
  const canonicalReadiness = useCanonicalReadiness(profile?.id);
  const readinessExplanation = useReadinessExplanation(profile?.id);

  const { data: applicationCount } = useQuery({
    queryKey: ["teacher_application_count", profile?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", profile!.id);
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });

  const { data: earnedCredentials } = useTeacherEarnedCredentials();
  const credentialCount = (earnedCredentials ?? []).filter(c => c.status === "active").length;

  // Intelligence data presence checks
  const hasCriData = !!(criResult?.data);
  const hasGapData = !!(gapResult?.data && gapResult.data.totalGaps > 0);
  const hasRecommendations = dashboardDist.hasActions;
  const hasIntelligenceData = hasCriData || hasGapData || hasRecommendations;

  // Broadened empty state: show when no intelligence AND no meaningful activity
  const hasNoActivity = (applicationCount ?? 0) === 0 && credentialCount === 0;
  const isEmptyState = hasNoActivity && !hasIntelligenceData;

  // First-run intelligence trigger: dispatch once per session if no intelligence data
  useEffect(() => {
    if (
      intelligenceTriggeredRef.current ||
      !profile?.id ||
      !user?.id ||
      recsLoading ||
      hasIntelligenceData
    ) return;

    intelligenceTriggeredRef.current = true;

    dispatchDomainEvent("identity", EVENT_NAMES.identity.profileUpdated, {
      userId: user.id,
      teacherId: profile.id,
      profileId: profile.id,
      profileType: "teacher" as const,
      updatedFields: ["subjects", "curriculum", "experience", "education", "country", "skill_term_ids"],
    }).catch(() => {});
  }, [profile?.id, user?.id, recsLoading, hasIntelligenceData]);

  const quickStats = [
    { key: "applications", icon: FileText, value: String(applicationCount ?? 0) },
    { key: "credentials", icon: Briefcase, value: String(credentialCount ?? 0) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <PostAuthNextStep />

      {/* Header — compact */}
      <div className="flex items-center gap-4">
        {profile && (
          <AvatarUpload
            profileId={profile.id}
            userId={profile.user_id}
            avatarUrl={profile.avatar_url}
            fullName={profile.full_name}
            size="lg"
            editable
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{t("teacherDash.title")}</h1>
            <VerifiedStateBadge result={verifiedStateResult} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{t("teacherDash.subtitle")}</p>
        </div>
      </div>

      {/* Context strip — signals only, no generic copy */}
      <TeacherContextBar teacherId={profile?.id} />

      {isEmptyState ? (
        <DashboardEmptyState />
      ) : (
        <>
          {/* ═══════════ DAILY ACTION ═══════════ */}
          {recsError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive/70" />
              <span>Unable to load recommendations right now</span>
            </div>
          ) : (
            <DailyActionCard primaryAction={dashboardDist.primaryAction} allItems={dashboardDist.all} isLoading={recsLoading} impactPrefix={segmentMessaging.impactPrefix} />
          )}

          {/* ═══════════ HERO — Growth Actions (only if recs exist) ═══════════ */}
          {hasRecommendations && !recsError && (
            <section className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.02] to-transparent p-1">
              <GrowthActionsCard recommendations={dashboardDist.secondaryActions} isLoading={recsLoading} maxItems={2} />
            </section>
          )}

          {/* ═══════════ DIRECT BRIDGES ═══════════ */}
          <div className="flex flex-wrap gap-2">
            {(applicationCount ?? 0) > 0 && (
              <Link
                to="/app/teacher/applications"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                View your applications
              </Link>
            )}
            <Link
              to="/app/teacher/recommendations"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Explore recommendations
            </Link>
            <Link
              to="/app/teacher/saved-jobs"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved jobs
            </Link>
            <Link
              to="/app/teacher/training"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Explore training
            </Link>
            <Link
              to="/app/teacher/talent-profile"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              Professional Intelligence
            </Link>
          </div>

          {/* ═══════════ CORE SIGNALS ═══════════ */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground pl-1">
              Career Intelligence
            </h2>

            {/* Quick stats — only show if there's any activity */}
            {((applicationCount ?? 0) > 0 || credentialCount > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {quickStats.map((stat) => (
                  <div key={stat.key} className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <stat.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t(`teacherDash.stat.${stat.key}`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {latestJobId ? (
              <ReadinessScoreCard result={criResult} />
            ) : (
              <ReadinessUnlockerCard
                hasSkills={!!(skills && skills.length > 0)}
                hasCredentials={credentialCount > 0}
              />
            )}

            {/* Gap + Verification — only show if data exists */}
            {(hasGapData || !!(verifiedStateResult?.data)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hasGapData && <GapSummaryCard result={gapResult} />}
                {!!(verifiedStateResult?.data) && <VerificationProgressCard result={verifiedStateResult} />}
              </div>
            )}
          </section>

          {/* ═══════════ GROWTH & CAREER — only show sections with data ═══════════ */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground pl-1">
              Growth & Career
            </h2>

            <ActivePathwaySummaryCard />

            <GrowthOverviewCard growth={growthSummary} readinessLevel={canonicalReadiness.readinessLevel} explanation={readinessExplanation} />

            {/* Skills always show if teacher has skills */}
            {skills && skills.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SkillProfileCard skills={skills} skillGaps={growthSummary.skillGaps} isLoading={skillsLoading} />
                <CareerPathCard teacherId={profile?.id} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReputationCard teacherId={profile?.id} />
              <MobilityCard teacherId={profile?.id} />
            </div>
          </section>

          {/* ═══════════ QUICK ACTIONS — demoted, link-style ═══════════ */}
          <section className="pt-2 border-t border-border/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { to: "/app/teacher/profile", icon: GraduationCap, label: t("teacherDash.action.updateProfile"), desc: t("teacherDash.action.updateProfileDesc") },
                { to: "/jobs", icon: Briefcase, label: t("teacherDash.action.browseJobs"), desc: t("teacherDash.action.browseJobsDesc") },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-[10px] opacity-70">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
