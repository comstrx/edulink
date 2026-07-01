/**
 * Recommendation Data Loader
 *
 * Reads teacher gap snapshot and training catalog for
 * recommendation generation. READ-ONLY.
 *
 * Phase 3E
 */

import { supabase } from "@/integrations/supabase/client";
import type { GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";

export interface RecommendationTeacherData {
  id: string;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  grade_band_ids: string[] | null;
  skillTermIds: string[];
}

export interface TeacherGapData {
  gaps: GapEntry[];
  totalGaps: number;
}

export interface TrainingCatalogItem {
  id: string;
  title: string;
  type: string;
  subject_term_ids: string[] | null;
  skill_term_ids: string[] | null;
  curriculum_term_ids: string[] | null;
  grade_band_term_ids: string[] | null;
  credential_eligible: boolean;
}

export async function loadRecommendationTeacherData(teacherId: string): Promise<RecommendationTeacherData | null> {
  const [profileRes, skillsRes] = await Promise.all([
    supabase
      .from("teacher_profiles")
      .select("id, subject_ids, curriculum_ids, grade_band_ids")
      .eq("id", teacherId)
      .maybeSingle(),
    supabase
      .from("teacher_skills")
      .select("skill_term_id")
      .eq("teacher_id", teacherId),
  ]);

  if (profileRes.error || !profileRes.data) {
    console.warn(`[RecDataLoader] Teacher not found: ${teacherId}`);
    return null;
  }

  return {
    id: profileRes.data.id,
    subject_ids: profileRes.data.subject_ids,
    curriculum_ids: profileRes.data.curriculum_ids,
    grade_band_ids: profileRes.data.grade_band_ids,
    skillTermIds: (skillsRes.data ?? []).map((r) => r.skill_term_id),
  };
}

export async function loadTeacherGapSnapshot(teacherId: string): Promise<TeacherGapData | null> {
  const { data, error } = await supabase
    .from("intelligence_gap_snapshots")
    .select("gaps, total_gaps")
    .eq("teacher_id", teacherId)
    .eq("staleness", "fresh")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    gaps: (data.gaps as unknown as GapEntry[]) ?? [],
    totalGaps: data.total_gaps,
  };
}

export async function loadTrainingCatalog(): Promise<TrainingCatalogItem[]> {
  const { data, error } = await supabase
    .from("training_items")
    .select("id, title, type, subject_term_ids, skill_term_ids, curriculum_term_ids, grade_band_term_ids, credential_eligible")
    .eq("status", "published")
    .eq("is_active", true)
    .limit(200);

  if (error) {
    console.warn(`[RecDataLoader] Failed to load training catalog:`, error.message);
    return [];
  }

  return data ?? [];
}
