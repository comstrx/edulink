import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EvidenceType, EvidenceReviewStatus } from "@/contracts/training/evidence.contracts";

// ── Types ──

export interface TrainingEvidence {
  id: string;
  teacher_id: string;
  execution_id: string;
  item_id: string;
  item_type: string;
  milestone_id: string | null;
  evidence_type: EvidenceType;
  title: string;
  file_url: string | null;
  text_content: string | null;
  review_status: EvidenceReviewStatus;
  reviewer_id: string | null;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Constants ──

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "ppt", "pptx",
  "mp4", "mov",
  "jpg", "jpeg", "png",
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Hook: Fetch evidence for an execution ──

export function useExecutionEvidence(executionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["training_evidence", user?.id, executionId],
    queryFn: async (): Promise<TrainingEvidence[]> => {
      if (!user || !executionId) return [];

      const { data, error } = await supabase.functions.invoke("training-evidence", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const all: TrainingEvidence[] = data?.data ?? [];
      return executionId ? all.filter((e) => e.execution_id === executionId) : all;
    },
    enabled: !!user && !!executionId,
  });
}

// ── Hook: Fetch all teacher evidence ──

export function useTeacherEvidence() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["training_evidence", user?.id],
    queryFn: async (): Promise<TrainingEvidence[]> => {
      if (!user) return [];

      const { data, error } = await supabase.functions.invoke("training-evidence", {
        method: "GET",
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data ?? [];
    },
    enabled: !!user,
  });
}

// ── Hook: Submit evidence ──

export function useSubmitEvidence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      executionId: string;
      evidenceType: EvidenceType;
      title: string;
      fileUrl?: string;
      textContent?: string;
      milestoneId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("training-evidence", {
        method: "POST",
        body: {
          execution_id: params.executionId,
          evidence_type: params.evidenceType,
          title: params.title,
          file_url: params.fileUrl,
          text_content: params.textContent,
          milestone_id: params.milestoneId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_evidence"] });
    },
  });
}

// ── Hook: Delete evidence ──

export function useDeleteEvidence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (evidenceId: string) => {
      const { data, error } = await supabase.functions.invoke("training-evidence", {
        method: "DELETE",
        body: { id: evidenceId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training_evidence"] });
    },
  });
}

// ── Hook: Upload evidence file to storage (hardened) ──

export function useUploadEvidenceFile() {
  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }): Promise<string> => {
      // Validate file extension
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`File type ".${ext}" is not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(", ")}`);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`);
      }

      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("training-evidence")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      // Return storage path only — signed URLs generated at read time
      return data.path;
    },
  });
}
