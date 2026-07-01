/**
 * Gap Detection Engine (Rule-based V1)
 *
 * Identifies professional gaps that reduce teacher employability.
 * Pure computation — no DB writes.
 *
 * Gap sources:
 * 1. Profile incompleteness (missing fields)
 * 2. Job-specific mismatches (when scoped to a job)
 * 3. Credential/training deficiencies
 *
 * Phase 3D — Sprint 2.3: severity assigned at production time
 */

import type { GapEntry } from "@/intelligence/read-models/types/intelligence-read-models.types";
import type { GapTeacherData, GapJobData } from "./gap-data-loader";

export interface GapDetectionResult {
  gaps: GapEntry[];
  totalGaps: number;
}

const arr = (v: string[] | null | undefined): string[] => v ?? [];

/** Default severity by category — assigned at gap production time */
const CATEGORY_SEVERITY: Record<string, GapEntry["severity"]> = {
  certification: "high",
  license: "high",
  subject: "high",
  language: "medium",
  curriculum: "medium",
  skill: "medium",
  experience: "medium",
  location: "low",
  other: "low",
};

function severityFor(category: string): GapEntry["severity"] {
  return CATEGORY_SEVERITY[category] ?? "medium";
}

// ── Profile completeness gaps ──────────────────────────────────

interface ProfileField {
  key: keyof GapTeacherData;
  category: GapEntry["category"];
  termId: string;
}

const PROFILE_CHECKS: ProfileField[] = [
  { key: "bio", category: "other", termId: "__gap_profile_bio" },
  { key: "avatar_url", category: "other", termId: "__gap_profile_photo" },
  { key: "contact_email", category: "other", termId: "__gap_profile_email" },
  { key: "cv_url", category: "other", termId: "__gap_profile_cv" },
  { key: "country_id", category: "location", termId: "__gap_profile_location" },
  { key: "subject_ids", category: "subject", termId: "__gap_profile_subjects" },
  { key: "curriculum_ids", category: "curriculum", termId: "__gap_profile_curriculums" },
  { key: "language_ids", category: "language", termId: "__gap_profile_languages" },
];

function detectProfileGaps(teacher: GapTeacherData): GapEntry[] {
  const gaps: GapEntry[] = [];

  for (const field of PROFILE_CHECKS) {
    const val = teacher[field.key];
    const isEmpty =
      val == null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty) {
      gaps.push({
        termId: field.termId,
        label: `Missing ${field.key.replace(/_/g, " ").replace(" ids", "").replace(" id", "")}`,
        category: field.category,
        source: "profile_analysis",
        severity: severityFor(field.category),
      });
    }
  }

  if (teacher.years_of_experience == null || teacher.years_of_experience === 0) {
    gaps.push({
      termId: "__gap_profile_experience",
      label: "No teaching experience recorded",
      category: "experience",
      source: "profile_analysis",
      severity: severityFor("experience"),
    });
  }

  if (teacher.certificationTermIds.length === 0 && arr(teacher.certification_ids).length === 0) {
    gaps.push({
      termId: "__gap_profile_certifications",
      label: "No certifications on profile",
      category: "certification",
      source: "profile_analysis",
      severity: severityFor("certification"),
    });
  }

  if (teacher.skillTermIds.length === 0) {
    gaps.push({
      termId: "__gap_profile_skills",
      label: "No skills on profile",
      category: "skill",
      source: "profile_analysis",
      severity: severityFor("skill"),
    });
  }

  if (teacher.completedTrainingCount === 0) {
    gaps.push({
      termId: "__gap_profile_training",
      label: "No completed training",
      category: "other",
      source: "profile_analysis",
      severity: severityFor("other"),
    });
  }

  return gaps;
}

// ── Job-specific gaps ──────────────────────────────────────────

function detectJobGaps(teacher: GapTeacherData, job: GapJobData): GapEntry[] {
  const gaps: GapEntry[] = [];

  const teacherSubjects = new Set(arr(teacher.subject_ids));
  for (const id of arr(job.subject_term_ids)) {
    if (!teacherSubjects.has(id)) {
      gaps.push({
        termId: id,
        category: "subject",
        source: "job_requirement",
        severity: severityFor("subject"),
        sourceJobId: job.id,
      });
    }
  }

  const teacherCurrs = new Set(arr(teacher.curriculum_ids));
  for (const id of arr(job.curriculum_term_ids)) {
    if (!teacherCurrs.has(id)) {
      gaps.push({
        termId: id,
        category: "curriculum",
        source: "job_requirement",
        severity: severityFor("curriculum"),
        sourceJobId: job.id,
      });
    }
  }

  const teacherCerts = new Set([
    ...arr(teacher.certification_ids),
    ...teacher.certificationTermIds,
  ]);
  for (const id of arr(job.certification_term_ids)) {
    if (!teacherCerts.has(id)) {
      gaps.push({
        termId: id,
        category: "certification",
        source: "job_requirement",
        severity: severityFor("certification"),
        sourceJobId: job.id,
      });
    }
  }

  const teacherLangs = new Set(arr(teacher.language_ids));
  for (const id of arr(job.language_term_ids)) {
    if (!teacherLangs.has(id)) {
      gaps.push({
        termId: id,
        category: "language",
        source: "job_requirement",
        severity: severityFor("language"),
        sourceJobId: job.id,
      });
    }
  }

  const teacherSkills = new Set(teacher.skillTermIds);
  for (const id of job.skillTermIds) {
    if (!teacherSkills.has(id)) {
      gaps.push({
        termId: id,
        category: "skill",
        source: "job_requirement",
        severity: severityFor("skill"),
        sourceJobId: job.id,
      });
    }
  }

  if (
    job.experience_min != null &&
    job.experience_min > 0 &&
    (teacher.years_of_experience ?? 0) < job.experience_min
  ) {
    gaps.push({
      termId: `__gap_experience_${job.id}`,
      label: `Requires ${job.experience_min}+ years (have ${teacher.years_of_experience ?? 0})`,
      category: "experience",
      source: "job_requirement",
      severity: severityFor("experience"),
      sourceJobId: job.id,
    });
  }

  return gaps;
}

// ── Main detection ─────────────────────────────────────────────

export function detectGaps(
  teacher: GapTeacherData,
  job?: GapJobData | null,
): GapDetectionResult {
  const profileGaps = detectProfileGaps(teacher);
  const jobGaps = job ? detectJobGaps(teacher, job) : [];

  const seen = new Set<string>();
  const allGaps: GapEntry[] = [];

  for (const gap of [...jobGaps, ...profileGaps]) {
    if (!seen.has(gap.termId)) {
      seen.add(gap.termId);
      allGaps.push(gap);
    }
  }

  return {
    gaps: allGaps,
    totalGaps: allGaps.length,
  };
}
