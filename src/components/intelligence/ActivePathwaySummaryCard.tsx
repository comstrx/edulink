import { Link } from "react-router-dom";
import { Route, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { usePathwayExecutions } from "@/hooks/usePathwayRuntime";

const ActivePathwaySummaryCard = () => {
  const { data: pathways } = usePathwayExecutions();

  const active = (pathways ?? []).filter(
    (p) => p.status === "active" || p.status === "enrolled",
  );

  if (active.length === 0) return null;

  // Pick the pathway with most progress (most actionable)
  const primary = active.reduce((best, p) =>
    p.computed_progress_percent > best.computed_progress_percent ? p : best,
  );

  const nextMilestone = primary.milestones.find((m) => m.status === "available");

  return (
    <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <Route className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">
              {active.length === 1
                ? "1 Active Pathway"
                : `${active.length} Active Pathways`}
            </p>
          </div>
        </div>
        <Link
          to="/app/teacher/pathways"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Primary pathway snapshot */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground truncate">
          {primary.pathway_title}
        </p>
        <Progress value={primary.computed_progress_percent} className="h-1.5" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {primary.completed_milestones_count}/{primary.total_milestones_count} milestones
            {" · "}
            {primary.computed_progress_percent}%
          </span>
          {nextMilestone && (
            <span className="truncate ml-2">
              Next: {nextMilestone.milestone_title}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivePathwaySummaryCard;
