import { useState, useRef } from "react";
import {
  FileCheck, Upload, Eye, AlertTriangle, Clock, CheckCircle2, FileText,
  Loader2, AlertCircle, Plus,
} from "lucide-react";
import TrainingSubNav from "@/components/training/TrainingSubNav";
import TrainingHeader from "@/components/training/TrainingHeader";
import TrainingSection from "@/components/training/TrainingSection";
import TrainingEmptyState from "@/components/training/TrainingEmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherEvidence, useSubmitEvidence, useUploadEvidenceFile } from "@/hooks/useTrainingEvidence";
import { useTeacherExecutions } from "@/hooks/useTrainingExecutions";
import type { EvidenceType } from "@/contracts/training/evidence.contracts";

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs revision",
};

const evidenceTypeOptions: { value: EvidenceType; label: string }[] = [
  { value: "lesson_plan", label: "Lesson Plan" },
  { value: "classroom_video", label: "Classroom Video" },
  { value: "teaching_artifact", label: "Teaching Artifact" },
  { value: "reflection", label: "Reflection" },
  { value: "assessment_submission", label: "Assessment Submission" },
  { value: "other", label: "Other" },
];

const Evidence = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: allEvidence, isLoading, error } = useTeacherEvidence();
  const { data: executions } = useTeacherExecutions();
  const submitEvidence = useSubmitEvidence();
  const uploadFile = useUploadEvidenceFile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("other");
  const [executionId, setExecutionId] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSubmitting = submitEvidence.isPending || uploadFile.isPending;

  // Filter to active/completed executions for the dropdown
  const activeExecutions = (executions ?? []).filter(
    (e) => e.execution_status === "active" || e.execution_status === "completed"
  );

  const resetForm = () => {
    setTitle("");
    setEvidenceType("other");
    setExecutionId("");
    setTextContent("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !executionId) return;

    try {
      let fileUrl: string | undefined;

      if (file) {
        fileUrl = await uploadFile.mutateAsync({ file, userId: user.id });
      }

      await submitEvidence.mutateAsync({
        executionId,
        evidenceType,
        title: title.trim(),
        fileUrl,
        textContent: textContent.trim() || undefined,
      });

      toast({ title: "Evidence submitted", description: "Your evidence has been submitted for review." });
      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const evidence = allEvidence ?? [];
  const submitted = evidence.filter((e) => e.review_status === "submitted");
  const underReview = evidence.filter((e) => e.review_status === "under_review");
  const uploaded = [...submitted, ...underReview];
  const reviewed = evidence.filter((e) => e.review_status === "approved");
  const needsAttention = evidence.filter((e) => e.review_status === "rejected" || e.review_status === "needs_revision");

  if (isLoading) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto flex items-center justify-center gap-2 text-muted-foreground py-20">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading evidence…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <TrainingSubNav />
        <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-destructive py-10">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load evidence. Please try again later.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TrainingSubNav />
      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <TrainingHeader
            title="Evidence"
            icon={FileCheck}
            description="Upload, track, and manage evidence of your professional development."
            rootTo="/app/teacher/training"
          />

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Submit Evidence
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Evidence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="ev-execution">Training Activity</Label>
                  <Select value={executionId} onValueChange={setExecutionId}>
                    <SelectTrigger id="ev-execution">
                      <SelectValue placeholder="Select a training activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeExecutions.length > 0 ? (
                        activeExecutions.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.item_title}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>No active training</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ev-title">Title</Label>
                  <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lesson Plan — Week 5" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ev-type">Evidence Type</Label>
                  <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
                    <SelectTrigger id="ev-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {evidenceTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ev-file">File (optional)</Label>
                  <Input id="ev-file" type="file" ref={fileRef} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ev-text">Notes (optional)</Label>
                  <Textarea id="ev-text" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Add context or reflection…" rows={3} />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim() || !executionId}
                >
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…</> : "Submit Evidence"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="uploaded" className="w-full">
          <TabsList className="w-full max-w-xl flex overflow-x-auto scrollbar-hide">
            <TabsTrigger value="uploaded">Uploaded ({uploaded.length})</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
            <TabsTrigger value="attention">Needs Attention ({needsAttention.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="uploaded" className="mt-6">
            <TrainingSection title="Uploaded Evidence" icon={Upload} count={uploaded.length}>
              {uploaded.length > 0 ? (
                <div className="space-y-3">
                  {uploaded.map((e) => (
                    <Card key={e.id} className="border border-border">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{e.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{e.evidence_type}</Badge>
                          </div>
                        </div>
                        <div className="sm:text-right space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Submitted {new Date(e.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <Badge variant="secondary" className="text-xs">{statusLabel[e.review_status] ?? e.review_status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <TrainingEmptyState icon={Upload} message="No evidence uploaded yet" hint="Submit evidence from your training activities to build your professional portfolio." />
              )}
            </TrainingSection>
          </TabsContent>

          <TabsContent value="reviewed" className="mt-6">
            <TrainingSection title="Reviewed Evidence" icon={Eye} count={reviewed.length}>
              {reviewed.length > 0 ? (
                <div className="space-y-3">
                  {reviewed.map((e) => (
                    <Card key={e.id} className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{e.title}</p>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="text-xs text-primary font-medium">Approved</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Reviewed {e.reviewed_at ? new Date(e.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </p>
                        {e.feedback && (
                          <p className="text-sm text-muted-foreground italic">"{e.feedback}"</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <TrainingEmptyState icon={Eye} message="No reviewed evidence yet" hint="Evidence you submit will appear here once reviewed." />
              )}
            </TrainingSection>
          </TabsContent>

          <TabsContent value="attention" className="mt-6">
            <TrainingSection title="Needs Attention" icon={AlertTriangle} count={needsAttention.length}>
              {needsAttention.length > 0 ? (
                <div className="space-y-3">
                  {needsAttention.map((e) => (
                    <Card key={e.id} className="border border-destructive/30 bg-destructive/5">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground">{e.title}</p>
                          <Badge variant="destructive" className="text-xs">
                            {e.review_status === "rejected" ? "Rejected" : "Revision requested"}
                          </Badge>
                        </div>
                        {e.feedback && (
                          <p className="text-sm text-muted-foreground italic">"{e.feedback}"</p>
                        )}
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs font-medium">Revise & Re-upload →</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <TrainingEmptyState icon={FileText} message="All clear!" hint="No evidence items need your attention right now." />
              )}
            </TrainingSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Evidence;
