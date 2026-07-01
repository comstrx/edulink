/**
 * Duplicate Record Detection Audit
 * Sprint 8H-C
 *
 * Detects logically duplicate rows based on composite keys.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditResult, AuditIssue } from "./auditTypes";

interface DuplicateCheck {
  table: string;
  selectFields: string;
  compositeKeys: string[];
}

const DUPLICATE_CHECKS: DuplicateCheck[] = [
  {
    table: "teacher_certifications",
    selectFields: "id, teacher_id, certification_term_id",
    compositeKeys: ["teacher_id", "certification_term_id"],
  },
  {
    table: "teacher_skills",
    selectFields: "id, teacher_id, skill_term_id",
    compositeKeys: ["teacher_id", "skill_term_id"],
  },
  {
    table: "teacher_languages",
    selectFields: "id, teacher_id, language_term_id",
    compositeKeys: ["teacher_id", "language_term_id"],
  },
  {
    table: "school_follows",
    selectFields: "id, teacher_user_id, school_id",
    compositeKeys: ["teacher_user_id", "school_id"],
  },
  {
    table: "saved_candidates",
    selectFields: "id, school_user_id, teacher_profile_id",
    compositeKeys: ["school_user_id", "teacher_profile_id"],
  },
];

export async function auditDuplicateRecords(): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const tablesChecked: string[] = [];

  for (const check of DUPLICATE_CHECKS) {
    tablesChecked.push(check.table);

    const { data, error } = await supabase
      .from(check.table as any)
      .select(check.selectFields);

    if (error || !data) continue;

    const seen = new Map<string, string>();

    for (const row of data as any[]) {
      const key = check.compositeKeys.map((k) => row[k] ?? "").join("|");

      if (seen.has(key)) {
        issues.push({
          table: check.table,
          issue: "duplicate_record",
          severity: "warning",
          recordId: row.id,
          details: {
            duplicateOf: seen.get(key),
            compositeKey: Object.fromEntries(check.compositeKeys.map((k) => [k, row[k]])),
          },
        });
      } else {
        seen.set(key, row.id);
      }
    }
  }

  return { auditName: "duplicate_records", tablesChecked, issues };
}
