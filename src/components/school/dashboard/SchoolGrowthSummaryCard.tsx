/**
 * SchoolGrowthSummaryCard — Sprint 5
 *
 * Aggregate-only view of hiring-driven growth needs across the school team.
 * Shows NO teacher names, NO personal recommendation details.
 * Only counts and aggregated support areas.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight } from "lucide-react";
import { useSchoolGrowthSummary } from "@/hooks/useSchoolGrowthSummary";

interface SchoolGrowthSummaryCardProps {
  schoolId: string;
}

const SchoolGrowthSummaryCard = ({ schoolId }: SchoolGrowthSummaryCardProps) => {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useSchoolGrowthSummary(schoolId);

  // Don't render if loading or no data to show
  if (isLoading || !summary || summary.totalRecommendations === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          Staff Development Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {summary.affectedTeachers} team member{summary.affectedTeachers !== 1 ? "s have" : " has"}{" "}
          {summary.totalRecommendations} active growth action{summary.totalRecommendations !== 1 ? "s" : ""}{" "}
          from hiring feedback
        </p>

        {summary.topAreas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {summary.topAreas.map((area) => (
              <Badge key={area.label} variant="secondary" className="text-xs font-normal">
                {area.label} ({area.count})
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/school/training/overview")}
            className="text-xs"
          >
            Explore Training <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolGrowthSummaryCard;
