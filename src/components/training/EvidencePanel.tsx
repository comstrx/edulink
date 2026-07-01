import { useState } from "react";
import { FileUp, FileText, Trash2, CheckCircle2, Clock, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExecutionEvidence, useSubmitEvidence, useDeleteEvidence, useUploadEvidenceFile } from "@/hooks/useTrainingEvidence";
import type { EvidenceType, EvidenceReviewStatus } from "@/contracts/training/evidence.contracts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  lesson_plan: "Lesson Plan",
  classroom_video: "Classroom Video",
  teaching_artifact: "Teaching Artifact",
  reflection: "Reflection",
  assessment_submission: "Assessment",
  other: "Other",
};

const REVIEW_STATUS_CONFIG: Record<EvidenceReviewStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
  submitted: { label: "Submitted", variant: "outline", icon: Clock },
  under_review: { label: "Under Review", variant: "default", icon: Clock },
  approved: { label: "Approved", variant: "secondary", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: AlertCircle },
  needs_revision: { label: "Needs Revision", variant: "outline", icon: AlertCircle },
};

interface EvidencePanelProps {
  executionId: string;
  milestoneId?: string;
  compact?: boolean;
}

export default function EvidencePanel({ executionId, milestoneId, compact = false }: EvidencePanelProps) {
  const { user } = useAuth();
  const { data: evidence = [], isLoading } = useExecutionEvidence(executionId);
  const submitEvidence = useSubmitEvidence();
  const deleteEvidence = useDeleteEvidence();
  const uploadFile = useUploadEvidenceFile();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("lesson_plan");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const filteredEvidence = milestoneId
    ? evidence.filter((e) => e.milestone_id === milestoneId)
    : evidence;

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please add a title");
      return;
    }

    try {
      let fileUrl: string | undefined;
      if (file && user) {
        fileUrl = await uploadFile.mutateAsync({ file, userId: user.id });
      }

      await submitEvidence.mutateAsync({
        executionId,
        evidenceType,
        title: title.trim(),
        fileUrl,
        textContent: textContent.trim() || undefined,
        milestoneId,
      });

      toast.success("Evidence submitted");
      setShowForm(false);
      setTitle("");
      setTextContent("");
      setFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evidence");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvidence.mutateAsync(id);
      toast.success("Evidence removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      {/* Existing evidence list */}
      {filteredEvidence.length > 0 && (
        <div className="space-y-1.5">
          {filteredEvidence.map((ev) => {
            const cfg = REVIEW_STATUS_CONFIG[ev.review_status];
            const StatusIcon = cfg.icon;
            return (
              <div key={ev.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-md bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate text-foreground">{ev.title}</span>
                  <Badge variant={cfg.variant} className="text-[10px] gap-0.5 shrink-0">
                    <StatusIcon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </Badge>
                </div>
                {ev.review_status === "submitted" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDelete(ev.id)}
                    disabled={deleteEvidence.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit form */}
      {showForm ? (
        <Card className="border border-border">
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Evidence title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))
                }
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Description or reflection (optional)"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-8 text-sm"
              accept=".pdf,.doc,.docx,.mp4,.mov,.jpg,.jpeg,.png,.webp"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitEvidence.isPending || uploadFile.isPending}
              >
                <Send className="h-3 w-3 mr-1" />
                {submitEvidence.isPending || uploadFile.isPending ? "Submitting…" : "Submit"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => setShowForm(true)}
          className="text-xs"
        >
          <FileUp className="h-3 w-3 mr-1" />
          Submit Evidence
        </Button>
      )}
    </div>
  );
}
