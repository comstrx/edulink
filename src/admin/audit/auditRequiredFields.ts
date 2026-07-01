/**
 * Required Fields Audit
 * Sprint 8H-C
 *
 * Detects records missing critical fields needed for platform operation.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditResult, AuditIssue } from "./auditTypes";

interface FieldRequirement {
  table: string;
  selectFields: string;
  requiredFields: { field: string; isArray?: boolean }[];
}

const REQUIREMENTS: FieldRequirement[] = [
  {
    table: "teacher_profiles",
    selectFields: "id, subject_ids, curriculum_ids, grade_band_ids, language_ids",
    requiredFields: [
      { field: "subject_ids", isArray: true },
      { field: "curriculum_ids", isArray: true },
      { field: "grade_band_ids", isArray: true },
      { field: "language_ids", isArray: true },
    ],
  },
  {
    table: "jobs",
    selectFields: "id, subject_term_ids, curriculum_term_ids, country_term_id, employment_type_term_ids",
    requiredFields: [
      { field: "subject_term_ids", isArray: true },
      { field: "curriculum_term_ids", isArray: true },
      { field: "country_term_id" },
      { field: "employment_type_term_ids", isArray: true },
    ],
  },
  {
    table: "training_items",
    selectFields: "id, type, skill_term_ids, competency_domain_term_ids",
    requiredFields: [
      { field: "type" },
      { field: "skill_term_ids", isArray: true },
      { field: "competency_domain_term_ids", isArray: true },
    ],
  },
];

export async function auditRequiredFields(): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const tablesChecked: string[] = [];

  for (const req of REQUIREMENTS) {
    tablesChecked.push(req.table);
    const { data, error } = await supabase
      .from(req.table as any)
      .select(req.selectFields);

    if (error || !data) continue;

    for (const row of data as any[]) {
      for (const rf of req.requiredFields) {
        const val = row[rf.field];
        const missing =
          val == null ||
          (rf.isArray && Array.isArray(val) && val.length === 0) ||
          (typeof val === "string" && val.trim() === "");

        if (missing) {
          issues.push({
            table: req.table,
            field: rf.field,
            issue: "missing_required_field",
            severity: "warning",
            recordId: row.id,
          });
        }
      }
    }
  }

  return { auditName: "required_fields", tablesChecked, issues };
}
