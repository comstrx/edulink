import { useMemo, useState } from "react";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import StatCard from "@/components/training/StatCard";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import { TrendingUp, Users, Award, Clock, Loader2, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchoolTrainingProgress } from "@/hooks/useSchoolTrainingProgress";
import { useSchoolAssignments, type AssignmentStatus } from "@/hooks/useTrainingAssignments";

const statusLabel: Record<AssignmentStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  certified: "Certified",
  cancelled: "Cancelled",
};

const statusVariant: Record<AssignmentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  assigned: "secondary",
  in_progress: "default",
  completed: "outline",
  certified: "outline",
  cancelled: "destructive",
};

const TeamProgress = () => {
  const { data: progress, isLoading: progressLoading } = useSchoolTrainingProgress();
  const { data: assignments, isLoading: assignmentsLoading } = useSchoolAssignments();

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  const isLoading = progressLoading || assignmentsLoading;

  // Unique teachers for filter dropdown
  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    (assignments ?? []).forEach((a) => map.set(a.assigned_to_teacher_id, a.teacher_name));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [assignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    let list = (assignments ?? []).filter((a) => a.status !== "cancelled");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.item_title.toLowerCase().includes(q) || a.teacher_name.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter((a) => a.assigned_item_type === typeFilter);
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (teacherFilter !== "all") list = list.filter((a) => a.assigned_to_teacher_id === teacherFilter);

    return list;
  }, [assignments, search, typeFilter, statusFilter, teacherFilter]);

  // Totals from the view
  const totals = useMemo(() => {
    if (!progress) return { assigned: 0, started: 0, completed: 0, certified: 0, cancelled: 0 };
    return progress.reduce(
      (acc, r) => ({
        assigned: acc.assigned + r.assigned_count,
        started: acc.started + r.started_count,
        completed: acc.completed + r.completed_count,
        certified: acc.certified + r.certified_count,
        cancelled: acc.cancelled + r.cancelled_count,
      }),
      { assigned: 0, started: 0, completed: 0, certified: 0, cancelled: 0 }
    );
  }, [progress]);

  // Teacher-level aggregation
  const teacherStats = useMemo(() => {
    const map = new Map<string, { name: string; assigned: number; inProgress: number; completed: number; certified: number }>();
    filteredAssignments.forEach((a) => {
      if (!map.has(a.assigned_to_teacher_id)) {
        map.set(a.assigned_to_teacher_id, { name: a.teacher_name, assigned: 0, inProgress: 0, completed: 0, certified: 0 });
      }
      const entry = map.get(a.assigned_to_teacher_id)!;
      if (a.status === "assigned") entry.assigned++;
      else if (a.status === "in_progress") entry.inProgress++;
      else if (a.status === "completed") entry.completed++;
      else if (a.status === "certified") entry.certified++;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAssignments]);

  const uniqueTeachers = new Set((assignments ?? []).filter((a) => a.status !== "cancelled").map((a) => a.assigned_to_teacher_id)).size;

  // Completion distribution
  const distribution = useMemo(() => {
    const total = totals.assigned + totals.started + totals.completed + totals.certified;
    if (total === 0) return { assignedPct: 0, startedPct: 0, completedPct: 0, certifiedPct: 0 };
    const pct = (n: number) => Math.round((n / total) * 100);
    return {
      assignedPct: pct(totals.assigned - totals.started - totals.completed - totals.certified),
      startedPct: pct(totals.started),
      completedPct: pct(totals.completed),
      certifiedPct: pct(totals.certified),
    };
  }, [totals]);

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
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Team Progress" }]} />
        <TrainingHeader
          title="Team Progress"
          icon={TrendingUp}
          description="Track your team's professional development progress"
          rootTo="/app/school/training/overview"
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Team Members" value={uniqueTeachers} icon={Users} />
          <StatCard label="Total Assignments" value={totals.assigned} icon={Clock} />
          <StatCard label="In Progress" value={totals.started} valueClassName="text-primary" />
          <StatCard label="Completed" value={totals.completed + totals.certified} icon={Award} />
        </div>

        {/* Completion Distribution */}
        {totals.assigned > 0 && (
          <Card className="p-4">
            <p className="text-sm font-medium mb-3">Completion Distribution</p>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
              {totals.certified > 0 && (
                <div className="bg-primary h-full" style={{ width: `${distribution.certifiedPct}%` }} title={`Certified: ${distribution.certifiedPct}%`} />
              )}
              {totals.completed > 0 && (
                <div className="bg-primary/60 h-full" style={{ width: `${distribution.completedPct}%` }} title={`Completed: ${distribution.completedPct}%`} />
              )}
              {totals.started > 0 && (
                <div className="bg-primary/30 h-full" style={{ width: `${distribution.startedPct}%` }} title={`Started: ${distribution.startedPct}%`} />
              )}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Certified ({totals.certified})</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/60 inline-block" /> Completed ({totals.completed})</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/30 inline-block" /> In Progress ({totals.started})</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" /> Assigned ({totals.assigned - totals.started - totals.completed - totals.certified})</span>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by teacher or item…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Item Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="pathway">Pathway</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="certified">Certified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teacherOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignment List */}
        <TrainingSection title={`Assignments (${filteredAssignments.length})`}>
          {filteredAssignments.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Training Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.teacher_name}</TableCell>
                      <TableCell>{a.item_title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{a.assigned_item_type}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <TrainingEmptyState icon={TrendingUp} message="No assignments match filters" hint="Adjust your filters or assign training to your team." />
          )}
        </TrainingSection>

        {/* By Training Item (from view) */}
        <TrainingSection title="Progress by Training Item">
          {(progress ?? []).length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Certified</TableHead>
                    <TableHead className="w-32">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(progress ?? []).map((row) => {
                    const completionRate = row.assigned_count > 0
                      ? Math.round(((row.completed_count + row.certified_count) / row.assigned_count) * 100)
                      : 0;
                    return (
                      <TableRow key={row.item_id}>
                        <TableCell className="font-medium">{row.item_title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{row.item_type}</Badge></TableCell>
                        <TableCell>{row.assigned_count}</TableCell>
                        <TableCell>{row.started_count}</TableCell>
                        <TableCell>{row.completed_count}</TableCell>
                        <TableCell>{row.certified_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={completionRate} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8">{completionRate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <TrainingEmptyState icon={TrendingUp} message="No training data" hint="Assign training to see item-level progress." />
          )}
        </TrainingSection>

        {/* By Teacher */}
        <TrainingSection title="Progress by Teacher">
          {teacherStats.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>In Progress</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Certified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherStats.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant="secondary">{t.assigned}</Badge></TableCell>
                      <TableCell><Badge variant="default">{t.inProgress}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{t.completed}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{t.certified}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <TrainingEmptyState icon={Users} message="No assignments yet" hint="Assign training to your team to see progress." />
          )}
        </TrainingSection>
      </div>
    </>
  );
};

export default TeamProgress;
