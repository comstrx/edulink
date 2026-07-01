import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  issueEarnedCredential,
  type CredentialKind,
  type CredentialSourceType,
  type EarnedCredential,
} from "./earned-credentials-service";

// ── Types ──

export interface TrainingCompletion {
  id: string;
  teacher_id: string;
  source_type: CredentialSourceType;
  source_id: string;
  completed_at: string;
  completion_evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TrainingItemEligibility {
  id: string;
  title: string;
  type: string;
  credential_eligible: boolean;
  credential_type_term_id: string | null;
}

export interface IssuanceEvaluationResult {
  eligible: boolean;
  reason: string;
  credentialKind?: CredentialKind;
  title?: string;
}

// ── Credential Kind Resolution ──

function resolveCredentialKind(itemType: string): CredentialKind {
  switch (itemType) {
    case "pathway":
    case "package":
      return "certificate";
    case "course":
    default:
      return "badge";
  }
}

// ── Completion Recording ──

export async function recordTrainingCompletion(
  teacherId: string,
  sourceType: CredentialSourceType,
  sourceId: string,
  evidence?: Record<string, unknown>,
): Promise<TrainingCompletion> {
  const { data, error } = await supabase
    .from("training_completions")
    .insert([{
      teacher_id: teacherId,
      source_type: sourceType,
      source_id: sourceId,
      completion_evidence: (evidence ?? {}) as Json,
    }])
    .select()
    .returns<TrainingCompletion[]>()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Already completed — return existing record
      const { data: existing } = await supabase
        .from("training_completions")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .returns<TrainingCompletion[]>()
        .single();
      if (existing) return existing;
    }
    throw new Error(`Failed to record completion: ${error.message}`);
  }

  return data;
}

// ── Completion Check ──

export async function hasCompletion(
  teacherId: string,
  sourceType: CredentialSourceType,
  sourceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("training_completions")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .returns<{ id: string }[]>()
    .maybeSingle();

  return !!data;
}

// ── Eligibility Evaluation ──

export async function evaluateCredentialIssuance(
  teacherId: string,
  sourceType: CredentialSourceType,
  sourceId: string,
): Promise<IssuanceEvaluationResult> {
  // Step 1: Only training_item is supported for MVP
  if (sourceType !== "training_item") {
    return {
      eligible: false,
      reason: `Issuance from ${sourceType} is not yet supported. Only training_item completion triggers credentials in this phase.`,
    };
  }

  // Step 2: Check item eligibility metadata
  const { data: item, error: itemError } = await supabase
    .from("training_items")
    .select("id, title, type, credential_eligible, credential_type_term_id")
    .eq("id", sourceId)
    .maybeSingle();

  if (itemError || !item) {
    return { eligible: false, reason: "Training item not found." };
  }

  const typedItem = item as unknown as TrainingItemEligibility;

  if (!typedItem.credential_eligible) {
    return {
      eligible: false,
      reason: `Training item "${typedItem.title}" is not credential-eligible.`,
    };
  }

  // Step 3: Check completion exists
  const completed = await hasCompletion(teacherId, sourceType, sourceId);
  if (!completed) {
    return {
      eligible: false,
      reason: `No completion record found for teacher on "${typedItem.title}".`,
    };
  }

  // Step 4: Check no duplicate credential
  const credentialKind = resolveCredentialKind(typedItem.type);
  const { data: existing } = await supabase
    .from("earned_credentials")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .eq("credential_kind", credentialKind)
    .maybeSingle();

  if (existing) {
    return {
      eligible: false,
      reason: `A ${credentialKind} has already been issued for "${typedItem.title}".`,
    };
  }

  return {
    eligible: true,
    reason: "All issuance conditions met.",
    credentialKind,
    title: typedItem.title,
  };
}

// ── Combined: Complete + Evaluate + Issue ──

export async function completeAndIssueIfEligible(
  teacherId: string,
  sourceType: CredentialSourceType,
  sourceId: string,
  evidence?: Record<string, unknown>,
): Promise<{
  completion: TrainingCompletion;
  evaluation: IssuanceEvaluationResult;
  credential: EarnedCredential | null;
}> {
  // Step 1: Record completion
  const completion = await recordTrainingCompletion(
    teacherId,
    sourceType,
    sourceId,
    evidence,
  );

  // Step 2: Evaluate issuance eligibility
  const evaluation = await evaluateCredentialIssuance(teacherId, sourceType, sourceId);

  if (!evaluation.eligible || !evaluation.credentialKind || !evaluation.title) {
    return { completion, evaluation, credential: null };
  }

  // Step 3: Issue credential
  try {
    const credential = await issueEarnedCredential({
      teacher_id: teacherId,
      source_type: sourceType,
      source_id: sourceId,
      credential_kind: evaluation.credentialKind,
      title: evaluation.title,
      metadata: {
        trigger: "completion",
        completion_id: completion.id,
        completed_at: completion.completed_at,
      },
    });

    return { completion, evaluation, credential };
  } catch (err) {
    // Duplicate issuance caught at DB level — not an error
    if (err instanceof Error && err.message.includes("Duplicate credential")) {
      return {
        completion,
        evaluation: { ...evaluation, eligible: false, reason: err.message },
        credential: null,
      };
    }
    throw err;
  }
}
