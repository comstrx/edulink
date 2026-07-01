/**
 * School Mentors — Hardened with mentorship status visibility.
 * Shows high-level mentorship progress for team members linked to training executions.
 * Privacy-safe: no reflection text, no mentor notes, no file access.
 */
import { useQuery } from "@tanstack/react-query";
import SchoolTrainingSubNav from "@/components/training/SchoolTrainingSubNav";
import SchoolBreadcrumb from "@/components/school/SchoolBreadcrumb";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import MentorCard from "@/components/training/MentorCard";
import { Users, MessageSquare, Loader2, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMentorList } from "@/hooks/useMentorDirectory";
import { useSchoolTeamMentorReviews } from "@/hooks/useSchoolMentorReviews";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchoolWorkspace } from "@/hooks/useCurrentSchoolWorkspace";

/** Fetch high-level mentorship status for school team members */
function useSchoolMentorshipStatus() {
  const { workspace } = useCurrentSchoolWorkspace();
  const schoolProfileId = workspace?.schoolId;

  return useQuery({
    queryKey: ["school_mentorship_status", schoolProfileId],
    queryFn: async () => {
      if (!schoolProfileId) return [];

      // Get all team members
      const { data: teamMembers } = await (supabase as any) // deep type instantiation workaround
        .from("school_team_members")
        .select("teacher_id")
        .eq("school_id", schoolProfileId);

      if (!teamMembers?.length) return [];
      const teacherIds = teamMembers.map((m: any) => m.teacher_id);

      // Get sessions linked to training executions for team members
      const { data: sessions } = await (supabase as any) // deep type instantiation workaround
        .from("mentor_sessions")
        .select("id, teacher_id, status, training_execution_id, scheduled_at, evidence_submitted, session_outcome")
        .in("teacher_id", teacherIds)
        .not("training_execution_id", "is", null)
        .order("scheduled_at", { ascending: false });

      if (!sessions?.length) return [];

      // Resolve teacher names
      const { data: teachers } = await (supabase as any) // deep type instantiation workaround
        .from("teacher_profiles")
        .select("id, full_name")
        .in("id", teacherIds);

      const nameMap: Record<string, string> = {};
      (teachers ?? []).forEach((t: any) => { nameMap[t.id] = t.full_name; });

      // Resolve training item names
      const execIds = [...new Set(sessions.map((s: any) => s.training_execution_id))];
      const { data: executions } = await (supabase as any) // deep type instantiation workaround
        .from("training_executions")
        .select("id, training_item_id")
        .in("id", execIds);

      const itemIds = [...new Set((executions ?? []).map((e: any) => e.training_item_id))];
      const { data: items } = await (supabase as any) // deep type instantiation workaround
        .from("training_items")
        .select("id, title")
        .in("id", itemIds);

      const itemMap: Record<string, string> = {};
      (items ?? []).forEach((i: any) => { itemMap[i.id] = i.title; });
      const execItemMap: Record<string, string> = {};
      (executions ?? []).forEach((e: any) => { execItemMap[e.id] = itemMap[e.training_item_id] ?? "Training"; });

      // Get evidence status for sessions
      const sessionIds = sessions.map((s: any) => s.id);
      const { data: evidence } = await (supabase as any)
        .from("mentor_session_evidence")
        .select("session_id, status")
        .in("session_id", sessionIds);

      const evidenceMap: Record<string, string> = {};
      (evidence ?? []).forEach((e: any) => {
        // Take the "best" status: approved > submitted > rejected
        const current = evidenceMap[e.session_id];
        if (!current || e.status === "approved" || (e.status === "submitted" && current !== "approved")) {
          evidenceMap[e.session_id] = e.status;
        }
      });

      return sessions.map((s: any) => ({
        id: s.id,
        teacherName: nameMap[s.teacher_id] ?? "Teacher",
        trainingItem: execItemMap[s.training_execution_id] ?? "Training",
        sessionStatus: s.status,
        sessionDate: s.scheduled_at,
        evidenceSubmitted: s.evidence_submitted ?? false,
        evidenceStatus: evidenceMap[s.id] ?? null,
        sessionOutcome: s.session_outcome,
      }));
    },
    enabled: !!schoolProfileId,
  });
}

const SchoolMentors = () => {
  const { data: mentors, isLoading: mentorsLoading } = useMentorList();
  const { data: teamReviews, isLoading: reviewsLoading } = useSchoolTeamMentorReviews();
  const { data: mentorshipStatus, isLoading: statusLoading } = useSchoolMentorshipStatus();

  const isLoading = mentorsLoading || reviewsLoading || statusLoading;

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

  const hasMentors = mentors && mentors.length > 0;
  const hasReviews = teamReviews && teamReviews.length > 0;
  const hasStatus = mentorshipStatus && mentorshipStatus.length > 0;

  const getImpactBadge = (evidenceStatus: string | null) => {
    if (evidenceStatus === "approved") return <Badge variant="default" className="text-[10px]">Growth Recorded</Badge>;
    if (evidenceStatus === "submitted") return <Badge variant="outline" className="text-[10px]">Under Review</Badge>;
    if (evidenceStatus === "rejected") return <Badge variant="destructive" className="text-[10px]">Needs Revision</Badge>;
    return null;
  };

  return (
    <>
      <SchoolTrainingSubNav />
      <div className="space-y-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto">
        <SchoolBreadcrumb items={[{ label: "Training", to: "/app/school/training/overview" }, { label: "Mentors & Coaching" }]} />
        <TrainingHeader
          title="Mentors & Coaching"
          icon={Users}
          description="View mentors available for your team's professional development"
          rootTo="/app/school/training/overview"
        />

        {/* Team Mentorship Progress */}
        {hasStatus && (
          <TrainingSection title="Team Mentorship Progress" icon={Activity}>
            <div className="space-y-2">
              {mentorshipStatus.slice(0, 20).map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{s.teacherName}</span>
                          <Badge variant="outline" className="text-[10px]">{s.trainingItem}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(s.sessionDate).toLocaleDateString()}</span>
                          {s.sessionOutcome && (
                            <span className="capitalize">· {s.sessionOutcome.replace(/_/g, " ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={s.sessionStatus === "completed" ? "secondary" : "outline"} className="text-[10px] capitalize">
                          {s.sessionStatus}
                        </Badge>
                        {s.evidenceSubmitted && (
                          <Badge variant="outline" className="text-[10px]">Evidence ✓</Badge>
                        )}
                        {getImpactBadge(s.evidenceStatus)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TrainingSection>
        )}

        <TrainingSection title="Available Mentors">
          {hasMentors ? (
            <div className="grid gap-4 md:grid-cols-3">
              {mentors.map((m) => (
                <MentorCard
                  key={m.id}
                  name={m.full_name}
                  title={m.bio ?? undefined}
                  specializations={m.specialization_names}
                  sessionsCompleted={m.approved_review_count + m.session_review_count}
                  availability={m.average_rating > 0 ? `★ ${m.average_rating}` : "Available"}
                />
              ))}
            </div>
          ) : (
            <TrainingEmptyState icon={Users} message="No mentors available" hint="Mentors will appear here once registered in the system." />
          )}
        </TrainingSection>

        <TrainingSection title="Recent Team Feedback">
          {hasReviews ? (
            <div className="space-y-2">
              {teamReviews.slice(0, 10).map((f) => (
                <Card key={f.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{f.teacher_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {f.review_decision.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(f.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                    {f.review_notes && (
                      <p className="text-sm text-muted-foreground">{f.review_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <TrainingEmptyState icon={MessageSquare} message="No feedback recorded" hint="Feedback from mentoring sessions will appear here." />
          )}
        </TrainingSection>
      </div>
    </>
  );
};

export default SchoolMentors;
