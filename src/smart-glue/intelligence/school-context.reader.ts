/**
 * School Context Reader — Sprint 4.4 Step 1
 *
 * Aggregates school-level intelligence from canonical snapshot tables.
 * Read-only builder — no decision logic, no recomputation.
 *
 * Sources:
 *   - jobs / applications (hiring counts)
 *   - department_capability_snapshots (workforce)
 *   - intelligence_cri_snapshots (readiness)
 *   - intelligence_verified_state_snapshots (trust)
 *   - training_assignments / training_executions (training)
 *   - school_team_members (team size)
 */

import { supabase } from "@/integrations/supabase/client";

// ── Shape ────────────────────────────────────────────────────

export interface SchoolHiringContext {
  totalOpenJobs: number;
  totalApplicants: number;
  rejectionCount: number;
  averageMatchScore: number | null;
}

export interface SchoolWorkforceContext {
  totalTeachers: number;
  averageCriScore: number | null;
  lowReadinessCount: number;
}

export interface SchoolTrainingContext {
  activeAssignments: number;
  completedTrainings: number;
  teamTrainingCompletionRate: number;
}

export interface SchoolTrustContext {
  verifiedTeachersCount: number;
  totalTeachersWithSnapshots: number;
  verifiedTeachersRatio: number;
  averageVerificationRatio: number;
}

export interface SchoolAggregatedContext {
  schoolId: string;
  available: boolean;
  hiring: SchoolHiringContext;
  workforce: SchoolWorkforceContext;
  training: SchoolTrainingContext;
  trust: SchoolTrustContext;
}

// ── Builder ──────────────────────────────────────────────────

export async function buildSchoolContext(
  schoolId: string,
): Promise<SchoolAggregatedContext> {
  const empty: SchoolAggregatedContext = {
    schoolId,
    available: false,
    hiring: { totalOpenJobs: 0, totalApplicants: 0, rejectionCount: 0, averageMatchScore: null },
    workforce: { totalTeachers: 0, averageCriScore: null, lowReadinessCount: 0 },
    training: { activeAssignments: 0, completedTrainings: 0, teamTrainingCompletionRate: 0 },
    trust: { verifiedTeachersCount: 0, totalTeachersWithSnapshots: 0, verifiedTeachersRatio: 0, averageVerificationRatio: 0 },
  };

  try {
    const [
      openJobsResult,
      applicantsResult,
      rejectionsResult,
      matchResult,
      teamResult,
      deptResult,
      assignmentsResult,
      completedResult,
      totalAssignmentsResult,
      verifiedResult,
    ] = await Promise.all([
      // Hiring: open jobs
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", "published"),

      // Hiring: total applicants across school jobs
      supabase
        .from("applications")
        .select("id, jobs!inner(school_id)", { count: "exact", head: true })
        .eq("jobs.school_id", schoolId),

      // Hiring: rejection count
      supabase
        .from("applications")
        .select("id, jobs!inner(school_id)", { count: "exact", head: true })
        .eq("jobs.school_id", schoolId)
        .eq("status", "rejected"),

      // Hiring: average match score from snapshots
      supabase
        .from("intelligence_match_snapshots")
        .select("score, jobs!inner(school_id)")
        .eq("jobs.school_id", schoolId),

      // Workforce: team size
      supabase
        .from("school_team_members")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),

      // Workforce: department capability (CRI averages)
      supabase
        .from("department_capability_snapshots")
        .select("average_cri_score, teacher_count")
        .eq("school_id", schoolId),

      // Training: active assignments
      supabase
        .from("training_assignments")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("status", ["assigned", "in_progress"]),

      // Training: completed executions
      supabase
        .from("training_executions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("execution_status", "completed"),

      // Training: total executions (for completion rate)
      supabase
        .from("training_executions")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("execution_status", ["assigned", "active", "completed"]),

      // Trust: verified state snapshots for school team members
      supabase
        .from("intelligence_verified_state_snapshots")
        .select("verified_count, total_count, overall_status"),
    ]);

    // ── Derive workforce CRI from department snapshots ──
    const deptRows = deptResult.data ?? [];
    let totalWeightedCri = 0;
    let totalTeacherCount = 0;
    for (const dept of deptRows) {
      totalWeightedCri += dept.average_cri_score * dept.teacher_count;
      totalTeacherCount += dept.teacher_count;
    }
    const averageCriScore = totalTeacherCount > 0
      ? Math.round((totalWeightedCri / totalTeacherCount) * 100) / 100
      : null;

    // Low readiness: departments with avg CRI < 40
    const lowReadinessCount = deptRows.filter(d => d.average_cri_score < 40).length;

    // ── Derive match average ──
    const matchRows = matchResult.data ?? [];
    const averageMatchScore = matchRows.length > 0
      ? Math.round((matchRows.reduce((sum, m) => sum + (m.score ?? 0), 0) / matchRows.length) * 100) / 100
      : null;

    // ── Training completion rate ──
    const completedCount = completedResult.count ?? 0;
    const totalExecCount = totalAssignmentsResult.count ?? 0;
    const teamTrainingCompletionRate = totalExecCount > 0
      ? Math.round((completedCount / totalExecCount) * 100) / 100
      : 0;

    // ── Trust: verified ratio ──
    const verifiedRows = verifiedResult.data ?? [];
    const verifiedTeachersCount = verifiedRows.filter(v => v.overall_status === "full").length;
    const totalWithSnapshots = verifiedRows.length;
    const verifiedTeachersRatio = totalWithSnapshots > 0
      ? Math.round((verifiedTeachersCount / totalWithSnapshots) * 100) / 100
      : 0;
    const totalVerified = verifiedRows.reduce((s, v) => s + (v.verified_count ?? 0), 0);
    const totalCredentials = verifiedRows.reduce((s, v) => s + (v.total_count ?? 0), 0);
    const averageVerificationRatio = totalCredentials > 0
      ? Math.round((totalVerified / totalCredentials) * 100) / 100
      : 0;

    return {
      schoolId,
      available: true,
      hiring: {
        totalOpenJobs: openJobsResult.count ?? 0,
        totalApplicants: applicantsResult.count ?? 0,
        rejectionCount: rejectionsResult.count ?? 0,
        averageMatchScore,
      },
      workforce: {
        totalTeachers: teamResult.count ?? 0,
        averageCriScore,
        lowReadinessCount,
      },
      training: {
        activeAssignments: assignmentsResult.count ?? 0,
        completedTrainings: completedCount,
        teamTrainingCompletionRate,
      },
      trust: {
        verifiedTeachersCount,
        totalTeachersWithSnapshots: totalWithSnapshots,
        verifiedTeachersRatio,
        averageVerificationRatio,
      },
    };
  } catch (err) {
    console.warn("[SmartGlue:SchoolContext] Read failed:", err);
    return empty;
  }
}
