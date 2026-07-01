/**
 * Foreign Key Integrity Audit
 * Sprint 8H-C
 *
 * Detects orphan child records whose parent no longer exists.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditResult, AuditIssue } from "./auditTypes";

interface FkCheck {
  childTable: string;
  childField: string;
  parentTable: string;
}

const FK_CHECKS: FkCheck[] = [
  { childTable: "applications", childField: "job_id", parentTable: "jobs" },
  { childTable: "applications", childField: "teacher_id", parentTable: "teacher_profiles" },
  { childTable: "interviews", childField: "application_id", parentTable: "applications" },
  { childTable: "interviews", childField: "job_id", parentTable: "jobs" },
  { childTable: "interviews", childField: "teacher_id", parentTable: "teacher_profiles" },
  { childTable: "training_assignments", childField: "assigned_to_teacher_id", parentTable: "teacher_profiles" },
  { childTable: "training_executions", childField: "teacher_id", parentTable: "teacher_profiles" },
  { childTable: "course_progress", childField: "teacher_id", parentTable: "teacher_profiles" },
  { childTable: "earned_credentials", childField: "teacher_id", parentTable: "teacher_profiles" },
  { childTable: "reputation_events", childField: "teacher_id", parentTable: "teacher_profiles" },
  { childTable: "reputation_profiles", childField: "teacher_id", parentTable: "teacher_profiles" },
];

export async function auditForeignKeyIntegrity(): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const tablesChecked = new Set<string>();

  for (const fk of FK_CHECKS) {
    tablesChecked.add(fk.childTable);

    const { data: children } = await supabase
      .from(fk.childTable as any)
      .select(`id, ${fk.childField}`);

    if (!children) continue;

    const { data: parents } = await supabase
      .from(fk.parentTable as any)
      .select("id");

    const parentIds = new Set((parents ?? []).map((p: any) => p.id));

    for (const child of children as any[]) {
      const refId = child[fk.childField];
      if (refId && !parentIds.has(refId)) {
        issues.push({
          table: fk.childTable,
          field: fk.childField,
          issue: "orphan_foreign_key",
          severity: "error",
          recordId: child.id,
          details: { missingParentId: refId, parentTable: fk.parentTable },
        });
      }
    }
  }

  return {
    auditName: "foreign_key_integrity",
    tablesChecked: Array.from(tablesChecked),
    issues,
  };
}
