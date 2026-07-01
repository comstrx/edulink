/**
 * MentorshipTimeline — Shows teacher's mentorship growth activity.
 * Hardened: uses reviewed_by_mentor_id, no under_review status references.
 */
import { CheckCircle, FileText, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MentorshipEvidence } from "@/hooks/useMentorshipEvidence";
import type { MentorSession } from "@/hooks/useMentorSessions";

interface TimelineEntry {
  id: string;
  type: "session_completed" | "evidence_submitted" | "evidence_approved" | "evidence_rejected";
  date: string;
  label: string;
  detail?: string;
}

interface Props {
  sessions: MentorSession[];
  evidence: MentorshipEvidence[];
}

export default function MentorshipTimeline({ sessions, evidence }: Props) {
  const entries: TimelineEntry[] = [];

  sessions
    .filter((s) => s.status === "completed")
    .forEach((s) => {
      entries.push({
        id: `session-${s.id}`,
        type: "session_completed",
        date: s.scheduled_at,
        label: "Mentor session completed",
        detail: `${s.duration_minutes} min · ${s.session_type}`,
      });
    });

  evidence.forEach((e) => {
    entries.push({
      id: `evidence-submit-${e.id}`,
      type: "evidence_submitted",
      date: e.submitted_at,
      label: "Mentorship evidence submitted",
      detail: e.evidence_type.replace(/_/g, " "),
    });

    if (e.status === "approved" && e.reviewed_at) {
      entries.push({
        id: `evidence-approved-${e.id}`,
        type: "evidence_approved",
        date: e.reviewed_at,
        label: "Evidence approved by mentor",
        detail: e.review_notes ?? "Professional growth recorded",
      });
    }

    if (e.status === "rejected" && e.reviewed_at) {
      entries.push({
        id: `evidence-rejected-${e.id}`,
        type: "evidence_rejected",
        date: e.reviewed_at,
        label: "Evidence needs revision",
        detail: e.review_notes ?? undefined,
      });
    }
  });

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No mentorship activity yet</p>
      </div>
    );
  }

  const iconMap = {
    session_completed: <CheckCircle className="h-4 w-4 text-primary" />,
    evidence_submitted: <FileText className="h-4 w-4 text-blue-500" />,
    evidence_approved: <CheckCircle className="h-4 w-4 text-green-600" />,
    evidence_rejected: <XCircle className="h-4 w-4 text-destructive" />,
  };

  const badgeMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    session_completed: "secondary",
    evidence_submitted: "outline",
    evidence_approved: "default",
    evidence_rejected: "destructive",
  };

  return (
    <div className="space-y-3">
      {entries.slice(0, 10).map((entry) => (
        <div key={entry.id} className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{iconMap[entry.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground">{entry.label}</p>
              <Badge variant={badgeMap[entry.type]} className="text-[10px]">
                {new Date(entry.date).toLocaleDateString()}
              </Badge>
            </div>
            {entry.detail && (
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{entry.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
