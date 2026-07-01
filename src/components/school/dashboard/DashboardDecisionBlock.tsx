import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";
import { buildPriorityItems, type PriorityItem } from "@/lib/school/decision-system/buildPriorityItems";
import type { SchoolDashboardStats } from "@/hooks/useSchoolDashboardStats";

interface Props {
  stats: SchoolDashboardStats;
  canUseHiring: boolean;
  canUseTraining: boolean;
}

const DashboardDecisionBlock = ({ stats, canUseHiring, canUseTraining }: Props) => {
  const navigate = useNavigate();
  const items = buildPriorityItems(stats, canUseHiring, canUseTraining);

  // Empty state — no canonical items
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4 px-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium">No urgent actions right now</p>
            <p className="text-xs text-muted-foreground">Your school is on track.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use canonical top item as the summary decision
  const top = items[0];
  const TopIcon = top.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          What should you do next?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <button
          onClick={() => navigate(top.path)}
          className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 w-full"
        >
          <div className="rounded-md bg-primary/10 p-2 shrink-0">
            <TopIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{top.problem}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{top.explanation}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        </button>
      </CardContent>
    </Card>
  );
};

export default DashboardDecisionBlock;
