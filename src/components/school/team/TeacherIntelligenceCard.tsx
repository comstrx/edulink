/**
 * TeacherIntelligenceCard — Sprint 1: Team Intelligence Layer
 *
 * Per-teacher intelligence card for school team view.
 * Shows banded CRI, verification, training status, gaps, readiness.
 * Privacy-safe: no raw scores, no recommendation details.
 */

import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, ShieldAlert, ShieldQuestion,
  BookOpen, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, Award, GraduationCap, Eye,
} from "lucide-react";
import type { SchoolTeacherIntelligence } from "@/intelligence/school/types/school-teacher-intelligence.types";
import type { CanonicalCriBand } from "@/intelligence/shared/cri-band.utils";
import { CRI_BAND_LABELS } from "@/intelligence/shared/cri-band.utils";

const ROLE_LABELS: Record<string, string> = {
  school_admin: "Admin",
  school_recruiter: "Recruiter",
  school_academic_lead: "Academic Lead",
  school_training_manager: "Training Manager",
};

const CRI_BAND_STYLES: Record<CanonicalCriBand, string> = {
  not_ready: "bg-destructive/10 text-destructive border-destructive/30",
  emerging: "bg-warning/10 text-warning border-warning/30",
  strong: "bg-primary/10 text-primary border-primary/30",
  highly_ready: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const READINESS_CONFIG: Record<string, { label: string; className: string }> = {
  ready: { label: "Ready", className: "text-emerald-600" },
  needs_improvement: { label: "Needs Improvement", className: "text-warning" },
  critical: { label: "Critical", className: "text-destructive" },
};

const TRAINING_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  not_started: { label: "No Training", icon: XCircle, className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: BookOpen, className: "text-primary" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-emerald-600" },
};

interface Props {
  teacher: SchoolTeacherIntelligence;
}

const TeacherIntelligenceCard = ({ teacher }: Props) => {
  const navigate = useNavigate();
  const readiness = READINESS_CONFIG[teacher.readinessLevel] ?? READINESS_CONFIG.needs_improvement;
  const training = TRAINING_CONFIG[teacher.trainingStatus] ?? TRAINING_CONFIG.not_started;
  const TrainingIcon = training.icon;

  return (
    <Card className={`transition-colors ${teacher.needsAttention ? "ring-1 ring-destructive/40 border-destructive/30 bg-destructive/[0.02]" : ""}`}>
      <CardContent className="p-4">
        {/* Header: Name + Role + Attention Flag */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {teacher.avatarUrl ? (
                <img
                  src={teacher.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {teacher.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{teacher.name}</p>
                {teacher.email && (
                  <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-xs">
              {ROLE_LABELS[teacher.roleKey] ?? teacher.roleKey}
            </Badge>
            {teacher.needsAttention && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>

        {/* Intelligence Row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* CRI Band */}
          <Badge
            variant="outline"
            className={`text-xs font-medium ${CRI_BAND_STYLES[teacher.bandedCRI]}`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {CRI_BAND_LABELS[teacher.bandedCRI]}
          </Badge>

          {/* Verification */}
          {teacher.verificationStatus === "verified" && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
              <ShieldCheck className="h-3 w-3 mr-1" /> Verified
            </Badge>
          )}
          {teacher.verificationStatus === "partial" && (
            <Badge variant="outline" className="text-xs text-warning border-warning/30 bg-warning/10">
              <ShieldAlert className="h-3 w-3 mr-1" /> Partial
            </Badge>
          )}
          {teacher.verificationStatus === "not_verified" && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <ShieldQuestion className="h-3 w-3 mr-1" /> Unverified
            </Badge>
          )}

          {/* Training Status */}
          <Badge variant="outline" className={`text-xs ${training.className}`}>
            <TrainingIcon className="h-3 w-3 mr-1" />
            {training.label}
            {teacher.activeTrainingCount > 0 && ` (${teacher.activeTrainingCount})`}
          </Badge>

          {/* Gap Count */}
          {teacher.gapSummary.gapCount > 0 && (
            <Badge
              variant="outline"
              className={`text-xs ${teacher.gapSummary.gapCount > 2 ? "text-destructive border-destructive/30" : "text-muted-foreground"}`}
            >
              {teacher.gapSummary.gapCount} gap{teacher.gapSummary.gapCount !== 1 ? "s" : ""}
              {teacher.gapSummary.topGapArea && ` · ${teacher.gapSummary.topGapArea}`}
            </Badge>
          )}
        </div>

        {/* Context + Readiness + Actions */}
        {teacher.needsAttention && (
          <p className="text-xs text-muted-foreground mb-2">
            {teacher.gapSummary.topGapArea
              ? `Needs support in ${teacher.gapSummary.topGapArea}`
              : teacher.gapSummary.gapCount > 0
                ? `${teacher.gapSummary.gapCount} gap${teacher.gapSummary.gapCount !== 1 ? "s" : ""} identified`
                : "Needs attention"}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${readiness.className}`}>
            {readiness.label}
          </span>
          <div className="flex items-center gap-1.5">
            {teacher.needsAttention && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => navigate(`/app/school/training/assign?teacherId=${teacher.teacherId}`)}
              >
                <GraduationCap className="h-3 w-3" />
                Assign Training
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={() => navigate(`/teachers/${teacher.teacherId}`)}
            >
              <Eye className="h-3 w-3" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherIntelligenceCard;
