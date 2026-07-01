/**
 * ScheduleInterviewDialog — Modal for scheduling or editing an interview.
 *
 * Phase 4.3B — Lightweight interview scheduling UI.
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateInterview, useUpdateInterview, type InterviewRow } from "@/hooks/useInterviews";
import { useUpdateApplicationStatus, type ApplicationStatus } from "@/hooks/useApplications";
import { isValidTransition } from "@/lib/pipeline-stages";

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required for creating a new interview */
  applicationId?: string;
  teacherId?: string;
  jobId?: string;
  teacherName?: string;
  /** Current application status — used for optional stage alignment */
  applicationStatus?: ApplicationStatus;
  /** If provided, dialog is in edit mode */
  existingInterview?: InterviewRow;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = ["00", "15", "30", "45"];

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
  teacherId,
  jobId,
  teacherName,
  applicationStatus,
  existingInterview,
}: ScheduleInterviewDialogProps) {
  const isEdit = !!existingInterview;

  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [moveToInterview, setMoveToInterview] = useState(false);

  const createMutation = useCreateInterview();
  const updateMutation = useUpdateInterview();
  const statusMutation = useUpdateApplicationStatus();

  const isPending = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;

  // Show stage alignment option only if current status can transition to "interview"
  const canAlignStage =
    !isEdit &&
    applicationStatus &&
    applicationStatus !== "interview" &&
    isValidTransition(applicationStatus, "interview");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (existingInterview) {
        const d = new Date(existingInterview.scheduled_at);
        setDate(d);
        setHour(String(d.getHours()));
        setMinute(String(d.getMinutes()).padStart(2, "0"));
        setMeetingLink(existingInterview.meeting_link ?? "");
        setNotes(existingInterview.notes ?? "");
      } else {
        setDate(undefined);
        setHour("10");
        setMinute("00");
        setMeetingLink("");
        setNotes("");
        setMoveToInterview(false);
      }
    }
  }, [open, existingInterview]);

  const handleSubmit = () => {
    if (!date) return;

    const scheduledAt = new Date(date);
    scheduledAt.setHours(parseInt(hour), parseInt(minute), 0, 0);
    const isoTime = scheduledAt.toISOString();

    if (isEdit) {
      updateMutation.mutate(
        {
          interviewId: existingInterview!.id,
          scheduledAt: isoTime,
          meetingLink: meetingLink || undefined,
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            console.info("[interviews] interview_updated", { interviewId: existingInterview!.id });
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to update interview");
          },
        },
      );
    } else {
      if (!applicationId || !teacherId || !jobId) return;
      createMutation.mutate(
        {
          applicationId,
          teacherId,
          jobId,
          scheduledAt: isoTime,
          meetingLink: meetingLink || undefined,
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            console.info("[interviews] interview_scheduled", { applicationId, teacherId, jobId });
            // Optionally move application to interview stage
            if (moveToInterview && canAlignStage) {
              statusMutation.mutate({
                applicationId: applicationId!,
                newStatus: "interview",
                teacherId,
                jobId,
              });
            }
            onOpenChange(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to schedule interview");
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Interview" : "Schedule Interview"}</DialogTitle>
          <DialogDescription>
            {teacherName
              ? `${isEdit ? "Update" : "Schedule"} interview with ${teacherName}`
              : `${isEdit ? "Update" : "Set"} interview details`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Hour</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Minute</Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting link */}
          <div className="space-y-2">
            <Label>Meeting Link</Label>
            <Input
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Interview focus areas, preparation instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Stage alignment */}
          {canAlignStage && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="move-to-interview"
                checked={moveToInterview}
                onCheckedChange={(checked) => setMoveToInterview(!!checked)}
              />
              <label
                htmlFor="move-to-interview"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Also move application to Interview stage
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !date}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
