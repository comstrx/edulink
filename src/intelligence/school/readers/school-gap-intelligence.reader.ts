/**
 * School Gap Intelligence Reader — Sprint 2
 *
 * Aggregates gap patterns across a school's team using existing snapshots.
 * No new scoring — pure aggregation of intelligence_talent_profiles.
 *
 * Sources (read-only):
 *   - school_members (identity/membership)
 *   - teacher_profiles (user→teacher mapping)
 *   - intelligence_talent_profiles (gap_categories, unresolved_gap_count, readiness_level)
 */

import { supabase } from "@/integrations/supabase/client";
import type { SchoolTeamGapIntelligence } from "../types/school-gap-intelligence.types";

// ── Gap category key → human label (shared with team-detailed reader) ──
const GAP_CATEGORY_LABELS: Record<string, string> = {
  skill_deficit: "Skills",
  certification_gap: "Certification",
  experience_gap: "Experience",
  qualification_gap: "Qualifications",
  language_gap: "Language",
  curriculum_gap: "Curriculum",
  subject_gap: "Subject Knowledge",
};

function humanizeGapCategory(key: string): string {
  return GAP_CATEGORY_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getSchoolTeamGapIntelligence(
  schoolId: string,
): Promise<SchoolTeamGapIntelligence> {
  const empty: SchoolTeamGapIntelligence = {
    schoolId,
    totalTeachers: 0,
    teachersWithGaps: 0,
    totalGaps: 0,
    gapDistribution: [],
    topGapCategory: null,
    criticalGapCategory: null,
    computedAt: new Date().toISOString(),
  };

  try {
    // 1. Get active school members
    const { data: members, error: membersError } = await supabase
      .from("school_members")
      .select("user_id")
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (membersError) throw membersError;
    if (!members || members.length === 0) return empty;

    // 2. Map to teacher_profile IDs
    const userIds = members.map((m) => m.user_id).filter(Boolean);
    const { data: teacherProfiles } = await supabase
      .from("teacher_profiles")
      .select("id")
      .in("user_id", userIds);

    const teacherIds = (teacherProfiles ?? []).map((tp) => tp.id);
    if (teacherIds.length === 0) return { ...empty, totalTeachers: members.length };

    // 3. Batch fetch talent profiles (gap data)
    const { data: talentRows } = await supabase
      .from("intelligence_talent_profiles")
      .select("teacher_id, unresolved_gap_count, gap_categories, readiness_level")
      .in("teacher_id", teacherIds);

    const talents = talentRows ?? [];
    const totalTeachers = members.length;

    // 4. Aggregate
    let totalGaps = 0;
    let teachersWithGaps = 0;
    const categoryFrequency = new Map<string, number>();
    const criticalCategoryFrequency = new Map<string, number>();

    for (const t of talents) {
      const gapCount = t.unresolved_gap_count ?? 0;
      const categories = (t.gap_categories as string[]) ?? [];

      if (gapCount > 0) {
        teachersWithGaps++;
        totalGaps += gapCount;
      }

      for (const cat of categories) {
        categoryFrequency.set(cat, (categoryFrequency.get(cat) ?? 0) + 1);

        // Track critical separately (readiness_level = "early" maps to critical)
        if (t.readiness_level === "early") {
          criticalCategoryFrequency.set(cat, (criticalCategoryFrequency.get(cat) ?? 0) + 1);
        }
      }
    }

    // 5. Build distribution sorted by count desc
    const denominator = Math.max(teachersWithGaps, 1);
    const gapDistribution = Array.from(categoryFrequency.entries())
      .map(([key, count]) => ({
        category: humanizeGapCategory(key),
        count,
        percentage: Math.round((count / denominator) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // 6. Top & critical categories
    const topGapCategory = gapDistribution.length > 0 ? gapDistribution[0].category : null;

    let criticalGapCategory: string | null = null;
    if (criticalCategoryFrequency.size > 0) {
      let maxCount = 0;
      let maxKey = "";
      for (const [key, count] of criticalCategoryFrequency) {
        if (count > maxCount) {
          maxCount = count;
          maxKey = key;
        }
      }
      criticalGapCategory = humanizeGapCategory(maxKey);
    }

    return {
      schoolId,
      totalTeachers,
      teachersWithGaps,
      totalGaps,
      gapDistribution: gapDistribution.slice(0, 5),
      topGapCategory,
      criticalGapCategory,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[SchoolGapIntelligence] Read failed:", err);
    return empty;
  }
}
