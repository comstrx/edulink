/**
 * Rule-based Teacher ↔ Job matching utility (V1).
 *
 * Compares taxonomy IDs and numeric fields only.
 * No AI, no free-text matching, no CRI.
 *
 * WEIGHTS (total = 100):
 *   Subjects      20
 *   Curriculums   15
 *   Grade Bands   10
 *   Location      10
 *   Employment    10
 *   Work Arr.     10
 *   Languages     10
 *   Visa Status    5
 *   Certifications 5
 *   Experience     5
 *
 * CONFIDENCE:
 *   high   — ≤ 1 field missing on either side
 *   medium — 2-3 fields missing
 *   low    — 4+ fields missing
 */

// ── Types ──────────────────────────────────────────────

export interface TeacherMatchInput {
  country_id: string | null;
  city_id: string | null;
  region_id?: string | null;
  visa_status_term_id: string | null;
  employment_type_term_ids: string[] | null;
  work_arrangement_term_ids: string[] | null;
  language_ids: string[] | null;
  availability_status_term_ids?: string[] | null;
  grade_band_ids: string[] | null;
  subject_ids: string[] | null;
  curriculum_ids: string[] | null;
  certification_ids: string[] | null;
  years_of_experience: number | null;
}

export interface JobMatchInput {
  country_term_id: string | null;
  city_term_id: string | null;
  region_term_id?: string | null;
  role_category_term_id?: string | null;
  role_type_term_id?: string | null;
  school_type_term_id?: string | null;
  seniority_level_term_id?: string | null;
  visa_status_term_ids: string[] | null;
  employment_type_term_ids: string[] | null;
  work_arrangement_term_ids: string[] | null;
  language_term_ids: string[] | null;
  language_level_term_id?: string | null;
  grade_band_term_ids: string[] | null;
  subject_term_ids: string[] | null;
  curriculum_term_ids: string[] | null;
  certification_term_ids: string[] | null;
  experience_min: number | null;
}

export interface DimensionResult {
  matched: boolean;
  score: number;
  reason: string;
}

export interface MatchResult {
  score: number;
  confidence: "low" | "medium" | "high";
  breakdown: {
    location: DimensionResult;
    subjects: DimensionResult;
    curriculums: DimensionResult;
    gradeBands: DimensionResult;
    employmentTypes: DimensionResult;
    workArrangements: DimensionResult;
    visaStatus: DimensionResult;
    languages: DimensionResult;
    certifications: DimensionResult;
    experience: DimensionResult;
  };
  missingData: string[];
  matchedTermIds: string[];
  unmatchedTermIds: string[];
}

// ── Weights ────────────────────────────────────────────

const WEIGHTS = {
  subjects: 20,
  curriculums: 15,
  gradeBands: 10,
  location: 10,
  employmentTypes: 10,
  workArrangements: 10,
  languages: 10,
  visaStatus: 5,
  certifications: 5,
  experience: 5,
} as const;

// ── Helpers ────────────────────────────────────────────

const arr = (v: string[] | null | undefined): string[] => v ?? [];

/** Overlap ratio: |A ∩ B| / |B| where B is the requirement set */
function overlapRatio(teacherIds: string[], jobIds: string[]): { ratio: number; matched: string[]; unmatched: string[] } {
  if (jobIds.length === 0) return { ratio: 1, matched: [], unmatched: [] };
  const tSet = new Set(teacherIds);
  const matched = jobIds.filter((id) => tSet.has(id));
  const unmatched = jobIds.filter((id) => !tSet.has(id));
  return { ratio: matched.length / jobIds.length, matched, unmatched };
}

function arrayDimension(
  teacherIds: string[] | null,
  jobIds: string[] | null,
  weight: number,
  teacherLabel: string,
  jobLabel: string,
): { result: DimensionResult; matched: string[]; unmatched: string[]; missing: string | null } {
  const t = arr(teacherIds);
  const j = arr(jobIds);

  // Job doesn't require this → auto-pass
  if (j.length === 0) {
    return {
      result: { matched: true, score: weight, reason: "Not required by job" },
      matched: [],
      unmatched: [],
      missing: null,
    };
  }

  // Teacher has no data
  if (t.length === 0) {
    return {
      result: { matched: false, score: 0, reason: `Teacher has no ${teacherLabel} data` },
      matched: [],
      unmatched: j,
      missing: teacherLabel,
    };
  }

  const { ratio, matched, unmatched } = overlapRatio(t, j);
  const score = Math.round(ratio * weight);
  const pct = Math.round(ratio * 100);

  return {
    result: {
      matched: ratio >= 0.5,
      score,
      reason: ratio === 1
        ? `All ${j.length} required ${jobLabel} matched`
        : `${matched.length}/${j.length} required ${jobLabel} matched (${pct}%)`,
    },
    matched,
    unmatched,
    missing: null,
  };
}

// ── Main function ──────────────────────────────────────

export function matchTeacherToJob(teacher: TeacherMatchInput, job: JobMatchInput): MatchResult {
  const missingData: string[] = [];
  const allMatched: string[] = [];
  const allUnmatched: string[] = [];

  // ── Location ──
  let locationResult: DimensionResult;
  const jobHasLocation = !!(job.city_term_id || job.country_term_id);
  if (!jobHasLocation) {
    locationResult = { matched: true, score: WEIGHTS.location, reason: "Not required by job" };
  } else if (!teacher.country_id && !teacher.city_id) {
    locationResult = { matched: false, score: 0, reason: "Teacher has no location data" };
    missingData.push("location");
  } else {
    const cityMatch = !!(job.city_term_id && teacher.city_id && job.city_term_id === teacher.city_id);
    const countryMatch = !!(job.country_term_id && teacher.country_id && job.country_term_id === teacher.country_id);

    if (cityMatch) {
      locationResult = { matched: true, score: WEIGHTS.location, reason: "Exact city match" };
      allMatched.push(job.city_term_id!);
    } else if (countryMatch) {
      // Country match but not city → partial credit
      const score = job.city_term_id ? Math.round(WEIGHTS.location * 0.6) : WEIGHTS.location;
      locationResult = { matched: true, score, reason: job.city_term_id ? "Country match (different city)" : "Country match" };
      allMatched.push(job.country_term_id!);
      if (job.city_term_id) allUnmatched.push(job.city_term_id);
    } else {
      locationResult = { matched: false, score: 0, reason: "Location does not match" };
      if (job.country_term_id) allUnmatched.push(job.country_term_id);
      if (job.city_term_id) allUnmatched.push(job.city_term_id);
    }
  }

  // ── Array dimensions ──
  const subjectsD = arrayDimension(teacher.subject_ids, job.subject_term_ids, WEIGHTS.subjects, "subjects", "subjects");
  const curriculumsD = arrayDimension(teacher.curriculum_ids, job.curriculum_term_ids, WEIGHTS.curriculums, "curriculums", "curriculums");
  const gradeBandsD = arrayDimension(teacher.grade_band_ids, job.grade_band_term_ids, WEIGHTS.gradeBands, "grade bands", "grade bands");
  const employmentD = arrayDimension(teacher.employment_type_term_ids, job.employment_type_term_ids, WEIGHTS.employmentTypes, "employment types", "employment types");
  const workArrD = arrayDimension(teacher.work_arrangement_term_ids, job.work_arrangement_term_ids, WEIGHTS.workArrangements, "work arrangements", "work arrangements");
  const languagesD = arrayDimension(teacher.language_ids, job.language_term_ids, WEIGHTS.languages, "languages", "languages");
  const certsD = arrayDimension(teacher.certification_ids, job.certification_term_ids, WEIGHTS.certifications, "certifications", "certifications");

  // Collect missing/matched/unmatched from array dimensions
  for (const d of [subjectsD, curriculumsD, gradeBandsD, employmentD, workArrD, languagesD, certsD]) {
    if (d.missing) missingData.push(d.missing);
    allMatched.push(...d.matched);
    allUnmatched.push(...d.unmatched);
  }

  // ── Visa Status ──
  let visaResult: DimensionResult;
  const jobVisaIds = arr(job.visa_status_term_ids);
  if (jobVisaIds.length === 0) {
    visaResult = { matched: true, score: WEIGHTS.visaStatus, reason: "Not required by job" };
  } else if (!teacher.visa_status_term_id) {
    visaResult = { matched: false, score: 0, reason: "Teacher has no visa status data" };
    missingData.push("visa status");
  } else {
    const match = jobVisaIds.includes(teacher.visa_status_term_id);
    visaResult = {
      matched: match,
      score: match ? WEIGHTS.visaStatus : 0,
      reason: match ? "Visa status matches requirement" : "Visa status does not match",
    };
    if (match) allMatched.push(teacher.visa_status_term_id);
    else allUnmatched.push(...jobVisaIds);
  }

  // ── Experience ──
  let experienceResult: DimensionResult;
  if (job.experience_min == null || job.experience_min === 0) {
    experienceResult = { matched: true, score: WEIGHTS.experience, reason: "No minimum experience required" };
  } else if (teacher.years_of_experience == null) {
    experienceResult = { matched: false, score: 0, reason: "Teacher has no experience data" };
    missingData.push("experience");
  } else {
    const meets = teacher.years_of_experience >= job.experience_min;
    experienceResult = {
      matched: meets,
      score: meets ? WEIGHTS.experience : Math.round(WEIGHTS.experience * Math.min(teacher.years_of_experience / job.experience_min, 1)),
      reason: meets
        ? `${teacher.years_of_experience} yrs meets ${job.experience_min} yr requirement`
        : `${teacher.years_of_experience} yrs below ${job.experience_min} yr requirement`,
    };
  }

  // ── Aggregate ──
  const breakdown = {
    location: locationResult,
    subjects: subjectsD.result,
    curriculums: curriculumsD.result,
    gradeBands: gradeBandsD.result,
    employmentTypes: employmentD.result,
    workArrangements: workArrD.result,
    visaStatus: visaResult,
    languages: languagesD.result,
    certifications: certsD.result,
    experience: experienceResult,
  };

  const score = Object.values(breakdown).reduce((sum, d) => sum + d.score, 0);

  // Confidence based on missing data count
  let confidence: "low" | "medium" | "high";
  if (missingData.length <= 1) confidence = "high";
  else if (missingData.length <= 3) confidence = "medium";
  else confidence = "low";

  return {
    score,
    confidence,
    breakdown,
    missingData,
    matchedTermIds: [...new Set(allMatched)],
    unmatchedTermIds: [...new Set(allUnmatched)],
  };
}

/**
 * Get the top N dimensions by weight that matched or failed.
 * Useful for tooltip summaries showing "3-5 main reasons".
 */
export function getTopReasons(result: MatchResult, count = 5): { label: string; matched: boolean; reason: string }[] {
  const LABELS: Record<string, string> = {
    subjects: "Subjects",
    curriculums: "Curriculums",
    gradeBands: "Grade Bands",
    location: "Location",
    employmentTypes: "Employment",
    workArrangements: "Work Arrangement",
    visaStatus: "Visa Status",
    languages: "Languages",
    certifications: "Certifications",
    experience: "Experience",
  };

  const weightOrder = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];

  return weightOrder
    .filter((key) => {
      const d = result.breakdown[key];
      // Skip dimensions that are "not required" — they're not interesting
      return !d.reason.startsWith("Not required");
    })
    .sort((a, b) => WEIGHTS[b] - WEIGHTS[a])
    .slice(0, count)
    .map((key) => ({
      label: LABELS[key] ?? key,
      matched: result.breakdown[key].matched,
      reason: result.breakdown[key].reason,
    }));
}
