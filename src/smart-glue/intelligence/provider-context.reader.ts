/**
 * Provider Context Reader — Sprint 4.5 Step 1
 *
 * Aggregates provider-level training item intelligence for gap-aligned
 * recommendation targeting. Read-only builder — no ranking, no filtering.
 *
 * Sources:
 *   - training_items (catalog metadata: skills, competencies, CRI boost)
 *   - providers (status, active check)
 *
 * Links courses to gaps via competency/skill term IDs.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Shape ────────────────────────────────────────────────────

export interface ProviderCourseContext {
  courseId: string;
  providerId: string;
  title: string;
  /** Skill + competency term IDs this course covers */
  competencyTermIds: string[];
  /** Subject term IDs */
  subjectTermIds: string[];
  /** CRI boost value if completed */
  criBoostValue: number | null;
  /** CRI target score this course aims for */
  criTarget: number | null;
  /** Duration in hours */
  durationHours: number | null;
  /** Whether course grants a credential */
  credentialEligible: boolean;
  /** Whether course has micro-assessment */
  hasMicroAssessment: boolean;
}

export interface ProviderAggregatedContext {
  providerId: string;
  available: boolean;
  providerStatus: string | null;
  totalCourses: number;
  courses: ProviderCourseContext[];
  /** All unique competency term IDs covered by this provider's courses */
  coveredCompetencyTermIds: string[];
  /** All unique subject term IDs */
  coveredSubjectTermIds: string[];
}

// ── Builder ──────────────────────────────────────────────────

/**
 * Build context for a single provider's published, active courses.
 * No filtering by gap alignment — that's for the decision layer.
 */
export async function buildProviderContext(
  providerId: string,
): Promise<ProviderAggregatedContext> {
  const empty: ProviderAggregatedContext = {
    providerId,
    available: false,
    providerStatus: null,
    totalCourses: 0,
    courses: [],
    coveredCompetencyTermIds: [],
    coveredSubjectTermIds: [],
  };

  try {
    const [providerResult, coursesResult] = await Promise.all([
      supabase
        .from("providers")
        .select("status")
        .eq("id", providerId)
        .maybeSingle(),

      supabase
        .from("training_items")
        .select("id, title, provider_id, skill_term_ids, subject_term_ids, cri_boost_value, cri_target, duration_hours, credential_eligible, micro_assessment")
        .eq("provider_id", providerId)
        .eq("status", "published")
        .eq("is_active", true)
        .eq("review_status", "approved"),
    ]);

    const providerStatus = providerResult.data?.status ?? null;
    const rows = coursesResult.data ?? [];

    const courses: ProviderCourseContext[] = rows.map((row) => {
      const skillIds = Array.isArray(row.skill_term_ids) ? row.skill_term_ids : [];
      const subjectIds = Array.isArray(row.subject_term_ids) ? row.subject_term_ids : [];

      return {
        courseId: row.id,
        providerId,
        title: row.title,
        competencyTermIds: skillIds,
        subjectTermIds: subjectIds,
        criBoostValue: row.cri_boost_value ?? null,
        criTarget: row.cri_target ?? null,
        durationHours: row.duration_hours ?? null,
        credentialEligible: row.credential_eligible ?? false,
        hasMicroAssessment: row.micro_assessment ?? false,
      };
    });

    // Aggregate unique term coverage
    const allCompetencyIds = new Set<string>();
    const allSubjectIds = new Set<string>();
    for (const c of courses) {
      for (const id of c.competencyTermIds) allCompetencyIds.add(id);
      for (const id of c.subjectTermIds) allSubjectIds.add(id);
    }

    return {
      providerId,
      available: true,
      providerStatus,
      totalCourses: courses.length,
      courses,
      coveredCompetencyTermIds: [...allCompetencyIds],
      coveredSubjectTermIds: [...allSubjectIds],
    };
  } catch (err) {
    console.warn("[SmartGlue:ProviderContext] Read failed:", err);
    return empty;
  }
}

/**
 * Build context for multiple providers at once (batch).
 * Useful when evaluating gap-aligned recommendations across providers.
 */
export async function buildMultiProviderContext(
  providerIds: string[],
): Promise<ProviderAggregatedContext[]> {
  if (providerIds.length === 0) return [];
  return Promise.all(providerIds.map(buildProviderContext));
}
