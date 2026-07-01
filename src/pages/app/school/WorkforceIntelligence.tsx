/**
 * School Workforce Intelligence Page — Sprint 8D
 *
 * Minimal school-facing view for institutional workforce insights.
 */

import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useWorkforceIntelligence } from "@/workforce/hooks/useWorkforceIntelligence";
import WorkforceDashboardCard from "@/components/workforce/WorkforceDashboardCard";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { refreshWorkforceIntelligence } from "@/workforce/engine/workforce-refresh.service";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const WorkforceIntelligencePage = () => {
  const { workspace } = useCurrentSchoolWorkspace();
  const schoolId = workspace?.schoolId;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useWorkforceIntelligence(schoolId);

  const handleRefresh = async () => {
    if (!schoolId) return;
    setRefreshing(true);
    try {
      await refreshWorkforceIntelligence(schoolId);
      queryClient.invalidateQueries({ queryKey: ["workforce_intelligence"] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Workforce Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your teaching team&apos;s capabilities and readiness
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || !schoolId}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <WorkforceDashboardCard data={data} isLoading={isLoading} />
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default WorkforceIntelligencePage;
