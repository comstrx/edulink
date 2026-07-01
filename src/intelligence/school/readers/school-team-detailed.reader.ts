/**
 * School Team Detailed Intelligence Reader — Sprint 1
 *
 * Per-teacher intelligence aggregation for the school team view.
 * Batch-fetches all teachers in a school and joins snapshot data.
 *
 * Sources (read-only):
 *   - school_members + profiles (identity)
 *   - intelligence_talent_profiles (CRI, readiness, gaps)
 *   - intelligence_verified_state_snapshots (verification)
 *   - training_assignments (training status)
 *
 * No N+1 queries — all data loaded in parallel batch queries.
 * No new scoring — uses canonical CRI banding and snapshot values.
 */

import { supabase } from "@/integrations/supabase/client";
import { mapCriScoreToBand, type CanonicalCriBand } from "@/intelligence/shared/cri-band.utils";
import type {
  SchoolTeacherIntelligence,
  SchoolTeamDetailedIntelligence,
  TeacherVerificationStatus,
  TeacherTrainingStatus,
  TeacherReadinessLevel,
} from "../types/school-teacher-intelligence.types";

// ── Gap category key → human label mapping ──
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

// ── Derive readiness from banded CRI + gaps ──
function deriveReadiness(
  band: CanonicalCriBand,
  gapCount: number,
  verification: TeacherVerificationStatus,
): TeacherReadinessLevel {
  if (band === "not_ready" || gapCount > 3) return "critical";
  if (band === "emerging" || gapCount > 1 || verification === "not_verified") return "needs_improvement";
  return "ready";
}

// ── Attention flag ──
function computeNeedsAttention(
  band: CanonicalCriBand,
  gapCount: number,
  trainingStatus: TeacherTrainingStatus,
  verification: TeacherVerificationStatus,
  hasOverdue: boolean,
): boolean {
  if (band === "not_ready") return true;
  if (gapCount > 2) return true;
  if (trainingStatus === "in_progress" && hasOverdue) return true;
  if (verification === "not_verified") return true;
  return false;
}

export async function getSchoolTeamIntelligenceDetailed(
  schoolId: string,
): Promise<SchoolTeamDetailedIntelligence> {
  const empty: SchoolTeamDetailedIntelligence = {
    schoolId,
    teachers: [],
    computedAt: new Date().toISOString(),
  };

  try {
    // 1. Get all school members with profile info
    const { data: members, error: membersError } = await supabase
      .from("school_members")
      .select(`
        id, user_id, role_key, status,
        profiles!school_members_user_id_fkey ( full_name, email, avatar_url )
      `)
      .eq("school_id", schoolId)
      .eq("status", "active");

    if (membersError) throw membersError;
    if (!members || members.length === 0) return empty;

    // 2. Map user_ids to teacher_profile_ids
    const userIds = members.map((m) => m.user_id).filter(Boolean);
    const { data: teacherProfiles } = await supabase
      .from("teacher_profiles")
      .select("id, user_id")
      .in("user_id", userIds);

    const userToTeacher = new Map<string, string>();
    for (const tp of teacherProfiles ?? []) {
      userToTeacher.set(tp.user_id, tp.id);
    }

    const teacherIds = [...userToTeacher.values()];
    if (teacherIds.length === 0) {
      // Members exist but none have teacher profiles — return basic list
      return {
        schoolId,
        teachers: members.map((m) => ({
          teacherId: m.user_id,
          name: (m.profiles as any)?.full_name ?? (m.profiles as any)?.email ?? "Unknown",
          email: (m.profiles as any)?.email ?? null,
          avatarUrl: (m.profiles as any)?.avatar_url ?? null,
          roleKey: m.role_key,
          bandedCRI: "not_ready" as CanonicalCriBand,
          verificationStatus: "not_verified" as TeacherVerificationStatus,
          trainingStatus: "not_started" as TeacherTrainingStatus,
          activeTrainingCount: 0,
          gapSummary: { gapCount: 0, topGapArea: null },
          readinessLevel: "needs_improvement" as TeacherReadinessLevel,
          needsAttention: false,
        })),
        computedAt: new Date().toISOString(),
      };
    }

    // 3. Batch fetch all intelligence data in parallel
    const now = new Date().toISOString();
    const [talentRes, verifiedRes, assignmentsRes] = await Promise.all([
      // Talent profiles: CRI, readiness, gaps
      supabase
        .from("intelligence_talent_profiles")
        .select("teacher_id, cri_score, readiness_level, unresolved_gap_count, gap_categories")
        .in("teacher_id", teacherIds),

      // Verification status
      supabase
        .from("intelligence_verified_state_snapshots")
        .select("teacher_id, overall_status")
        .in("teacher_id", teacherIds),

      // Training assignments for this school
      supabase
        .from("training_assignments")
        .select("id, assigned_to_teacher_id, status, due_date")
        .eq("school_id", schoolId)
        .in("assigned_to_teacher_id", teacherIds),
    ]);

    // 4. Build lookup maps (no N+1)
    const talentMap = new Map<string, {
      criScore: number;
      readinessLevel: string;
      gapCount: number;
      gapCategories: string[];
    }>();
    for (const t of talentRes.data ?? []) {
      talentMap.set(t.teacher_id, {
        criScore: t.cri_score ?? 0,
        readinessLevel: t.readiness_level ?? "early",
        gapCount: t.unresolved_gap_count ?? 0,
        gapCategories: (t.gap_categories as string[]) ?? [],
      });
    }

    const verifiedMap = new Map<string, string>();
    for (const v of verifiedRes.data ?? []) {
      verifiedMap.set(v.teacher_id, v.overall_status);
    }

    // Training: group by teacher
    const trainingByTeacher = new Map<string, {
      active: number;
      completed: number;
      hasOverdue: boolean;
    }>();
    for (const a of assignmentsRes.data ?? []) {
      const tid = a.assigned_to_teacher_id;
      if (!trainingByTeacher.has(tid)) {
        trainingByTeacher.set(tid, { active: 0, completed: 0, hasOverdue: false });
      }
      const entry = trainingByTeacher.get(tid)!;
      if (a.status === "assigned" || a.status === "in_progress") {
        entry.active++;
        if (a.due_date && a.due_date < now) {
          entry.hasOverdue = true;
        }
      } else if (a.status === "completed" || a.status === "certified") {
        entry.completed++;
      }
    }

    // 5. Assemble per-teacher intelligence
    const teachers: SchoolTeacherIntelligence[] = members.map((m) => {
      const teacherId = userToTeacher.get(m.user_id);
      const profile = m.profiles as any;
      const name = profile?.full_name || profile?.email || "Unknown";
      const email = profile?.email ?? null;
      const avatarUrl = profile?.avatar_url ?? null;

      if (!teacherId) {
        return {
          teacherId: m.user_id,
          name,
          email,
          avatarUrl,
          roleKey: m.role_key,
          bandedCRI: "not_ready" as CanonicalCriBand,
          verificationStatus: "not_verified" as TeacherVerificationStatus,
          trainingStatus: "not_started" as TeacherTrainingStatus,
          activeTrainingCount: 0,
          gapSummary: { gapCount: 0, topGapArea: null },
          readinessLevel: "needs_improvement" as TeacherReadinessLevel,
          needsAttention: false,
        };
      }

      const talent = talentMap.get(teacherId);
      const bandedCRI = mapCriScoreToBand(talent?.criScore ?? 0);

      const verStatus = verifiedMap.get(teacherId);
      const verificationStatus: TeacherVerificationStatus =
        verStatus === "full" ? "verified" :
        verStatus === "partial" ? "partial" :
        "not_verified";

      const training = trainingByTeacher.get(teacherId);
      const trainingStatus: TeacherTrainingStatus =
        training?.active && training.active > 0 ? "in_progress" :
        training?.completed && training.completed > 0 ? "completed" :
        "not_started";
      const activeTrainingCount = training?.active ?? 0;

      const gapCount = talent?.gapCount ?? 0;
      const topGapArea = talent?.gapCategories?.[0]
        ? humanizeGapCategory(talent.gapCategories[0])
        : null;

      const readinessLevel = deriveReadiness(bandedCRI, gapCount, verificationStatus);

      const needsAttention = computeNeedsAttention(
        bandedCRI,
        gapCount,
        trainingStatus,
        verificationStatus,
        training?.hasOverdue ?? false,
      );

      return {
        teacherId,
        name,
        email,
        avatarUrl,
        roleKey: m.role_key,
        bandedCRI,
        verificationStatus,
        trainingStatus,
        activeTrainingCount,
        gapSummary: { gapCount, topGapArea },
        readinessLevel,
        needsAttention,
      };
    });

    // Sort: needsAttention first, then by CRI band severity
    const bandOrder: Record<CanonicalCriBand, number> = {
      not_ready: 0,
      emerging: 1,
      strong: 2,
      highly_ready: 3,
    };
    teachers.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      return bandOrder[a.bandedCRI] - bandOrder[b.bandedCRI];
    });

    return {
      schoolId,
      teachers,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[SchoolTeamDetailed] Read failed:", err);
    return empty;
  }
}
