import { useMemo } from "react";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import StatCard from "@/components/training/StatCard";
import { ShieldCheck, CheckCircle2, Clock, Users, Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useComplianceRequirements } from "@/hooks/useComplianceRequirements";
import { useSchoolTrainingProgress } from "@/hooks/useSchoolTrainingProgress";
import { useSchoolAssignments } from "@/hooks/useTrainingAssignments";

const SchoolCompliance = () => {
  const { data: complianceData, isLoading: complianceLoading } = useComplianceRequirements();
  const { data: progress, isLoading: progressLoading } = useSchoolTrainingProgress();
  const { data: assignments, isLoading: assignmentsLoading } = useSchoolAssignments();

  const isLoading = complianceLoading || progressLoading || assignmentsLoading;

  // Derive compliance summary from both compliance_requirements table AND real assignment data
  const summary = useMemo(() => {
    // From compliance_requirements table
    const requirements = complianceData ?? [];
    const totalRequirements = requirements.length;
    const fullyCompliant = requirements.filter((r) => r.coveragePct === 100).length;
    const totalOverdue = requirements.reduce((sum, r) => sum + r.overdueCount, 0);

    // From real assignment data (overdue assignments past due_date)
    const overdueAssignments = (assignments ?? []).filter(
      (a) =>
        a.due_date &&
        new Date(a.due_date) < new Date() &&
        a.status !== "completed" &&
        a.status !== "certified" &&
        a.status !== "cancelled"
    );

    // From progress view
    const progressItems = (progress ?? []).map((row) => {
      const total = row.assigned_count;
      const compliant = row.completed_count + row.certified_count;
      const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
      return {
        item_id: row.item_id,
        item_title: row.item_title,
        item_type: row.item_type,
        total,
        compliant,
        pct,
      };
    });

    const uniqueTeachers = new Set(
      (assignments ?? []).filter((a) => a.status !== "cancelled").map((a) => a.assigned_to_teacher_id)
    ).size;

    return {
      requirements,
      totalRequirements,
      fullyCompliant,
      totalOverdue: totalOverdue + overdueAssignments.length,
      overdueAssignments,
      progressItems,
      uniqueTeachers,
    };
  }, [complianceData, progress, assignments]);

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

  const hasData = summary.totalRequirements > 0 || summary.progressItems.length > 0;

  if (!hasData) {
    return (
      <>
        <SchoolTrainingSubNav />
        <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
          <TrainingHeader
            title="Compliance Tracker"
            icon={ShieldCheck}
            description="Monitor mandatory training compliance across your team"
            rootTo="/app/school/training/overview"
          />
          <TrainingEmptyState
            icon={ShieldCheck}
            message="No compliance data available"
            hint="Compliance tracking will appear once training requirements are configured and training is assigned to your team."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Compliance" }]} />
        <TrainingHeader
          title="Compliance Tracker"
          icon={ShieldCheck}
          description="Monitor mandatory training compliance across your team"
          rootTo="/app/school/training/overview"
        />

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Team Members" value={summary.uniqueTeachers} icon={Users} iconCircle />
          <StatCard
            label="Fully Compliant"
            value={`${summary.fullyCompliant} / ${summary.totalRequirements || summary.progressItems.length}`}
            icon={CheckCircle2}
            iconCircle
          />
          <StatCard label="Requirements" value={summary.totalRequirements || summary.progressItems.length} icon={Clock} iconCircle />
          <StatCard
            label="Overdue"
            value={summary.totalOverdue}
            icon={AlertTriangle}
            iconCircle
            valueClassName={summary.totalOverdue > 0 ? "text-destructive" : undefined}
          />
        </div>

        {/* Compliance Requirements Table */}
        {summary.requirements.length > 0 && (
          <TrainingSection title="Compliance Requirements">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.requirements.map((r) => (
                    <TableRow key={r.requirement.id}>
                      <TableCell className="font-medium">{r.requirement.title}</TableCell>
                      <TableCell>
                        <Badge variant={r.requirement.is_mandatory ? "default" : "secondary"}>
                          {r.requirement.is_mandatory ? "Mandatory" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={r.coveragePct} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{r.completedCount}/{r.totalTeachers}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.coveragePct === 100 ? "default" : "secondary"}>
                          {r.coveragePct}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.requirement.due_date ? new Date(r.requirement.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TrainingSection>
        )}

        {/* Training Coverage from progress view */}
        {summary.progressItems.length > 0 && (
          <TrainingSection title="Training Coverage">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.progressItems.map((r) => (
                    <TableRow key={r.item_id}>
                      <TableCell className="font-medium">{r.item_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{r.item_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={r.pct} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{r.compliant}/{r.total}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.pct === 100 ? "default" : "secondary"}>
                          {r.pct}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TrainingSection>
        )}

        {/* Overdue Assignments */}
        {summary.overdueAssignments.length > 0 && (
          <TrainingSection title="Overdue Assignments">
            <div className="space-y-2">
              {summary.overdueAssignments.slice(0, 10).map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{a.item_title}</p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      Due {new Date(a.due_date!).toLocaleDateString()}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TrainingSection>
        )}
      </div>
    </>
  );
};

export default SchoolCompliance;
