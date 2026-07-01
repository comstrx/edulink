/**
 * ApplicationInterviewSection — Interview history for an application.
 *
 * Phase 4.3C — Shows chronological interview list inside application detail.
 */

import { format } from "date-fns";
import { CalendarDays, Video, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InterviewSummary } from "@/hooks/useInterviewsByJobMap";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-muted text-muted-foreground border-border",
};

interface ApplicationInterviewSectionProps {
  interviews: InterviewSummary[] | undefined;
}

export function ApplicationInterviewSection({ interviews }: ApplicationInterviewSectionProps) {
  if (!interviews || interviews.length === 0) return null;

  // Show sorted by scheduled_at DESC (most recent first)
  const sorted = [...interviews].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Interviews</span>
        <Badge variant="secondary" className="text-[9px] h-4 px-1">{interviews.length}</Badge>
      </div>

      <div className="space-y-1.5">
        {sorted.map((interview) => {
          const d = new Date(interview.scheduled_at);
          return (
            <div
              key={interview.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-1.5 bg-muted/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-foreground font-medium">
                  {format(d, "MMM d, yyyy")} — {format(d, "h:mm a")}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[9px] h-4 px-1 capitalize", STATUS_STYLES[interview.status])}
                >
                  {interview.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {interview.meeting_link && interview.status === "scheduled" && (
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                  >
                    <Video className="h-2.5 w-2.5" />
                    Join
                    <ExternalLink className="h-2 w-2" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sorted.some((i) => i.notes) && (
        <div className="text-[10px] text-muted-foreground pl-1">
          {sorted.find((i) => i.notes && i.status === "scheduled")?.notes ??
            sorted.find((i) => i.notes)?.notes}
        </div>
      )}
    </div>
  );
}
