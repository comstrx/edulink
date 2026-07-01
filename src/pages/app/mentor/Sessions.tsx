/**
 * Mentor Session Dashboard — Hardened
 * Shows pending requests, upcoming confirmed, past sessions, and evidence review.
 * Uses atomic session completion via RPC + evidence URL resolution at read time.
 */
import { useState, useEffect } from "react";
import { useMentorDashboardSessions, useMentorSessionActions, type BookingSession } from "@/hooks/useMentorBooking";
import { useMentorEvidenceQueue, useReviewMentorshipEvidence, resolveEvidenceUrl } from "@/hooks/useMentorshipEvidence";
import SessionOutcomeForm from "@/components/mentorship/SessionOutcomeForm";
import MentorEvidenceQueue from "@/components/mentorship/MentorEvidenceQueue";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Loader2, CheckCircle, XCircle, AlertTriangle, Inbox, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { SessionOutcome } from "@/contracts/training/mentorship-evidence.contracts";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  requested: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  declined: { label: "Declined", variant: "destructive" },
  no_show: { label: "No Show", variant: "destructive" },
  scheduled: { label: "Scheduled", variant: "default" },
};

const MentorSessions = () => {
  const { data: sessions, isLoading } = useMentorDashboardSessions();
  const { confirmSession, declineSession, completeSessionWithOutcome, cancelSession, markNoShow } = useMentorSessionActions();
  const { data: evidenceQueue, isLoading: evidenceLoading } = useMentorEvidenceQueue();
  const reviewMutation = useReviewMentorshipEvidence();

  const [completingSessionId, setCompletingSessionId] = useState<string | null>(null);
  const [reviewingEvidenceId, setReviewingEvidenceId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  const now = new Date();

  const pending = (sessions ?? []).filter((s) => s.status === "requested");
  const upcoming = (sessions ?? []).filter(
    (s) => ["confirmed", "scheduled"].includes(s.status) && new Date(s.scheduled_at) >= now
  );
  const past = (sessions ?? []).filter(
    (s) =>
      ["completed", "cancelled", "declined", "no_show"].includes(s.status) ||
      (["confirmed", "scheduled"].includes(s.status) && new Date(s.scheduled_at) < now)
  );

  const pendingEvidenceCount = (evidenceQueue ?? []).filter((e) => e.status === "submitted").length;
  const reviewingItem = (evidenceQueue ?? []).find((e) => e.id === reviewingEvidenceId);

  // Resolve evidence URL when reviewing
  useEffect(() => {
    if (reviewingItem?.evidence_url) {
      resolveEvidenceUrl(reviewingItem.evidence_url).then(setResolvedUrl);
    } else {
      setResolvedUrl(null);
    }
  }, [reviewingItem?.evidence_url]);

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      await action();
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleCompleteWithOutcome = async (outcome: {
    session_outcome: SessionOutcome;
    mentor_summary: string;
    recommended_next_step?: string;
    competency_term_ids?: string[];
  }) => {
    if (!completingSessionId) return;
    try {
      await completeSessionWithOutcome.mutateAsync({
        sessionId: completingSessionId,
        sessionOutcome: outcome.session_outcome,
        mentorSummary: outcome.mentor_summary,
        recommendedNextStep: outcome.recommended_next_step,
        competencyTermIds: outcome.competency_term_ids,
      });
      toast.success("Session completed with outcome recorded");
      setCompletingSessionId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to complete session");
    }
  };

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!reviewingEvidenceId) return;
    try {
      await reviewMutation.mutateAsync({
        evidenceId: reviewingEvidenceId,
        decision,
        reviewNotes: reviewNotes || undefined,
      });
      toast.success(decision === "approved" ? "Evidence approved — growth signal recorded" : "Evidence rejected");
      setReviewingEvidenceId(null);
      setReviewNotes("");
    } catch (err: any) {
      toast.error(err.message || "Review failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mentoring Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage session requests, review evidence, and validate teacher growth.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Requests {pending.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Evidence {pendingEvidenceCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{pendingEvidenceCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <EmptyState icon={Inbox} message="No pending requests" hint="New session requests from teachers will appear here." />
          ) : (
            pending.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                actions={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAction(() => confirmSession.mutateAsync(session.id), "Session confirmed")}
                      disabled={confirmSession.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(() => declineSession.mutateAsync({ sessionId: session.id }), "Session declined")}
                      disabled={declineSession.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                    </Button>
                  </div>
                }
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState icon={Calendar} message="No upcoming sessions" hint="Confirmed sessions will appear here." />
          ) : (
            upcoming.map((session) => {
              const isPast = new Date(session.scheduled_at) < now;
              return (
                <SessionCard
                  key={session.id}
                  session={session}
                  actions={
                    <div className="flex gap-2">
                      {isPast ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setCompletingSessionId(session.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(() => markNoShow.mutateAsync(session.id), "Marked as no-show")}
                            disabled={markNoShow.isPending}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> No Show
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(() => cancelSession.mutateAsync(session.id), "Session cancelled")}
                          disabled={cancelSession.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  }
                />
              );
            })
          )}
        </TabsContent>

        {/* Evidence Review Tab — uses dedicated queue component */}
        <TabsContent value="evidence" className="mt-4">
          <MentorEvidenceQueue
            evidence={evidenceQueue ?? []}
            isLoading={evidenceLoading}
            onReview={(id) => setReviewingEvidenceId(id)}
          />
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? (
            <EmptyState icon={CheckCircle} message="No past sessions" hint="Completed and cancelled sessions will appear here." />
          ) : (
            past.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Session Outcome Dialog — Atomic completion */}
      <SessionOutcomeForm
        open={!!completingSessionId}
        onOpenChange={(open) => !open && setCompletingSessionId(null)}
        onSubmit={handleCompleteWithOutcome}
        isPending={completeSessionWithOutcome.isPending}
      />

      {/* Evidence Review Dialog */}
      <Dialog open={!!reviewingEvidenceId} onOpenChange={(open) => { if (!open) { setReviewingEvidenceId(null); setReviewNotes(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Mentorship Evidence</DialogTitle>
          </DialogHeader>
          {reviewingItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Teacher</p>
                <p className="text-sm text-muted-foreground">{reviewingItem.teacher_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Evidence Type</p>
                <p className="text-sm text-muted-foreground capitalize">{reviewingItem.evidence_type.replace(/_/g, " ")}</p>
              </div>
              {reviewingItem.reflection_text && (
                <div>
                  <p className="text-sm font-medium text-foreground">Teacher Reflection</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewingItem.reflection_text}</p>
                </div>
              )}
              {resolvedUrl && (
                <div>
                  <p className="text-sm font-medium text-foreground">Attached File</p>
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                    View Attachment
                  </a>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide feedback on this evidence..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleReview("rejected")}
              disabled={reviewMutation.isPending || !reviewNotes}
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              onClick={() => handleReview("approved")}
              disabled={reviewMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Sub-components ──

function SessionCard({ session, actions }: { session: BookingSession & { teacher_name?: string }; actions?: React.ReactNode }) {
  const scheduledAt = new Date(session.scheduled_at);
  const config = STATUS_CONFIG[session.status] ?? { label: session.status, variant: "outline" as const };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{session.teacher_name ?? "Teacher"}</span>
              <Badge variant={config.variant} className="text-[10px] capitalize">{config.label}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {scheduledAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>{session.duration_minutes} min</span>
              <Badge variant="outline" className="text-[10px] capitalize">{session.session_type}</Badge>
            </div>
            {session.notes && (
              <p className="text-xs text-muted-foreground mt-1">{session.notes}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message, hint }: { icon: any; message: string; hint: string }) {
  return (
    <div className="text-center py-12 space-y-2">
      <Icon className="h-8 w-8 mx-auto text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default MentorSessions;
