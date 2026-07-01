/**
 * Scoring Readiness Audit
 * Sprint 8H-C
 *
 * Verifies that teacher profiles have the data required by CRI, Matching, and Reputation engines.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditResult, AuditIssue } from "./auditTypes";

interface ReadinessField {
  field: string;
  engine: string;
  isArray?: boolean;
}

const READINESS_FIELDS: ReadinessField[] = [
  // CRI
  { field: "years_of_experience", engine: "cri" },
  { field: "certification_ids", engine: "cri", isArray: true },
  { field: "language_ids", engine: "cri", isArray: true },

  // Matching
  { field: "subject_ids", engine: "matching", isArray: true },
  { field: "curriculum_ids", engine: "matching", isArray: true },
  { field: "grade_band_ids", engine: "matching", isArray: true },
  { field: "country_id", engine: "matching" },

  // Reputation (experience reuse)
  { field: "years_of_experience", engine: "reputation" },
];

export async function auditScoringReadiness(): Promise<AuditResult> {
  const issues: AuditIssue[] = [];

  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("id, years_of_experience, certification_ids, language_ids, subject_ids, curriculum_ids, grade_band_ids, country_id");

  if (error || !data) {
    return { auditName: "scoring_readiness", tablesChecked: ["teacher_profiles"], issues };
  }

  // deduplicate field+engine combos
  const seen = new Set<string>();

  for (const row of data as any[]) {
    for (const rf of READINESS_FIELDS) {
      const key = `${row.id}|${rf.field}|${rf.engine}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const val = row[rf.field];
      const missing =
        val == null ||
        (rf.isArray && Array.isArray(val) && val.length === 0) ||
        (typeof val === "number" && val <= 0);

      if (missing) {
        issues.push({
          table: "teacher_profiles",
          field: rf.field,
          issue: `${rf.engine}_readiness_incomplete`,
          severity: "warning",
          recordId: row.id,
        });
      }
    }
  }

  return { auditName: "scoring_readiness", tablesChecked: ["teacher_profiles"], issues };
}
