/**
 * MentorshipEvidenceForm — Teacher submits evidence for a completed mentor session.
 * Hardened: file validation, stores path only, canonical reflection source.
 */
import { useState } from "react";
import { FileText, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSubmitMentorshipEvidence, useUploadMentorshipFile } from "@/hooks/useMentorshipEvidence";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { MentorshipEvidenceType } from "@/contracts/training/mentorship-evidence.contracts";

const EVIDENCE_TYPES: { value: MentorshipEvidenceType; label: string }[] = [
  { value: "lesson_plan", label: "Lesson Plan" },
  { value: "classroom_video", label: "Classroom Video" },
  { value: "teaching_artifact", label: "Teaching Artifact" },
  { value: "student_work", label: "Student Work" },
  { value: "reflection_document", label: "Reflection Document" },
];

interface Props {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MentorshipEvidenceForm({ sessionId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const submitMutation = useSubmitMentorshipEvidence();
  const uploadMutation = useUploadMentorshipFile();

  const [evidenceType, setEvidenceType] = useState<MentorshipEvidenceType>("reflection_document");
  const [reflectionText, setReflectionText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!user) return;

    try {
      let storagePath: string | undefined;

      if (file) {
        storagePath = await uploadMutation.mutateAsync({ file, userId: user.id });
      }

      await submitMutation.mutateAsync({
        sessionId,
        evidenceType,
        reflectionText: reflectionText || undefined,
        evidenceUrl: storagePath,
      });

      toast.success("Evidence submitted for mentor review");
      setReflectionText("");
      setFile(null);
      setEvidenceType("reflection_document");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit evidence");
    }
  };

  const isPending = submitMutation.isPending || uploadMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Submit Mentorship Evidence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Evidence Type</label>
            <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as MentorshipEvidenceType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Reflection</label>
            <Textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Describe what you learned, how you applied feedback, and key takeaways from the session..."
              className="mt-1 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is your canonical reflection for this session — visible to your mentor during review.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Attach File (optional)</label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="flex-1"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.jpg,.jpeg,.png"
              />
              {file && (
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Clear</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Max 50MB. Accepted: PDF, DOC, DOCX, PPT, PPTX, MP4, MOV, JPG, PNG.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (!reflectionText && !file)}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Submitting…</>
            ) : (
              <><Upload className="h-4 w-4 mr-1" />Submit Evidence</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
