/**
 * useMentorshipEvidence — CRUD hooks for mentor_session_evidence.
 * Covers teacher submission, mentor review, and evidence fetching.
 *
 * Hardened:
 *  - reviewed_by → reviewed_by_mentor_id
 *  - under_review removed from lifecycle
 *  - File upload validates type/size, stores path only
 *  - Signed URLs generated at read time with short TTL
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EVENT_NAMES } from "@/contracts/core/event-names";
import { dispatchDomainEvent } from "@/smart-glue/bridge";
import { logDispatchFailure } from "@/smart-glue/dispatch-failure-logger";
import type { MentorshipEvidenceType, MentorshipEvidenceStatus } from "@/contracts/training/mentorship-evidence.contracts";

// ── Constants ──

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "ppt", "pptx",
  "mp4", "mov",
  "jpg", "jpeg", "png",
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// ── Types ──

export interface MentorshipEvidence {
  id: string;
  session_id: string;
  teacher_id: string;
  submitted_at: string;
  reflection_text: string | null;
  evidence_url: string | null;
  evidence_type: MentorshipEvidenceType;
  status: MentorshipEvidenceStatus;
  reviewed_by_mentor_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ──

/** Resolve a storage path to a short-lived signed URL */
async function resolveEvidenceUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  // If already a full URL (legacy), return as-is
  if (url.startsWith("http")) return url;
  // Strip bucket prefix if present
  const path = url.startsWith("training-evidence/")
    ? url.replace("training-evidence/", "")
    : url;
  const { data } = await supabase.storage
    .from("training-evidence")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

// ── Teacher: Fetch evidence for a session ──

export function useSessionEvidence(sessionId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentorship_evidence", "session", sessionId],
    queryFn: async (): Promise<MentorshipEvidence[]> => {
      if (!user || !sessionId) return [];

      const { data, error } = await supabase
        .from("mentor_session_evidence")
        .select("*")
        .eq("session_id", sessionId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as MentorshipEvidence[];
    },
    enabled: !!user && !!sessionId,
  });
}

// ── Teacher: Fetch all own evidence ──

export function useTeacherMentorshipEvidence() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentorship_evidence", "teacher", user?.id],
    queryFn: async (): Promise<MentorshipEvidence[]> => {
      if (!user) return [];

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) return [];

      const { data, error } = await supabase
        .from("mentor_session_evidence")
        .select("*")
        .eq("teacher_id", tp.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as MentorshipEvidence[];
    },
    enabled: !!user,
  });
}

// ── Mentor: Fetch evidence review queue ──

export function useMentorEvidenceQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mentorship_evidence", "mentor_queue", user?.id],
    queryFn: async (): Promise<(MentorshipEvidence & { teacher_name?: string; session_date?: string })[]> => {
      if (!user) return [];

      const { data: mentor } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mentor) return [];

      const { data: sessions } = await supabase
        .from("mentor_sessions")
        .select("id, teacher_id, scheduled_at, status")
        .eq("mentor_id", mentor.id)
        .eq("status", "completed");

      if (!sessions?.length) return [];

      const sessionIds = sessions.map((s: any) => s.id);
      const sessionMap: Record<string, any> = {};
      sessions.forEach((s: any) => { sessionMap[s.id] = s; });

      const { data: evidence, error } = await supabase
        .from("mentor_session_evidence")
        .select("*")
        .in("session_id", sessionIds)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      if (!evidence?.length) return [];

      const teacherIds = [...new Set(evidence.map((e: any) => e.teacher_id))];
      const { data: teachers } = await supabase
        .from("teacher_profiles")
        .select("id, full_name")
        .in("id", teacherIds);

      const nameMap: Record<string, string> = {};
      (teachers ?? []).forEach((t: any) => { nameMap[t.id] = t.full_name; });

      return evidence.map((e: any) => ({
        ...e,
        teacher_name: nameMap[e.teacher_id] ?? "Teacher",
        session_date: sessionMap[e.session_id]?.scheduled_at,
      }));
    },
    enabled: !!user,
  });
}

// ── Teacher: Submit evidence ──

export function useSubmitMentorshipEvidence() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      evidenceType: MentorshipEvidenceType;
      reflectionText?: string;
      evidenceUrl?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tp) throw new Error("No teacher profile");

      const { data: session } = await supabase
        .from("mentor_sessions")
        .select("mentor_id")
        .eq("id", params.sessionId)
        .maybeSingle();

      const { data, error } = await supabase
        .from("mentor_session_evidence")
        .insert({
          session_id: params.sessionId,
          teacher_id: tp.id,
          evidence_type: params.evidenceType,
          reflection_text: params.reflectionText ?? null,
          evidence_url: params.evidenceUrl ?? null,
          status: "submitted",
        })
        .select()
        .single();

      if (error) throw error;

      // Sprint 9.5-A: Single canonical path via Smart Glue
      dispatchDomainEvent("training", EVENT_NAMES.mentorship.evidenceSubmitted, {
        evidenceId: data.id,
        sessionId: params.sessionId,
        teacherId: tp.id,
        mentorId: session?.mentor_id ?? "",
      }).catch((e) => logDispatchFailure(EVENT_NAMES.mentorship.evidenceSubmitted, e));

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentorship_evidence"] });
      qc.invalidateQueries({ queryKey: ["mentor_sessions"] });
    },
  });
}

// ── Mentor: Review evidence (controlled action — only review fields) ──

export function useReviewMentorshipEvidence() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      evidenceId: string;
      decision: "approved" | "rejected";
      reviewNotes?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Use RPC for controlled review action
      const { data, error } = await supabase.rpc("review_mentorship_evidence", {
        p_evidence_id: params.evidenceId,
        p_mentor_user_id: user.id,
        p_decision: params.decision,
        p_review_notes: params.reviewNotes ?? null,
      });

      if (error) throw error;

      interface ReviewResult {
        evidenceId: string;
        sessionId: string;
        teacherId: string;
        mentorId: string;
        competencyTermIds: string[];
      }
      const result = data as unknown as ReviewResult;

      // Sprint 9.5-A: Single canonical path via Smart Glue
      if (params.decision === "approved") {
        dispatchDomainEvent("training", EVENT_NAMES.mentorship.evidenceApproved, {
          evidenceId: result.evidenceId,
          sessionId: result.sessionId,
          teacherId: result.teacherId,
          mentorId: result.mentorId,
          competencyTermIds: result.competencyTermIds ?? [],
        }).catch((e) => logDispatchFailure(EVENT_NAMES.mentorship.evidenceApproved, e));
      } else {
        dispatchDomainEvent("training", EVENT_NAMES.mentorship.evidenceRejected, {
          evidenceId: result.evidenceId,
          sessionId: result.sessionId,
          teacherId: result.teacherId,
          mentorId: result.mentorId,
          reviewNotes: params.reviewNotes ?? "",
        }).catch((e) => logDispatchFailure(EVENT_NAMES.mentorship.evidenceRejected, e));
      }

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentorship_evidence"] });
      // Cross-domain: refresh reputation and growth after mentorship evidence review
      qc.invalidateQueries({ queryKey: ["prof_rep_mentoring"] });
      qc.invalidateQueries({ queryKey: ["prof_rep_training"] });
      qc.invalidateQueries({ queryKey: ["career_growth_training"] });
      qc.invalidateQueries({ queryKey: ["career_growth_credentials"] });
    },
  });
}

// ── Teacher: Upload evidence file (hardened) ──

export function useUploadMentorshipFile() {
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

      const storagePath = `mentorship/${userId}/${crypto.randomUUID()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("training-evidence")
        .upload(storagePath, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      // Return storage path only — signed URLs generated at read time
      return data.path;
    },
  });
}

/** Resolve evidence URL for display (generates short-lived signed URL) */
export { resolveEvidenceUrl };
