/**
 * SkillProfileCard — Progressive Domain Activation
 *
 * States:
 * - NOT STARTED: no skills → purposeful CTA
 * - ACTIVE: skills exist → full display
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { SkillDisplayEntry } from "@/growth/hooks/useSkillProfileDisplay";
import type { SkillGapEntry } from "@/growth/types/growth-summary.types";

const PROFICIENCY_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  advanced: "default",
  expert: "default",
  intermediate: "secondary",
};

interface SkillProfileCardProps {
  skills: SkillDisplayEntry[];
  skillGaps: SkillGapEntry[];
  isLoading: boolean;
}

export default function SkillProfileCard({ skills, skillGaps, isLoading }: SkillProfileCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading skills…</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Skill Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {skills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Add your skills to get started</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Your skill profile powers match scoring and career recommendations.
            </p>
            <Link
              to="/app/teacher/profile"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Target className="h-2.5 w-2.5" />
              Add skills
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 12).map((s) => (
              <Badge
                key={s.termId}
                variant={PROFICIENCY_VARIANT[s.proficiencyLevel ?? ""] ?? "outline"}
                className="text-[10px]"
              >
                {s.name}
              </Badge>
            ))}
            {skills.length > 12 && (
              <Badge variant="outline" className="text-[10px]">
                +{skills.length - 12} more
              </Badge>
            )}
          </div>
        )}
        {skillGaps.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">
            {skillGaps.length} gap{skillGaps.length !== 1 ? "s" : ""} identified
          </p>
        )}
      </CardContent>
    </Card>
  );
}
