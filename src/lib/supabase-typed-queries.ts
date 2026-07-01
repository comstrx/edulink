/**
 * Typed Supabase query helpers.
 *
 * Uses `.returns<T>()` to bypass deep type instantiation errors
 * without blanket `as any` casts. Enum fields use Database enums.
 * Zero `any` in the public API.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type MentorStatus = Database["public"]["Enums"]["mentor_status"];
type ProviderStatus = Database["public"]["Enums"]["provider_status"];
type ProviderType = Database["public"]["Enums"]["provider_type"];

// ── Mentor Queries ───────────────────────────────────────────────────────────

export interface MentorRow {
  id: string;
  user_id: string;
  status: MentorStatus;
  bio: string | null;
  headline: string | null;
  years_experience: number | null;
  languages: string[];
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  onboarding_current_step: string | null;
}

export async function insertMentor(row: {
  user_id: string;
  status: MentorStatus;
  onboarding_started_at: string;
  onboarding_current_step: string;
}): Promise<void> {
  const { error } = await supabase.from("mentors").insert(row);
  if (error) throw error;
}

export async function updateMentor(
  mentorId: string,
  fields: {
    headline?: string | null;
    bio?: string | null;
    years_experience?: number | null;
    status?: MentorStatus;
    onboarding_completed_at?: string | null;
    onboarding_current_step?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("mentors").update(fields).eq("id", mentorId);
  if (error) throw error;
}

export async function fetchMentorProfile(
  mentorId: string,
): Promise<{ headline: string | null; bio: string | null; years_experience: number | null } | null> {
  const { data, error } = await supabase
    .from("mentors")
    .select("headline, bio, years_experience")
    .eq("id", mentorId)
    .returns<{ headline: string | null; bio: string | null; years_experience: number | null }[]>()
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// ── Provider Queries ─────────────────────────────────────────────────────────

export interface ProviderUpdateFields {
  display_name?: string;
  bio?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
}

export async function updateProvider(
  providerId: string,
  fields: ProviderUpdateFields,
): Promise<void> {
  const { error } = await supabase.from("providers").update(fields).eq("id", providerId);
  if (error) throw error;
}

// ── Provider Directory Queries ───────────────────────────────────────────────

export interface ProviderDirectoryRow {
  id: string;
  display_name: string;
  slug: string;
  logo_url: string | null;
  bio: string | null;
  website_url: string | null;
  country_term_id: string | null;
  city_term_id: string | null;
  type: string;
  verification_status: string;
}

// The applyPublicFilters function works on any chainable query builder
export async function fetchProviderDirectory(opts: {
  applyPublicFilters: <Q extends { eq: (...args: unknown[]) => unknown }>(query: Q) => Q;
  searchQuery: string;
  countryId: string;
  providerIds?: string[] | null;
  offset: number;
  limit: number;
}): Promise<{ providers: ProviderDirectoryRow[]; count: number }> {
  // providers + complex filter chain triggers TS2589 — isolated cast at boundary only
  const raw = supabase.from("providers") as any;
  const baseQuery = raw.select("id, display_name, slug, logo_url, bio, website_url, country_term_id, city_term_id, type, verification_status", { count: "exact" });
  let q = opts.applyPublicFilters(baseQuery).order("display_name");

  if (opts.searchQuery.trim()) {
    q = q.or(`display_name.ilike.%${opts.searchQuery.trim()}%,bio.ilike.%${opts.searchQuery.trim()}%`);
  }
  if (opts.countryId) {
    q = q.eq("country_term_id", opts.countryId);
  }
  // Pre-filter by provider IDs (e.g. when contentType filter narrows to specific providers)
  if (opts.providerIds) {
    q = q.in("id", opts.providerIds);
  }

  const { data, error, count } = await q.range(opts.offset, opts.offset + opts.limit - 1);
  if (error) throw error;
  return { providers: data ?? [], count: count ?? 0 };
}

export interface TrainingItemTypeRow {
  provider_id: string;
  type: string;
}

export async function fetchTrainingItemAgg(providerIds: string[]): Promise<TrainingItemTypeRow[]> {
  const { data, error } = await supabase
    .from("training_items")
    .select("provider_id, type")
    .in("provider_id", providerIds)
    .eq("ownership_type", "provider")
    .eq("review_status", "approved" as const)
    .eq("is_active", true)
    .eq("status", "published" as const)
    .returns<TrainingItemTypeRow[]>();
  if (error) throw error;
  return data ?? [];
}

// ── Saved Jobs ───────────────────────────────────────────────────────────────

export interface SavedJobRow {
  id: string;
  job_id: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    status: string;
    school_id: string;
    created_at: string;
    school_organizations: { name: string } | null;
  } | null;
}

export async function fetchSavedJobs(teacherId: string): Promise<SavedJobRow[]> {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id, job_id, created_at, jobs:job_id(id, title, status, school_id, created_at, school_organizations:school_id(name))")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .returns<SavedJobRow[]>();
  if (error) throw error;
  return data ?? [];
}

// ── Admin Provider Queries ──────────────────────────────────────────────────

export interface AdminProviderRow {
  id: string;
  display_name: string;
  legal_name: string;
  type: string;
  status: string;
  verification_status: string;
  created_at: string;
}

export async function fetchAdminProviders(opts: {
  statusFilter: string;
  typeFilter: string;
}): Promise<AdminProviderRow[]> {
  let q = supabase
    .from("providers")
    .select("id, display_name, legal_name, type, status, verification_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (opts.statusFilter !== "all") q = q.eq("status", opts.statusFilter as ProviderStatus);
  if (opts.typeFilter !== "all") q = q.eq("type", opts.typeFilter as ProviderType);

  const { data, error } = await q.returns<AdminProviderRow[]>();
  if (error) throw error;
  return data ?? [];
}

// ── Admin Training Item Queries ─────────────────────────────────────────────

type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected" | "changes_requested";
type TrainingItemType = "course" | "package" | "pathway";

export interface AdminTrainingItemRow {
  id: string;
  title: string;
  type: string;
  review_status: string;
  updated_at: string;
  ownership_type: string;
  provider_id: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_by_provider_at: string | null;
  approved_by_admin_at: string | null;
}

export async function fetchAdminProviderContent(opts: {
  reviewFilter: string;
  typeFilter: string;
}): Promise<AdminTrainingItemRow[]> {
  let q = supabase
    .from("training_items")
    .select("id, title, type, review_status, updated_at, ownership_type, provider_id, review_notes, reviewed_by, reviewed_at, published_by_provider_at, approved_by_admin_at")
    .eq("ownership_type", "provider")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (opts.reviewFilter !== "all") q = q.eq("review_status", opts.reviewFilter as ReviewStatus);
  if (opts.typeFilter !== "all") q = q.eq("type", opts.typeFilter as TrainingItemType);

  const { data, error } = await q.returns<AdminTrainingItemRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchProviderNames(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("providers")
    .select("id, display_name")
    .in("id", ids)
    .returns<{ id: string; display_name: string }[]>();
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((p) => { map[p.id] = p.display_name; });
  return map;
}

export async function updateTrainingItemReview(
  itemId: string,
  fields: {
    review_status: ReviewStatus;
    reviewed_by?: string;
    approved_by_admin_at?: string;
    review_notes?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("training_items")
    .update(fields)
    .eq("id", itemId);
  if (error) throw error;
}

// ── Provider Catalog Editor Queries ─────────────────────────────────────────

export async function fetchProviderTrainingItem(
  itemId: string,
  providerId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("training_items")
    .select("*")
    .eq("id", itemId)
    .eq("provider_id", providerId)
    .eq("ownership_type", "provider")
    .maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function updateProviderTrainingItem(
  itemId: string,
  providerId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // training_items.update with Record<string,unknown> needs a cast for the payload shape
  const { error } = await supabase
    .from("training_items")
    .update(payload as Database["public"]["Tables"]["training_items"]["Update"])
    .eq("id", itemId)
    .eq("provider_id", providerId);
  if (error) throw error;
}

export async function insertProviderTrainingItem(
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from("training_items")
    .insert([payload as Database["public"]["Tables"]["training_items"]["Insert"]])
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function submitProviderItemForReview(
  itemId: string,
  providerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("training_items")
    .update({
      review_status: "pending_review" as const,
      published_by_provider_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("provider_id", providerId);
  if (error) throw error;
}

// ── Compliance ──────────────────────────────────────────────────────────────

export interface ComplianceRequirementRow {
  id: string;
  school_id: string;
  training_item_id: string;
  title: string;
  is_mandatory: boolean;
  due_date: string | null;
  created_at: string;
}

export interface TeacherComplianceStatusRow {
  id: string;
  school_id: string;
  teacher_id: string;
  requirement_id: string;
  status: string;
  completed_at: string | null;
}

export async function fetchComplianceRequirements(schoolId: string): Promise<ComplianceRequirementRow[]> {
  const { data, error } = await supabase
    .from("compliance_requirements")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .returns<ComplianceRequirementRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchTeacherComplianceStatuses(requirementIds: string[]): Promise<TeacherComplianceStatusRow[]> {
  const { data, error } = await supabase
    .from("teacher_compliance_status")
    .select("*")
    .in("requirement_id", requirementIds)
    .returns<TeacherComplianceStatusRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function insertComplianceRequirement(row: {
  school_id: string;
  training_item_id: string;
  title: string;
  is_mandatory: boolean;
  due_date: string | null;
}): Promise<ComplianceRequirementRow> {
  const { data, error } = await supabase
    .from("compliance_requirements")
    .insert(row)
    .select()
    .returns<ComplianceRequirementRow[]>()
    .single();
  if (error) throw error;
  return data as ComplianceRequirementRow;
}

// ── School Mentors page queries ─────────────────────────────────────────────

export interface SchoolTeamMemberRow {
  school_id: string;
  teacher_id: string;
}

export async function fetchSchoolTeamMember(userId: string): Promise<SchoolTeamMemberRow | null> {
  // school_team_members triggers TS2589 on chained .eq().maybeSingle() — isolated cast
  const raw = supabase.from("school_team_members") as any;
  const { data, error } = await raw
    .select("school_id, teacher_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchSchoolTeamTeacherIds(schoolId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("school_team_members")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .returns<{ teacher_id: string }[]>();
  if (error) throw error;
  return (data ?? []).map((r) => r.teacher_id);
}

// ── Mentor Session Queries ──────────────────────────────────────────────────

export interface MentorSessionRow {
  id: string;
  teacher_id: string;
  status: string;
  training_execution_id: string | null;
  scheduled_at: string;
  evidence_submitted: boolean | null;
  session_outcome: string | null;
}

export async function fetchMentorSessionsForTeachers(
  teacherIds: string[],
): Promise<MentorSessionRow[]> {
  const { data, error } = await supabase
    .from("mentor_sessions")
    .select("id, teacher_id, status, training_execution_id, scheduled_at, evidence_submitted, session_outcome")
    .in("teacher_id", teacherIds)
    .not("training_execution_id", "is", null)
    .order("scheduled_at", { ascending: false })
    .returns<MentorSessionRow[]>();
  if (error) throw error;
  return data ?? [];
}

export interface TeacherNameRow {
  id: string;
  full_name: string;
}

export async function fetchTeacherNames(ids: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("id, full_name")
    .in("id", ids)
    .returns<TeacherNameRow[]>();
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((t) => { map[t.id] = t.full_name; });
  return map;
}

export async function fetchTrainingExecutionItemMap(execIds: string[]): Promise<Record<string, string>> {
  if (!execIds.length) return {};
  const { data: executions, error: eErr } = await supabase
    .from("training_executions")
    .select("id, training_item_id")
    .in("id", execIds)
    .returns<{ id: string; training_item_id: string }[]>();
  if (eErr) throw eErr;

  const itemIds = [...new Set((executions ?? []).map((e) => e.training_item_id))];
  if (!itemIds.length) return {};

  const { data: items, error: iErr } = await supabase
    .from("training_items")
    .select("id, title")
    .in("id", itemIds)
    .returns<{ id: string; title: string }[]>();
  if (iErr) throw iErr;

  const itemMap: Record<string, string> = {};
  (items ?? []).forEach((i) => { itemMap[i.id] = i.title; });

  const execItemMap: Record<string, string> = {};
  (executions ?? []).forEach((e) => { execItemMap[e.id] = itemMap[e.training_item_id] ?? "Training"; });
  return execItemMap;
}

export interface SessionEvidenceRow {
  session_id: string;
  status: string;
}

export async function fetchSessionEvidenceStatuses(sessionIds: string[]): Promise<Record<string, string>> {
  if (!sessionIds.length) return {};
  const { data, error } = await supabase
    .from("mentor_session_evidence")
    .select("session_id, status")
    .in("session_id", sessionIds)
    .returns<SessionEvidenceRow[]>();
  if (error) throw error;

  const map: Record<string, string> = {};
  (data ?? []).forEach((e) => {
    const current = map[e.session_id];
    if (!current || e.status === "approved" || (e.status === "submitted" && current !== "approved")) {
      map[e.session_id] = e.status;
    }
  });
  return map;
}

// ── Interview Queries ───────────────────────────────────────────────────────

export interface InterviewRow {
  id: string;
  application_id: string;
  job_id: string;
  teacher_id: string;
  scheduled_at: string;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export async function fetchInterviewsByApplication(applicationId: string): Promise<InterviewRow[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: true })
    .returns<InterviewRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchInterviewsByTeacher(teacherId: string): Promise<InterviewRow[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("scheduled_at", { ascending: false })
    .returns<InterviewRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchInterviewsByJob(jobId: string): Promise<InterviewRow[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("job_id", jobId)
    .order("scheduled_at", { ascending: true })
    .returns<InterviewRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function insertInterview(row: {
  application_id: string;
  teacher_id: string;
  job_id: string;
  created_by: string;
  scheduled_at: string;
  meeting_link?: string | null;
  notes?: string | null;
  status?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("interviews")
    .insert(row);
  if (error) throw error;
}

export async function updateInterview(
  interviewId: string,
  fields: Partial<Pick<InterviewRow, "scheduled_at" | "meeting_link" | "notes" | "status">>,
): Promise<void> {
  const { error } = await supabase
    .from("interviews")
    .update(fields)
    .eq("id", interviewId);
  if (error) throw error;
}

// ── Mobility Queries ────────────────────────────────────────────────────────

export interface MobilityTargetRow {
  id: string;
  track_id: string;
  track_name: string | null;
  name: string;
  slug: string;
  description: string | null;
  target_role: string | null;
  target_curriculum_term_ids: string[] | null;
  target_school_type_term_ids: string[] | null;
  target_career_stage_id: string | null;
}

export async function fetchMobilityTargets(): Promise<MobilityTargetRow[]> {
  const { data, error } = await supabase
    .from("mobility_targets")
    .select("id, track_id, name, slug, description, target_role, target_curriculum_term_ids, target_school_type_term_ids, target_career_stage_id, is_active, sort_order, mobility_tracks!inner(name)")
    .eq("is_active", true)
    .order("sort_order")
    .returns<Array<{
      id: string; track_id: string; name: string; slug: string;
      description: string | null; target_role: string | null;
      target_curriculum_term_ids: string[] | null;
      target_school_type_term_ids: string[] | null;
      target_career_stage_id: string | null;
      mobility_tracks: { name: string } | null;
    }>>();
  if (error) throw error;
  return (data ?? []).map((t) => ({
    ...t,
    track_name: t.mobility_tracks?.name ?? null,
  }));
}

export interface MobilityRequirementRow {
  id: string;
  target_id: string;
  requirement_type: string;
  requirement_key: string;
  requirement_label: string;
  is_mandatory: boolean;
  min_count: number | null;
  min_reputation_score: number | null;
  min_experience_years: number | null;
  term_ids: string[] | null;
  metadata: Record<string, unknown> | null;
}

export async function fetchMobilityRequirements(): Promise<MobilityRequirementRow[]> {
  const { data, error } = await supabase
    .from("mobility_requirements")
    .select("*")
    .returns<MobilityRequirementRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function fetchTeacherMobilityStates(teacherId: string): Promise<import("@/mobility/types/mobility.types").TeacherMobilityState[]> {
  const { data, error } = await supabase
    .from("teacher_mobility_states")
    .select("teacher_id, target_id, readiness_percent, gap_count, blocking_gaps, last_evaluated, satisfied_count, total_count, mobility_targets!inner(name, mobility_tracks!inner(name))")
    .eq("teacher_id", teacherId)
    .order("readiness_percent", { ascending: false })
    .returns<Array<{
      teacher_id: string; target_id: string; readiness_percent: number;
      gap_count: number; blocking_gaps: Array<{ key: string; label: string }> | null;
      last_evaluated: string;
      mobility_targets: { name: string; mobility_tracks: { name: string } | null } | null;
    }>>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    teacherId: r.teacher_id,
    targetId: r.target_id,
    targetName: r.mobility_targets?.name ?? "",
    trackName: r.mobility_targets?.mobility_tracks?.name ?? "",
    readinessPercent: Number(r.readiness_percent),
    gapCount: r.gap_count,
    blockingGaps: r.blocking_gaps ?? [],
    lastEvaluated: r.last_evaluated,
  }));
}

export async function upsertTeacherMobilityState(row: {
  teacher_id: string;
  target_id: string;
  readiness_percent: number;
  satisfied_count: number;
  total_count: number;
  gap_count: number;
  blocking_gaps: Json;
  evaluation_trace: Json;
  last_evaluated: string;
  updated_at: string;
}): Promise<void> {
  const { error } = await supabase
    .from("teacher_mobility_states")
    .upsert(row, { onConflict: "teacher_id,target_id" });
  if (error) throw new Error(`Failed to persist mobility state: ${error.message}`);
}

// ── Reputation Queries ──────────────────────────────────────────────────────

export interface ReputationProfileRow {
  reputation_score: number;
  credibility_tier: string;
}

export async function fetchReputationProfile(teacherId: string): Promise<ReputationProfileRow | null> {
  const { data, error } = await supabase
    .from("reputation_profiles")
    .select("reputation_score, credibility_tier")
    .eq("teacher_id", teacherId)
    .returns<ReputationProfileRow[]>()
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function insertReputationEvent(row: {
  teacher_id: string;
  event_type: string;
  source_domain: string;
  source_reference_id: string | null;
  reputation_delta: number;
  dimension: string;
  description: string;
}): Promise<void> {
  const { error } = await supabase
    .from("reputation_events")
    .insert(row);
  if (error) throw error;
}

export interface ReputationEventRow {
  reputation_delta: number;
  dimension: string;
}

export async function fetchReputationEvents(teacherId: string): Promise<ReputationEventRow[]> {
  const { data, error } = await supabase
    .from("reputation_events")
    .select("reputation_delta, dimension")
    .eq("teacher_id", teacherId)
    .returns<ReputationEventRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function upsertReputationProfile(row: {
  teacher_id: string;
  reputation_score: number;
  credibility_tier: string;
  dimension_scores: Record<string, number>;
  total_reputation_events: number;
  verified_signal_count: number;
  updated_at: string;
}): Promise<void> {
  const payload = {
    ...row,
    dimension_scores: row.dimension_scores as unknown as Json,
  };
  const { error } = await supabase
    .from("reputation_profiles")
    .upsert(payload, { onConflict: "teacher_id" });
  if (error) throw error;
}

// ── Provider Catalog Queries ────────────────────────────────────────────────

export interface ProviderCatalogItemRow {
  id: string;
  title: string;
  type: string;
  review_status: string;
  updated_at: string;
  published_by_provider_at: string | null;
  approved_by_admin_at: string | null;
  status: string;
  ownership_type: string;
  review_notes: string | null;
  reviewed_at: string | null;
}

export async function fetchProviderCatalogItems(opts: {
  providerId: string;
  typeFilter: string;
  reviewFilter: string;
}): Promise<ProviderCatalogItemRow[]> {
  let q = supabase
    .from("training_items")
    .select("id, title, type, review_status, updated_at, published_by_provider_at, approved_by_admin_at, status, ownership_type, review_notes, reviewed_at")
    .eq("provider_id", opts.providerId)
    .eq("ownership_type", "provider")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (opts.typeFilter !== "all") q = q.eq("type", opts.typeFilter);
  if (opts.reviewFilter !== "all") q = q.eq("review_status", opts.reviewFilter as ReviewStatus);

  const { data, error } = await q.returns<ProviderCatalogItemRow[]>();
  if (error) throw error;
  return data ?? [];
}

// ── Provider Profile (public) Training Items ────────────────────────────────

export interface PublicTrainingItemRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  short_description: string | null;
  duration: string | null;
  credential_eligible: boolean | null;
  updated_at: string;
}

export async function fetchPublicProviderTrainingItems(providerId: string): Promise<PublicTrainingItemRow[]> {
  const { data, error } = await supabase
    .from("training_items")
    .select("id, title, slug, type, short_description, duration, credential_eligible, updated_at")
    .eq("provider_id", providerId)
    .eq("ownership_type", "provider")
    .eq("review_status", "approved")
    .eq("is_active", true)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<PublicTrainingItemRow[]>();
  if (error) throw error;
  return data ?? [];
}
