import { useMemo } from "react";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import TrainingSection from "@/components/training/TrainingSection";
import StatCard from "@/components/training/StatCard";
import CohortCard from "@/components/training/CohortCard";
import { UsersRound, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSchoolAssignments } from "@/hooks/useTrainingAssignments";

/**
 * Cohorts page — groups school training assignments by item to form cohort-like views.
 * No mock data. Derives cohort structure from real assignment data.
 */
const SchoolCohorts = () => {
  const { data: assignments, isLoading } = useSchoolAssignments();

  const cohorts = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];

    // Group assignments by training item to form logical cohorts
    const byItem = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const key = a.assigned_item_id;
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key)!.push(a);
    }

    return Array.from(byItem.entries()).map(([itemId, members]) => {
      const first = members[0];
      const completedCount = members.filter(
        (m) => m.status === "completed" || m.status === "certified"
      ).length;
      const cancelledCount = members.filter((m) => m.status === "cancelled").length;
      const activeMembers = members.filter((m) => m.status !== "cancelled");
      const progress =
        activeMembers.length > 0
          ? Math.round((completedCount / activeMembers.length) * 100)
          : 0;

      const allDone = progress === 100 && activeMembers.length > 0;

      // Find earliest and latest dates
      const dates = members.map((m) => m.created_at).sort();
      const dueDates = members
        .map((m) => m.due_date)
        .filter(Boolean)
        .sort() as string[];

      return {
        id: itemId,
        name: first.item_title ?? "Untitled Training",
        members: activeMembers.length,
        course: first.item_title ?? "Unknown",
        startDate: dates[0] ?? "",
        endDate: dueDates[dueDates.length - 1] ?? "",
        progress,
        status: allDone ? "completed" : "active",
      };
    });
  }, [assignments]);

  const activeCohorts = cohorts.filter((c) => c.status === "active");
  const completedCohorts = cohorts.filter((c) => c.status === "completed");
  const totalParticipants = cohorts.reduce((sum, c) => sum + c.members, 0);

  if (isLoading) {
    return (
      <>
        <SchoolTrainingSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Cohorts" }]} />
        <TrainingHeader
          title="Training Cohorts"
          icon={UsersRound}
          description="Group-based training programmes for your team"
          rootTo="/app/school/training/overview"
        />

        {cohorts.length === 0 ? (
          <TrainingEmptyState
            icon={UsersRound}
            message="No cohorts yet"
            hint="Cohorts will form automatically when you assign training to multiple team members."
          />
        ) : (
          <>
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Active Cohorts" value={activeCohorts.length} />
              <StatCard label="Total Participants" value={totalParticipants} />
              <StatCard
                label="Completed"
                value={completedCohorts.length}
                valueClassName="text-primary"
              />
            </div>

            {activeCohorts.length > 0 && (
              <TrainingSection title="Active Cohorts">
                <div className="grid gap-4 md:grid-cols-2">
                  {activeCohorts.map((c) => (
                    <CohortCard key={c.id} item={c} />
                  ))}
                </div>
              </TrainingSection>
            )}

            {completedCohorts.length > 0 && (
              <TrainingSection title="Completed Cohorts">
                <div className="grid gap-4 md:grid-cols-2">
                  {completedCohorts.map((c) => (
                    <CohortCard key={c.id} item={c} />
                  ))}
                </div>
              </TrainingSection>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default SchoolCohorts;
