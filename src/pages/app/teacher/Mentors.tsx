import { useState } from "react";
import { Users, UserCircle, MessageCircle, Calendar, Loader2, FileText, Clock } from "lucide-react";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import MentorCard from "@/components/training/MentorCard";
import MentorshipEvidenceForm from "@/components/mentorship/MentorshipEvidenceForm";
import MentorshipTimeline from "@/components/mentorship/MentorshipTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMentorList } from "@/hooks/useMentorDirectory";
import { useTeacherMentorReviews } from "@/hooks/useMentorReviews";
import { useTeacherMentorSessions } from "@/hooks/useMentorSessions";
import { useMentorAvailability } from "@/hooks/useMentorSessions";
import { useRequestMentorSession, useIsMentor } from "@/hooks/useMentorBooking";
import { useTeacherActiveExecutions } from "@/hooks/useTeacherExecutions";
import { useTeacherMentorshipEvidence } from "@/hooks/useMentorshipEvidence";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Mentors = () => {
  const { data: mentors, isLoading: mentorsLoading } = useMentorList();
  const { data: reviews, isLoading: reviewsLoading } = useTeacherMentorReviews();
  const { data: sessions, isLoading: sessionsLoading } = useTeacherMentorSessions();
  const { data: activeExecutions } = useTeacherActiveExecutions();
  const { data: mentorshipEvidence } = useTeacherMentorshipEvidence();
  const scheduleMutation = useRequestMentorSession();
  const { data: isMentor } = useIsMentor();

  const [bookingMentorId, setBookingMentorId] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [linkedExecutionId, setLinkedExecutionId] = useState<string>("");
  const [evidenceSessionId, setEvidenceSessionId] = useState<string | null>(null);

  const bookingMentor = mentors?.find((m) => m.id === bookingMentorId);
  const { data: availability } = useMentorAvailability(bookingMentorId ?? undefined);

  const isLoading = mentorsLoading || reviewsLoading || sessionsLoading;

  const handleSchedule = async () => {
    if (!bookingMentorId || !bookingDate) return;
    try {
      await scheduleMutation.mutateAsync({
        mentor_id: bookingMentorId,
        scheduled_at: new Date(bookingDate).toISOString(),
        notes: bookingNotes || undefined,
        session_type: "general",
        training_execution_id: linkedExecutionId || undefined,
      });
      toast.success("Session request sent!");
      setBookingMentorId(null);
      setBookingDate("");
      setBookingNotes("");
      setLinkedExecutionId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule session");
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const upcomingSessions = (sessions ?? []).filter(
    (s) => ["requested", "confirmed", "scheduled"].includes(s.status) && new Date(s.scheduled_at) >= new Date()
  );

  const completedSessions = (sessions ?? []).filter(
    (s) => s.status === "completed"
  );

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const hasMentors = mentors && mentors.length > 0;
  const hasReviews = reviews && reviews.length > 0;

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <TrainingHeader
            title="Mentors"
            icon={Users}
            description="Connect with expert mentors who guide your professional growth."
            rootTo="/app/teacher/training"
          />
          {isMentor && (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/mentor/sessions">Mentor Dashboard</Link>
            </Button>
          )}
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <TrainingSection title="Upcoming Sessions" icon={Calendar}>
            <div className="space-y-2">
              {upcomingSessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground capitalize">{s.session_type} Session</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.scheduled_at).toLocaleDateString()} at {new Date(s.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}{s.duration_minutes} min
                      </p>
                      {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
                    </div>
                    <Badge variant={s.status === "confirmed" ? "default" : s.status === "requested" ? "outline" : "secondary"} className="capitalize">
                      {s.status === "requested" ? "Pending" : s.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TrainingSection>
        )}

        {/* Completed Sessions — Evidence CTA */}
        {completedSessions.length > 0 && (
          <TrainingSection title="Completed Sessions" icon={FileText}>
            <div className="space-y-2">
              {completedSessions.slice(0, 10).map((s) => {
                const hasEvidence = (mentorshipEvidence ?? []).some((e) => e.session_id === s.id);
                return (
                  <Card key={s.id} className={hasEvidence ? "border-border" : "border-primary/20 bg-primary/5"}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {new Date(s.scheduled_at).toLocaleDateString()} · {s.duration_minutes} min
                          </p>
                          <Badge variant="secondary" className="text-[10px] capitalize">{s.session_type}</Badge>
                          {hasEvidence && (
                            <Badge variant="outline" className="text-[10px]">Evidence Submitted</Badge>
                          )}
                        </div>
                        {!hasEvidence && (
                          <p className="text-xs text-muted-foreground">
                            Submit evidence from this session to strengthen your growth record and CRI.
                          </p>
                        )}
                      </div>
                      {!hasEvidence ? (
                        <Button size="sm" variant="default" onClick={() => setEvidenceSessionId(s.id)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Submit Evidence
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {(mentorshipEvidence ?? []).find((e) => e.session_id === s.id)?.status?.replace(/_/g, " ") ?? "submitted"}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TrainingSection>
        )}

        {/* Growth Timeline */}
        {(completedSessions.length > 0 || (mentorshipEvidence ?? []).length > 0) && (
          <TrainingSection title="Growth Timeline" icon={Clock}>
            <MentorshipTimeline
              sessions={completedSessions}
              evidence={mentorshipEvidence ?? []}
            />
          </TrainingSection>
        )}

        {/* Available Mentors */}
        <TrainingSection title="Available Mentors" icon={UserCircle}>
          {hasMentors ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {mentors.map((m) => (
                <MentorCard
                  key={m.id}
                  name={m.full_name}
                  title={m.bio ?? undefined}
                  specializations={m.specialization_names}
                  sessionsCompleted={m.approved_review_count + m.session_review_count}
                  avatarType="initials"
                  actionLabel="Book Session"
                  onAction={() => setBookingMentorId(m.id)}
                />
              ))}
            </div>
          ) : (
            <TrainingEmptyState
              icon={Users}
              message="No mentors available yet"
              hint="Mentor support will appear here once available in your learning network."
            />
          )}
        </TrainingSection>

        {/* Recent Reviews */}
        <TrainingSection title="Recent Feedback" icon={MessageCircle}>
          {hasReviews ? (
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <Card key={r.id} className="border border-border">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {r.review_decision.replace(/_/g, " ")}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.review_notes && (
                      <p className="text-sm text-muted-foreground">{r.review_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <TrainingEmptyState
              icon={MessageCircle}
              message="No feedback yet"
              hint="Submit evidence for your training to receive mentor feedback."
            />
          )}
        </TrainingSection>
      </div>

      {/* Booking Dialog */}
      <Dialog open={!!bookingMentorId} onOpenChange={(open) => !open && setBookingMentorId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Session with {bookingMentor?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availability && availability.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Availability</p>
                <div className="flex flex-wrap gap-1.5">
                  {availability.map((slot) => (
                    <Badge key={slot.id} variant="outline" className="text-xs">
                      {dayNames[slot.day_of_week]} {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Date & Time</label>
              <Input
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="mt-1"
              />
            </div>
            {activeExecutions && activeExecutions.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground">Link to Training (optional)</label>
                <Select value={linkedExecutionId} onValueChange={setLinkedExecutionId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No training linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No training linked</SelectItem>
                    {activeExecutions.map((exec) => (
                      <SelectItem key={exec.id} value={exec.id}>
                        {exec.item_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Linking connects this session to your training progress and CRI score.
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Notes (optional)</label>
              <Textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="What would you like to discuss?"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingMentorId(null)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!bookingDate || scheduleMutation.isPending}>
              {scheduleMutation.isPending ? "Scheduling…" : "Schedule Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Submission Dialog */}
      {evidenceSessionId && (
        <MentorshipEvidenceForm
          sessionId={evidenceSessionId}
          open={!!evidenceSessionId}
          onOpenChange={(open) => !open && setEvidenceSessionId(null)}
        />
      )}
    </div>
  );
};

export default Mentors;
