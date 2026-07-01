import { useState, useMemo } from "react";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import StatCard from "@/components/training/StatCard";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import NewAssignmentDialog from "@/components/training/NewAssignmentDialog";
import { UserPlus, Search, BookOpen, Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useSchoolAssignments,
  useCancelAssignment,
  type AssignmentStatus,
} from "@/hooks/useTrainingAssignments";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<AssignmentStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  assigned: { label: "Assigned", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  certified: { label: "Certified", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const AssignTraining = () => {
  const { data: assignments, isLoading } = useSchoolAssignments();
  const cancelMutation = useCancelAssignment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    if (!assignments) return [];
    let list = assignments;

    // Tab filter
    if (tab === "in_progress") list = list.filter((a) => a.status === "in_progress");
    else if (tab === "completed") list = list.filter((a) => a.status === "completed" || a.status === "certified");
    else if (tab === "assigned") list = list.filter((a) => a.status === "assigned");

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.item_title.toLowerCase().includes(q) ||
          a.teacher_name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [assignments, tab, search]);

  const activeAssignments = (assignments ?? []).filter((a) => a.status !== "cancelled");
  const inProgressCount = activeAssignments.filter((a) => a.status === "in_progress").length;
  const completedCount = activeAssignments.filter((a) => a.status === "completed" || a.status === "certified").length;
  const assignedCount = activeAssignments.filter((a) => a.status === "assigned").length;

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success("Assignment cancelled");
    } catch {
      toast.error("Failed to cancel assignment");
    }
  };

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
          <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Assign Training" }]} />
        <TrainingHeader
          title="Assign Training"
          icon={UserPlus}
          description="Assign courses and pathways to team members"
          rootTo="/app/school/training/overview"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> New Assignment
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Active" value={activeAssignments.length} />
          <StatCard label="Assigned" value={assignedCount} />
          <StatCard label="In Progress" value={inProgressCount} valueClassName="text-primary" />
          <StatCard label="Completed" value={completedCount} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by teacher or training item…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({activeAssignments.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({assignedCount})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({inProgressCount})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
          </TabsList>

          {["all", "assigned", "in_progress", "completed"].map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey}>
              {filtered.length === 0 ? (
                <Card className="border-dashed">
                  <TrainingEmptyState
                    icon={BookOpen}
                    message="No assignments found"
                    hint={tab === "all" ? 'Click "New Assignment" to assign training to your team.' : "No assignments match this filter."}
                  />
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Training Item</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((a) => {
                        const st = statusConfig[a.status];
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.item_title}</TableCell>
                            <TableCell>{a.teacher_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{a.assigned_item_type}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(a.assigned_at), "yyyy-MM-dd")}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {a.due_date ? format(new Date(a.due_date), "yyyy-MM-dd") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={st.variant}>{st.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {a.status !== "cancelled" && a.status !== "completed" && a.status !== "certified" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleCancel(a.id)}
                                  title="Cancel assignment"
                                >
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <NewAssignmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

export default AssignTraining;
