/**
 * ProfessionalIntelligencePage — Teacher-facing intelligence hub.
 * Phase 6: Structured Explainability Layer using ExplanationSection + adapters.
 * Route: /app/teacher/talent-profile
 */

import { useTeacherProfileId } from "@/hooks/useTeacherProfileId";
import { useTalentIntelligenceProfile } from "@/intelligence/talent/hooks/useTalentIntelligenceProfile";
import TalentIntelligenceCard from "@/components/intelligence/TalentIntelligenceCard";
import IntelligenceEmptyState from "@/components/intelligence/IntelligenceEmptyState";
import ExplanationSection from "@/components/intelligence/ExplanationSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Shield, BarChart3, GraduationCap, Route, Award,
  AlertTriangle, Sparkles, Loader2, BookOpen, Target,
  CheckCircle2, FileCheck, ArrowRight, TrendingUp, Zap, Star,
  Briefcase, Eye, ShieldCheck,
} from "lucide-react";
import type { TalentIntelligenceProfile, CriDimensionSummary } from "@/intelligence/talent/types/talent-intelligence.types";
import {
  explainReadiness,
  explainMatch,
  explainHiringAdvantages,
  explainProfileConsolidated,
  explainGrowthMomentum,
} from "@/intelligence/explainability/adapters/talent-profile-explanation.adapter";

/* ── Progress stage resolver ───────────────────────── */

type ProgressStage = "early" | "improving" | "strong";

function resolveProgressStage(p: TalentIntelligenceProfile): ProgressStage {
  if (p.readinessLevel === "ready" || p.readinessLevel === "highly_ready") return "strong";
  const hasActivity = p.trainingCompletionCount > 0 || p.credentialCount > 0
    || p.pathwayCompletionCount > 0 || p.verifiedSignalCount > 0;
  if (hasActivity) return "improving";
  return "early";
}

const stageConfig: Record<ProgressStage, { icon: React.ElementType; label: string; color: string }> = {
  early: { icon: Target, label: "Getting Started", color: "text-muted-foreground" },
  improving: { icon: TrendingUp, label: "Growing", color: "text-primary" },
  strong: { icon: Star, label: "Strong Position", color: "text-emerald-600 dark:text-emerald-400" },
};

/* ── Primary action resolver ───────────────────────── */

interface ActionItem {
  label: string;
  description: string;
  to: string;
  priority: number;
}

function resolvePrimaryAction(profile: TalentIntelligenceProfile): ActionItem | null {
  const actions: ActionItem[] = [];

  if (profile.unresolvedGapCount > 0) {
    actions.push({
      label: "Close your skill gaps",
      description: `You have ${profile.unresolvedGapCount} gap${profile.unresolvedGapCount > 1 ? "s" : ""} affecting your career readiness. Training can help close them.`,
      to: "/app/teacher/training",
      priority: 100,
    });
  }

  if (profile.credentialCount === 0) {
    actions.push({
      label: "Earn your first credential",
      description: "Credentials strengthen your profile and signal verified competence to schools.",
      to: "/app/teacher/credentials",
      priority: 90,
    });
  } else if (profile.credentialVerifiedCount < profile.credentialCount) {
    actions.push({
      label: "Verify your credentials",
      description: `${profile.credentialCount - profile.credentialVerifiedCount} credential${profile.credentialCount - profile.credentialVerifiedCount > 1 ? "s" : ""} still need verification.`,
      to: "/app/teacher/credentials",
      priority: 85,
    });
  }

  if (profile.readinessLevel === "early" || profile.readinessLevel === "developing") {
    actions.push({
      label: "Improve your readiness",
      description: "Explore personalised recommendations to strengthen your professional profile.",
      to: "/app/teacher/recommendations",
      priority: 80,
    });
  }

  if (profile.activePathwayCount === 0 && profile.pathwayCompletionCount === 0) {
    actions.push({
      label: "Start a learning pathway",
      description: "Pathways guide you through structured professional development toward career goals.",
      to: "/app/teacher/pathways",
      priority: 70,
    });
  }

  if (profile.verifiedSignalCount === 0) {
    actions.push({
      label: "Strengthen your credibility",
      description: "Verified signals help schools trust your profile. Complete training or add evidence.",
      to: "/app/teacher/evidence",
      priority: 60,
    });
  }

  actions.sort((a, b) => b.priority - a.priority);
  return actions[0] ?? null;
}

/* ── Inline action link ────────────────────────────── */

function InlineAction({ to, label, hint, primary = false }: {
  to: string; label: string; hint?: string; primary?: boolean;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      <Link
        to={to}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
          primary
            ? "border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
            : "border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {label}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

/* ── Progress Strip ────────────────────────────────── */

function ProgressStrip({ profile }: { profile: TalentIntelligenceProfile }) {
  const stage = resolveProgressStage(profile);
  const config = stageConfig[stage];
  const StageIcon = config.icon;
  const momentumExplanation = explainGrowthMomentum(profile);

  return (
    <Card className="border-border/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            stage === "strong" ? "bg-emerald-100 dark:bg-emerald-950/30" :
            stage === "improving" ? "bg-primary/10" : "bg-muted"
          )}>
            <StageIcon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn("text-sm font-semibold", config.color)}>{config.label}</span>
          </div>
        </div>
        {/* Growth momentum explanation via framework */}
        {momentumExplanation && (
          <ExplanationSection explanation={momentumExplanation} />
        )}
      </CardContent>
    </Card>
  );
}

/* ── Smart Action Banner ───────────────────────────── */

function SmartActionBanner({ profile }: { profile: TalentIntelligenceProfile }) {
  const action = resolvePrimaryAction(profile);
  if (!action) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.04] to-transparent">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Your next best step</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
          <Link
            to={action.to}
            className="inline-flex items-center gap-1.5 mt-2.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── CRI Dimension Row ─────────────────────────────── */

function CriDimensionRow({ dim }: { dim: CriDimensionSummary }) {
  const pct = dim.maxScore > 0 ? (dim.score / dim.maxScore) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">{dim.label || dim.dimension}</span>
        <span className="text-muted-foreground">{dim.score}/{dim.maxScore}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────── */

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/* ── CRI Breakdown + Readiness Explanation ──────────── */

function CriBreakdown({ profile }: { profile: TalentIntelligenceProfile }) {
  if (!profile.criDimensions || profile.criDimensions.length === 0) return null;

  const readinessExplanation = explainReadiness(profile);

  return (
    <Section icon={BarChart3} title="Career Readiness Breakdown">
      <div className="space-y-3">
        {profile.criDimensions.map((dim, i) => (
          <CriDimensionRow key={i} dim={dim} />
        ))}
      </div>

      {/* Structured readiness explanation via framework */}
      <ExplanationSection explanation={readinessExplanation} />

      {(profile.readinessLevel === "early" || profile.readinessLevel === "developing") && (
        <InlineAction
          to="/app/teacher/recommendations"
          label="See how to improve your readiness"
          primary
        />
      )}
    </Section>
  );
}

/* ── Professional Progress ─────────────────────────── */

function ProgressSummary({ profile }: { profile: TalentIntelligenceProfile }) {
  const stats = [
    { label: "Training Completed", value: profile.trainingCompletionCount, icon: GraduationCap },
    { label: "Pathways Completed", value: profile.pathwayCompletionCount, icon: Route },
    { label: "Active Pathways", value: profile.activePathwayCount, icon: BookOpen },
    { label: "Credentials Earned", value: profile.credentialCount, icon: Award },
    { label: "Credentials Verified", value: profile.credentialVerifiedCount, icon: CheckCircle2 },
    { label: "Verified Signals", value: profile.verifiedSignalCount, icon: FileCheck },
  ];

  const needsPathway = profile.activePathwayCount === 0 && profile.pathwayCompletionCount === 0;
  const needsTraining = profile.trainingCompletionCount === 0;
  const needsCredentialVerification = profile.credentialCount > 0 && profile.credentialVerifiedCount < profile.credentialCount;

  return (
    <Section icon={Target} title="Professional Progress">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <s.icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {needsPathway && (
        <InlineAction to="/app/teacher/pathways" label="Start a learning pathway"
          hint="Pathways provide structured development that builds toward career milestones." />
      )}
      {!needsPathway && needsTraining && (
        <InlineAction to="/app/teacher/training" label="Begin your first training"
          hint="Completing training earns you verified progress that strengthens your profile." />
      )}
      {!needsPathway && !needsTraining && needsCredentialVerification && (
        <InlineAction to="/app/teacher/credentials" label="Verify your credentials"
          hint={`${profile.credentialCount - profile.credentialVerifiedCount} credential${profile.credentialCount - profile.credentialVerifiedCount > 1 ? "s" : ""} can be verified to increase your credibility.`} />
      )}
    </Section>
  );
}

/* ── Gap Summary ───────────────────────────────────── */

function GapSummary({ profile }: { profile: TalentIntelligenceProfile }) {
  if (profile.unresolvedGapCount === 0) {
    return (
      <Section icon={CheckCircle2} title="Skills Gaps">
        <div className="flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>All identified skill gaps have been resolved — your profile covers the expected areas.</span>
        </div>
      </Section>
    );
  }

  return (
    <Section icon={AlertTriangle} title="Skills Gaps">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl font-bold text-foreground">{profile.unresolvedGapCount}</span>
        <span className="text-sm text-muted-foreground">
          {profile.unresolvedGapCount === 1 ? "area needs attention" : "areas need attention"}
        </span>
      </div>
      {profile.gapCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.gapCategories.map((cat, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
              {cat}
            </Badge>
          ))}
        </div>
      )}
      <InlineAction to="/app/teacher/training" label="Improve your skills"
        hint={`Targeted training can help you close ${profile.unresolvedGapCount === 1 ? "this gap" : "these gaps"} and boost your readiness.`}
        primary />
    </Section>
  );
}

/* ── Hiring Advantages with Explanation ─────────────── */

function HiringAdvantage({ profile }: { profile: TalentIntelligenceProfile }) {
  const advantageExplanation = explainHiringAdvantages(profile);

  if (profile.hiringAdvantageSignals.length === 0) {
    if (profile.verifiedSignalCount === 0 && profile.credentialCount === 0) {
      return (
        <Section icon={Sparkles} title="Hiring Advantages">
          <p className="text-xs text-muted-foreground">
            You haven't earned any hiring advantages yet. Build your profile through training and credentials to unlock them.
          </p>
          <InlineAction to="/app/teacher/training" label="Start building advantages"
            hint="Complete training or earn credentials to gain your first hiring advantage signal." />
        </Section>
      );
    }
    return null;
  }

  return (
    <Section icon={Sparkles} title="Hiring Advantages">
      <div className="flex flex-wrap gap-2 mb-2">
        {profile.hiringAdvantageSignals.map((signal, i) => (
          <Badge key={i} variant="secondary" className="text-xs px-2.5 py-1">
            {signal.label}
          </Badge>
        ))}
      </div>
      {/* Structured explanation: why each advantage was earned */}
      {advantageExplanation && (
        <ExplanationSection explanation={advantageExplanation} />
      )}
    </Section>
  );
}

/* ── Hiring Position Section ───────────────────────── */

function resolveMatchLabel_local(score: number | null): { label: string; tone: "positive" | "neutral" | "cautious" } | null {
  if (score == null) return null;
  if (score >= 70) return { label: "Strong", tone: "positive" };
  if (score >= 45) return { label: "Moderate", tone: "neutral" };
  return { label: "Developing", tone: "cautious" };
}

function HiringPositionSection({ profile }: { profile: TalentIntelligenceProfile }) {
  const isStrong = profile.readinessLevel === "ready" || profile.readinessLevel === "highly_ready";
  const isDeveloping = profile.readinessLevel === "developing";
  const isEarly = profile.readinessLevel === "early";
  const matchInfo = resolveMatchLabel_local(profile.bestMatchScore);
  const matchExplanation = explainMatch(profile);
  const hasGaps = profile.unresolvedGapCount > 0;
  const noCredentials = profile.credentialCount === 0;
  const lowVerification = profile.verifiedSignalCount === 0;
  const isWeak = isEarly && (hasGaps || noCredentials || lowVerification);

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className={cn(
        "h-1",
        isStrong ? "bg-emerald-500 dark:bg-emerald-400" :
        isDeveloping ? "bg-primary" : "bg-muted-foreground/30"
      )} />
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Your Hiring Position</h2>
        </div>

        {/* Readiness */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Readiness</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-[18px]",
              isStrong ? "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800" :
              isDeveloping ? "text-primary border-primary/30" : "text-muted-foreground border-border"
            )}>
              {isStrong ? "Strong" : isDeveloping ? "Developing" : "Early"}
            </Badge>
          </div>
        </div>

        {/* Match Strength with structured explanation */}
        {matchInfo && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Match Strength</span>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-[18px]",
                matchInfo.tone === "positive" ? "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800" :
                matchInfo.tone === "neutral" ? "text-primary border-primary/30" :
                "text-muted-foreground border-border"
              )}>
                {matchInfo.label}
              </Badge>
            </div>
            {/* Match explanation via framework */}
            {matchExplanation && (
              <ExplanationSection explanation={matchExplanation} />
            )}
          </div>
        )}

        {/* Hiring advantages inline */}
        {profile.hiringAdvantageSignals.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Competitive Advantages</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px]">
                {profile.hiringAdvantageSignals.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.hiringAdvantageSignals.slice(0, 5).map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5">{s.label}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Risk Awareness */}
        {isWeak && (
          <div className="rounded-md border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your current profile may limit your chances in competitive roles. Closing gaps and earning credentials will strengthen your position.
            </p>
          </div>
        )}

        {/* CTA */}
        <InlineAction to="/jobs" label="Explore matching jobs" />
      </CardContent>
    </Card>
  );
}

/* ── Credential Strength ───────────────────────────── */

function CredentialStrengthSection({ profile }: { profile: TalentIntelligenceProfile }) {
  const strength = profile.credentialStrength;

  if (strength === "strong" || strength === "exceptional") {
    return (
      <Section icon={Award} title="Credential Strength">
        <div className="flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {strength === "exceptional"
              ? "Your credentials are exceptional — this is a major competitive advantage."
              : "Your credential profile is strong — schools see this as a positive trust signal."
            }
          </span>
        </div>
      </Section>
    );
  }

  const messages: Record<string, string> = {
    none: "You haven't earned any credentials yet. Credentials are a key trust signal for schools.",
    basic: "Your credentials could be stronger. Adding more verified credentials improves your credibility.",
    moderate: "You're building a solid credential base. A few more verified credentials could strengthen your positioning.",
  };

  return (
    <Section icon={Award} title="Credential Strength">
      <p className="text-xs text-muted-foreground">{messages[strength] ?? messages.basic}</p>
      <InlineAction to="/app/teacher/credentials"
        label={profile.credentialCount === 0 ? "Earn your first credential" : "Add or verify credentials"}
        primary={strength === "none"} />
    </Section>
  );
}

/* ── Consolidated Explanation (Phase 6 Critical) ───── */

function ConsolidatedExplanation({ profile }: { profile: TalentIntelligenceProfile }) {
  const explanation = explainProfileConsolidated(profile);

  // Don't show if there are no evidence points (fully empty profile is handled by empty state)
  if (explanation.evidencePoints.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Eye className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Why your profile looks this way</h2>
        </div>
        <ExplanationSection explanation={explanation} />
      </CardContent>
    </Card>
  );
}

/* ── Causality Loop Block ──────────────────────────── */

const LOOP_STEPS = [
  { icon: GraduationCap, text: "You complete actions — training, credentials, evidence" },
  { icon: TrendingUp, text: "Your intelligence profile gets stronger" },
  { icon: Briefcase, text: "Your hiring position improves" },
  { icon: Star, text: "You become more competitive for roles" },
];

function CausalityLoop() {
  return (
    <Card className="border-border/40">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">How your progress works</h2>
        </div>
        <div className="space-y-0">
          {LOOP_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              {i < LOOP_STEPS.length - 1 && (
                <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border/60" />
              )}
              <div className="h-7 w-7 rounded-full border border-border/60 bg-muted/30 flex items-center justify-center shrink-0 z-10">
                <step.icon className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground pt-1.5 pb-3">{step.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Connected Surfaces ────────────────────────────── */

const CONNECTED_SURFACES = [
  { icon: Shield, title: "Your Profile", why: "Completing your details strengthens the foundation of your intelligence picture.", to: "/app/teacher/profile", cta: "Review Profile" },
  { icon: GraduationCap, title: "Training & Pathways", why: "Completed learning improves readiness and helps close skill gaps.", to: "/app/teacher/training", cta: "Explore Training" },
  { icon: Award, title: "Credentials & Evidence", why: "Verified credentials improve trust and strengthen your hiring position.", to: "/app/teacher/credentials", cta: "Manage Credentials" },
  { icon: Sparkles, title: "Recommendations", why: "Your next best actions are guided by your intelligence profile.", to: "/app/teacher/recommendations", cta: "View Recommendations" },
  { icon: Briefcase, title: "Jobs & Applications", why: "Your hiring position affects how competitive you appear to schools.", to: "/jobs", cta: "Browse Jobs" },
];

function ConnectedSurfaces() {
  return (
    <Card className="border-border/40">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Route className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Connected to your journey</h2>
        </div>
        <div className="grid gap-2">
          {CONNECTED_SURFACES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group flex items-start gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                <s.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{s.title}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.why}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Empty state ───────────────────────────────────── */

function ProfessionalIntelligenceEmpty() {
  return (
    <IntelligenceEmptyState icon={Shield} title="Professional Intelligence"
      message="Your professional intelligence profile hasn't been generated yet. Complete your profile, earn credentials, or finish training to build your intelligence portrait.">
      <div className="flex flex-wrap gap-2">
        <Link to="/app/teacher/profile"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors">
          Complete Profile <ArrowRight className="h-3 w-3" />
        </Link>
        <Link to="/app/teacher/training"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          Explore Training
        </Link>
      </div>
    </IntelligenceEmptyState>
  );
}

/* ── Page ───────────────────────────────────────────── */

export default function ProfessionalIntelligencePage() {
  const { data: teacherId, isLoading: idLoading } = useTeacherProfileId();
  const { data: profile, isLoading: profileLoading } = useTalentIntelligenceProfile(teacherId ?? undefined);

  const isLoading = idLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Professional Intelligence</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-7">
          Your central hub — connecting what you do across the platform to your career readiness and hiring outcomes.
        </p>
      </div>

      {!profile ? (
        <ProfessionalIntelligenceEmpty />
      ) : (
        <>
          <SmartActionBanner profile={profile} />
          <ProgressStrip profile={profile} />

          {/* Consolidated "Why" — Phase 6 Critical */}
          <ConsolidatedExplanation profile={profile} />

          <HiringPositionSection profile={profile} />
          <TalentIntelligenceCard profile={profile} />
          <CriBreakdown profile={profile} />
          <ProgressSummary profile={profile} />
          <GapSummary profile={profile} />
          <CredentialStrengthSection profile={profile} />
          <HiringAdvantage profile={profile} />
          <CausalityLoop />
          <ConnectedSurfaces />
        </>
      )}
    </div>
  );
}
