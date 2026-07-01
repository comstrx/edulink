/**
 * TeamIntelligenceFilters — Sprint 1: Team Intelligence Layer
 *
 * Simple filter bar for readiness, training status, and verification.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeacherReadinessLevel, TeacherTrainingStatus, TeacherVerificationStatus } from "@/intelligence/school/types/school-teacher-intelligence.types";

export interface TeamFilters {
  readiness: TeacherReadinessLevel | "all";
  training: TeacherTrainingStatus | "all";
  verification: TeacherVerificationStatus | "all";
}

interface Props {
  filters: TeamFilters;
  onChange: (filters: TeamFilters) => void;
  counts: {
    total: number;
    attention: number;
  };
}

const TeamIntelligenceFilters = ({ filters, onChange, counts }: Props) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{counts.total}</span> members
        {counts.attention > 0 && (
          <span className="text-destructive ml-1">
            · {counts.attention} need{counts.attention !== 1 ? "" : "s"} attention
          </span>
        )}
      </div>

      <div className="flex gap-2 ml-auto">
        <Select
          value={filters.readiness}
          onValueChange={(v) => onChange({ ...filters, readiness: v as any })}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Readiness" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Readiness</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.training}
          onValueChange={(v) => onChange({ ...filters, training: v as any })}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Training" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Training</SelectItem>
            <SelectItem value="not_started">No Training</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.verification}
          onValueChange={(v) => onChange({ ...filters, verification: v as any })}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verification</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="not_verified">Unverified</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TeamIntelligenceFilters;
