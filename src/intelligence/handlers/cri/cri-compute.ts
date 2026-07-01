/**
 * CRI Computation Engine (Rule-based V1)
 *
 * Computes a Career Readiness Index for a teacher, optionally scoped to a job.
 *
 * CRI is a TEACHER-FACING "readiness/coaching" metric.
 * It evaluates profile completeness, training, verification, and experience.
 *
 * When a jobId is provided, it also incorporates job-specific alignment
 * by reusing the existing matchTeacherToJob() engine.
 *
 * No DB writes here — pure computation only.
 *
 * Phase 3B
 */

import type { CriDimensionScore, TeacherCriSnapshot } from "@/intelligence/read-models/types/intelligence-read-models.types";
import { matchTeacherToJob } from "@/lib/matching";
import type { TeacherMatchInput, JobMatchInput, MatchResult } from "@/lib/matching";

// ── Input shapes ───────────────────────────────────────────────

export interface CriTeacherData {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  cv_url: string | null;
  country_id: string | null;
  city_id: string | null;
  region_id: string | null;
  visa_status_term_id: string | null;
  employment_type_term_ids: string[] | null;
  work_arrangement_term_ids: string[] | null;
  language_ids: string[] | null;
  grade_band_ids: string[] | null;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  certification_ids: string[] | null;
  years_of_experience: number | null;
  /** Count of verified credentials (from trust domain) */
  verifiedCredentialCount: number;
  /** Total credential count */
  totalCredentialCount: number;
  /** Count of completed training items */
  completedTrainingCount: number;
}

export interface CriJobData extends JobMatchInput {
  id: string;
}

export type CriBand = "not_ready" | "emerging" | "strong" | "highly_ready";

export interface CriComputeResult {
  score: number;
  band: CriBand;
  dimensions: CriDimensionScore[];
  gapTermIds: string[];
}

// ── Band classification ────────────────────────────────────────

function classifyBand(score: number): CriBand {
  if (score >= 80) return "highly_ready";
  if (score >= 60) return "strong";
  if (score >= 40) return "emerging";
  return "not_ready";
}

// ── Profile completeness scoring ───────────────────────────────

const PROFILE_FIELDS: { key: keyof CriTeacherData; label: string; weight: number }[] = [
  { key: "full_name", label: "Full Name", weight: 2 },
  { key: "bio", label: "Bio", weight: 1 },
  { key: "avatar_url", label: "Profile Photo", weight: 1 },
  { key: "contact_email", label: "Contact Email", weight: 1 },
  { key: "cv_url", label: "CV/Resume", weight: 1 },
  { key: "country_id", label: "Country", weight: 1 },
  { key: "subject_ids", label: "Subjects", weight: 2 },
  { key: "curriculum_ids", label: "Curriculums", weight: 1 },
  { key: "language_ids", label: "Languages", weight: 1 },
  { key: "certification_ids", label: "Certifications", weight: 1 },
];

function computeProfileCompleteness(teacher: CriTeacherData): { score: number; maxScore: number } {
  const totalWeight = PROFILE_FIELDS.reduce((s, f) => s + f.weight, 0);
  let earned = 0;

  for (const field of PROFILE_FIELDS) {
    const val = teacher[field.key];
    if (val == null) continue;
    if (typeof val === "string" && val.trim() === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    earned += field.weight;
  }

  // Normalize to 0–30 range (profile completeness is 30% of CRI)
  const maxScore = 30;
  const score = Math.round((earned / totalWeight) * maxScore);
  return { score, maxScore };
}

// ── Training score ─────────────────────────────────────────────

function computeTrainingScore(teacher: CriTeacherData): { score: number; maxScore: number } {
  const maxScore = 20;
  const count = teacher.completedTrainingCount;
  // Diminishing returns: 1st course = 8pts, 2nd = 6pts, 3rd+ = 2pts each, cap at 20
  let score = 0;
  if (count >= 1) score += 8;
  if (count >= 2) score += 6;
  if (count >= 3) score += Math.min((count - 2) * 2, 6);
  return { score: Math.min(score, maxScore), maxScore };
}

// ── Verification score ─────────────────────────────────────────

function computeVerificationScore(teacher: CriTeacherData): { score: number; maxScore: number } {
  const maxScore = 20;
  if (teacher.totalCredentialCount === 0) return { score: 0, maxScore };
  const ratio = teacher.verifiedCredentialCount / teacher.totalCredentialCount;
  return { score: Math.round(ratio * maxScore), maxScore };
}

// ── Experience score ───────────────────────────────────────────

function computeExperienceScore(teacher: CriTeacherData): { score: number; maxScore: number } {
  const maxScore = 15;
  const yrs = teacher.years_of_experience ?? 0;
  // 0yrs=0, 1yr=5, 3yrs=10, 5+yrs=15
  let score = 0;
  if (yrs >= 5) score = 15;
  else if (yrs >= 3) score = 10;
  else if (yrs >= 1) score = 5;
  return { score, maxScore };
}

// ── Job alignment (optional) ───────────────────────────────────

function computeJobAlignmentScore(
  teacher: CriTeacherData,
  job: CriJobData,
): { score: number; maxScore: number; gapTermIds: string[] } {
  const maxScore = 15;

  const teacherInput: TeacherMatchInput = {
    country_id: teacher.country_id,
    city_id: teacher.city_id,
    region_id: teacher.region_id,
    visa_status_term_id: teacher.visa_status_term_id,
    employment_type_term_ids: teacher.employment_type_term_ids,
    work_arrangement_term_ids: teacher.work_arrangement_term_ids,
    language_ids: teacher.language_ids,
    grade_band_ids: teacher.grade_band_ids,
    subject_ids: teacher.subject_ids,
    curriculum_ids: teacher.curriculum_ids,
    certification_ids: teacher.certification_ids,
    years_of_experience: teacher.years_of_experience,
  };

  const matchResult: MatchResult = matchTeacherToJob(teacherInput, job);

  // Map match score (0–100) to job alignment dimension (0–15)
  const score = Math.round((matchResult.score / 100) * maxScore);

  return { score, maxScore, gapTermIds: matchResult.unmatchedTermIds };
}

// ── Main CRI computation ───────────────────────────────────────

/**
 * Compute CRI for a teacher, optionally scoped to a job.
 *
 * Without job: 4 dimensions totalling 85pts, scaled to 0–100.
 * With job: 5 dimensions totalling 100pts.
 */
export function computeCRI(teacher: CriTeacherData, job?: CriJobData | null): CriComputeResult {
  const profile = computeProfileCompleteness(teacher);
  const training = computeTrainingScore(teacher);
  const verification = computeVerificationScore(teacher);
  const experience = computeExperienceScore(teacher);

  const dimensions: CriDimensionScore[] = [
    {
      dimension: "profile_completeness",
      label: "Profile Completeness",
      score: profile.score,
      maxScore: profile.maxScore,
      matched: profile.score >= profile.maxScore * 0.7,
    },
    {
      dimension: "training",
      label: "Training & Development",
      score: training.score,
      maxScore: training.maxScore,
      matched: training.score >= training.maxScore * 0.5,
    },
    {
      dimension: "verification",
      label: "Credential Verification",
      score: verification.score,
      maxScore: verification.maxScore,
      matched: verification.score >= verification.maxScore * 0.5,
    },
    {
      dimension: "experience",
      label: "Teaching Experience",
      score: experience.score,
      maxScore: experience.maxScore,
      matched: experience.score >= experience.maxScore * 0.5,
    },
  ];

  let gapTermIds: string[] = [];

  if (job) {
    const alignment = computeJobAlignmentScore(teacher, job);
    dimensions.push({
      dimension: "job_alignment",
      label: "Job Alignment",
      score: alignment.score,
      maxScore: alignment.maxScore,
      matched: alignment.score >= alignment.maxScore * 0.5,
    });
    gapTermIds = alignment.gapTermIds;
  }

  const totalMax = dimensions.reduce((s, d) => s + d.maxScore, 0);
  const totalEarned = dimensions.reduce((s, d) => s + d.score, 0);

  // Normalize to 0–100
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return {
    score,
    band: classifyBand(score),
    dimensions,
    gapTermIds,
  };
}
