/**
 * InterviewIndicator — Minimal badge showing next scheduled interview.
 *
 * Phase 4.3C — Used on PipelineCard and ApplicantCard.
 */

import { format } from "date-fns";
import { CalendarDays, XCircle } from "lucide-react";
import type { InterviewSummary } from "@/hooks/useInterviewsByJobMap";

interface InterviewIndicatorProps {
  interviews: InterviewSummary[] | undefined;
}

export function InterviewIndicator({ interviews }: InterviewIndicatorProps) {
  if (!interviews || interviews.length === 0) return null;

  // Find next scheduled interview (sorted by scheduled_at ascending)
  const nextScheduled = interviews.find((i) => i.status === "scheduled");

  if (nextScheduled) {
    const d = new Date(nextScheduled.scheduled_at);
    return (
      <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
        <CalendarDays className="h-3 w-3" />
        <span>Interview {format(d, "MMM d")} — {format(d, "h:mm a")}</span>
      </div>
    );
  }

  // All cancelled
  const allCancelled = interviews.every((i) => i.status === "cancelled");
  if (allCancelled) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <XCircle className="h-3 w-3" />
        <span>Interview cancelled</span>
      </div>
    );
  }

  // Has completed interviews
  const lastCompleted = [...interviews].reverse().find((i) => i.status === "completed");
  if (lastCompleted) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
        <CalendarDays className="h-3 w-3" />
        <span>Interview completed {format(new Date(lastCompleted.scheduled_at), "MMM d")}</span>
      </div>
    );
  }

  return null;
}
