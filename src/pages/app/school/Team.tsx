import { useState, useMemo } from "react";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { safeMutation } from "@/lib/safe-mutation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Mail, Clock, X, AlertTriangle, Loader2 } from "lucide-react";
import { useSchoolTeamDetailedIntelligence } from "@/intelligence/school/hooks/useSchoolTeamDetailedIntelligence";
import TeacherIntelligenceCard from "@/components/school/team/TeacherIntelligenceCard";
import TeamIntelligenceFilters, { type TeamFilters } from "@/components/school/team/TeamIntelligenceFilters";
import TeamIntelligenceSummary from "@/components/school/intelligence/TeamIntelligenceSummary";
import TeamGapInsights from "@/components/school/dashboard/TeamGapInsights";

const ROLE_LABELS: Record<string, string> = {
  school_admin: "Admin",
  school_recruiter: "Recruiter",
  school_academic_lead: "Academic Lead",
  school_training_manager: "Training Manager",
};

const Team = () => {
  const { user, roles } = useAuth();
  const { workspace } = useCurrentSchoolWorkspace();
  const isAdmin = roles.includes("school_admin");
  const queryClient = useQueryClient();
  const schoolId = workspace?.schoolId;

  // Intelligence data
  const { resolvedState, data: intelligenceData } = useSchoolTeamDetailedIntelligence(schoolId);

  // Filters
  const [filters, setFilters] = useState<TeamFilters>({
    readiness: "all",
    training: "all",
    verification: "all",
  });

  // Pending invitations (admin only)
  const { data: invitations, isLoading: invLoading } = useQuery({
    queryKey: ["school_invitations", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("school_invitations")
        .select("*")
        .eq("school_id", schoolId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId && isAdmin,
  });

  // Apply filters
  const filteredTeachers = useMemo(() => {
    if (!intelligenceData?.teachers) return [];
    return intelligenceData.teachers.filter((t) => {
      if (filters.readiness !== "all" && t.readinessLevel !== filters.readiness) return false;
      if (filters.training !== "all" && t.trainingStatus !== filters.training) return false;
      if (filters.verification !== "all" && t.verificationStatus !== filters.verification) return false;
      return true;
    });
  }, [intelligenceData?.teachers, filters]);

  const attentionCount = intelligenceData?.teachers.filter((t) => t.needsAttention).length ?? 0;
  const isLoading = resolvedState === "loading" || invLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Team
          </h1>
          <p className="text-muted-foreground">
            {workspace?.schoolName ?? "School"} — Team intelligence & invitations
          </p>
        </div>
        {isAdmin && <InviteDialog schoolId={schoolId} userId={user?.id} />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Team Intelligence Overview */}
          {schoolId && (
            <div className="space-y-3">
              <TeamIntelligenceSummary schoolId={schoolId} />
              <TeamGapInsights schoolId={schoolId} />
            </div>
          )}

          {/* Attention Summary */}
          {attentionCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm">
                <span className="font-medium text-destructive">{attentionCount}</span>
                {" "}team member{attentionCount !== 1 ? "s" : ""} need{attentionCount === 1 ? "s" : ""} attention
              </p>
            </div>
          )}

          {/* Filters */}
          <TeamIntelligenceFilters
            filters={filters}
            onChange={setFilters}
            counts={{
              total: intelligenceData?.teachers.length ?? 0,
              attention: attentionCount,
            }}
          />

          {/* Teacher Intelligence Cards */}
          {filteredTeachers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {(intelligenceData?.teachers.length ?? 0) > 0
                    ? "No team members match the current filters"
                    : "No team members yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTeachers.map((teacher) => (
                <TeacherIntelligenceCard key={teacher.teacherId} teacher={teacher} />
              ))}
            </div>
          )}

          {/* Pending Invitations */}
          {isAdmin && (invitations ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Pending Invitations ({invitations?.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(invitations ?? []).map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[inv.role_key] ?? inv.role_key}
                      </Badge>
                      <CancelInviteButton
                        invitationId={inv.id}
                        schoolId={schoolId}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

function InviteDialog({ schoolId, userId }: { schoolId?: string; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("school_recruiter");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const handleInvite = async () => {
    if (!schoolId || !userId || !email.trim()) return;
    setSending(true);
    const { success } = await safeMutation(
      () =>
        supabase.from("school_invitations").insert({
          school_id: schoolId,
          email: email.trim().toLowerCase(),
          role_key: role,
          invited_by: userId,
        }),
      {
        successMessage: `Invitation sent to ${email}`,
        errorMessage: "Failed to send invitation",
      }
    );
    setSending(false);
    if (success) {
      setEmail("");
      setRole("school_recruiter");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["school_invitations", schoolId] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your school workspace
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school_admin">Admin — Full access</SelectItem>
                <SelectItem value="school_recruiter">Recruiter — Hiring module</SelectItem>
                <SelectItem value="school_academic_lead">Academic Lead — Training module</SelectItem>
                <SelectItem value="school_training_manager">Training Manager — Training module</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={sending || !email.trim()}>
            {sending ? "Sending…" : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelInviteButton({ invitationId, schoolId }: { invitationId: string; schoolId?: string }) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    await safeMutation(
      () =>
        supabase
          .from("school_invitations")
          .update({ status: "cancelled" })
          .eq("id", invitationId),
      {
        successMessage: "Invitation cancelled",
        errorMessage: "Failed to cancel invitation",
      }
    );
    setCancelling(false);
    queryClient.invalidateQueries({ queryKey: ["school_invitations", schoolId] });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleCancel}
      disabled={cancelling}
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}

export default Team;
