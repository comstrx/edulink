import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ── Types ──

export type CredentialKind = "badge" | "certificate";
export type CredentialSourceType = "training_item" | "training_package" | "training_pathway";
export type CredentialStatus = "active" | "expired" | "revoked";

export interface EarnedCredential {
  id: string;
  teacher_id: string;
  source_type: CredentialSourceType;
  source_id: string;
  credential_kind: CredentialKind;
  title: string;
  issuer_name: string;
  issued_at: string;
  expiry_date: string | null;
  status: CredentialStatus;
  verification_code: string;
  verification_hash: string | null;
  awarded_by_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IssueCredentialInput {
  teacher_id: string;
  source_type: CredentialSourceType;
  source_id: string;
  credential_kind: CredentialKind;
  title: string;
  issuer_name?: string;
  expiry_date?: string | null;
  awarded_by_user_id?: string | null;
  metadata?: Record<string, unknown>;
}

// ── Verification Code Generation ──

function generateVerificationCode(): string {
  const prefix = "EL";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.getRandomValues(new Uint8Array(4));
  const hex = Array.from(random).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${prefix}-${timestamp}-${hex}`;
}

async function generateVerificationHash(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Issuance ──

export async function issueEarnedCredential(input: IssueCredentialInput): Promise<EarnedCredential> {
  const verificationCode = generateVerificationCode();
  const verificationHash = await generateVerificationHash(verificationCode);

  const { data, error } = await supabase
    .from("earned_credentials")
    .insert([{
      teacher_id: input.teacher_id,
      source_type: input.source_type,
      source_id: input.source_id,
      credential_kind: input.credential_kind,
      title: input.title,
      issuer_name: input.issuer_name ?? "EduLink Training",
      expiry_date: input.expiry_date ?? null,
      awarded_by_user_id: input.awarded_by_user_id ?? null,
      metadata: (input.metadata ?? {}) as Json,
      verification_code: verificationCode,
      verification_hash: verificationHash,
    }])
    .select()
    .returns<EarnedCredential[]>()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Duplicate credential: a ${input.credential_kind} from this source has already been issued to this teacher.`
      );
    }
    throw new Error(`Failed to issue credential: ${error.message}`);
  }

  return data;
}

// ── Reads ──

export async function getTeacherEarnedCredentials(teacherId: string): Promise<EarnedCredential[]> {
  const { data, error } = await supabase
    .from("earned_credentials")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("issued_at", { ascending: false })
    .returns<EarnedCredential[]>();

  if (error) throw new Error(`Failed to load credentials: ${error.message}`);
  return data ?? [];
}

export async function getSchoolTeamEarnedCredentials(): Promise<EarnedCredential[]> {
  // School roles have RLS read access to all earned_credentials
  const { data, error } = await supabase
    .from("earned_credentials")
    .select("*")
    .order("issued_at", { ascending: false })
    .returns<EarnedCredential[]>();

  if (error) throw new Error(`Failed to load team credentials: ${error.message}`);
  return data ?? [];
}

export async function findEarnedCredentialByVerificationCode(
  code: string
): Promise<EarnedCredential | null> {
  const { data, error } = await supabase
    .from("earned_credentials")
    .select("*")
    .eq("verification_code", code)
    .returns<EarnedCredential[]>()
    .maybeSingle();

  if (error) throw new Error(`Verification lookup failed: ${error.message}`);
  return data ?? null;
}

// ── Wallet Summary ──

export interface CredentialWalletSummary {
  certificates: number;
  badges: number;
  totalCredentials: number;
}

export function computeWalletSummary(credentials: EarnedCredential[]): CredentialWalletSummary {
  const active = credentials.filter(c => c.status === "active");
  const certificates = active.filter(c => c.credential_kind === "certificate").length;
  const badges = active.filter(c => c.credential_kind === "badge").length;
  return { certificates, badges, totalCredentials: certificates + badges };
}
