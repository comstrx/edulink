/**
 * Taxonomy Integrity Audit
 * Sprint 8H-C
 *
 * Detects orphan taxonomy references across teacher profiles, jobs, and training items.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditResult, AuditIssue } from "./auditTypes";

interface TaxonomyArrayCheck {
  table: string;
  field: string;
  selectFields: string;
}

const TAXONOMY_ARRAY_CHECKS: TaxonomyArrayCheck[] = [
  { table: "teacher_profiles", field: "subject_ids", selectFields: "id, subject_ids" },
  { table: "teacher_profiles", field: "curriculum_ids", selectFields: "id, curriculum_ids" },
  { table: "teacher_profiles", field: "grade_band_ids", selectFields: "id, grade_band_ids" },
  { table: "teacher_profiles", field: "language_ids", selectFields: "id, language_ids" },
  { table: "teacher_profiles", field: "certification_ids", selectFields: "id, certification_ids" },
  { table: "jobs", field: "subject_term_ids", selectFields: "id, subject_term_ids" },
  { table: "jobs", field: "curriculum_term_ids", selectFields: "id, curriculum_term_ids" },
  { table: "jobs", field: "grade_band_term_ids", selectFields: "id, grade_band_term_ids" },
  { table: "jobs", field: "certification_term_ids", selectFields: "id, certification_term_ids" },
  { table: "jobs", field: "language_term_ids", selectFields: "id, language_term_ids" },
  { table: "training_items", field: "skill_term_ids", selectFields: "id, skill_term_ids" },
  { table: "training_items", field: "competency_domain_term_ids", selectFields: "id, competency_domain_term_ids" },
  { table: "training_items", field: "subject_term_ids", selectFields: "id, subject_term_ids" },
  { table: "training_items", field: "curriculum_term_ids", selectFields: "id, curriculum_term_ids" },
];

async function loadValidTermIds(): Promise<Set<string>> {
  const { data } = await supabase.from("taxonomy_terms").select("id");
  return new Set((data ?? []).map((t) => t.id));
}

export async function auditTaxonomyIntegrity(): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const tablesChecked = new Set<string>();
  const validIds = await loadValidTermIds();

  for (const check of TAXONOMY_ARRAY_CHECKS) {
    tablesChecked.add(check.table);
    const { data, error } = await supabase
      .from(check.table as any)
      .select(check.selectFields);

    if (error || !data) continue;

    for (const row of data as any[]) {
      const ids: string[] | null = row[check.field];
      if (!ids || !Array.isArray(ids)) continue;

      for (const id of ids) {
        if (!id || typeof id !== "string") {
          issues.push({
            table: check.table,
            field: check.field,
            issue: "invalid_taxonomy_id",
            severity: "error",
            recordId: row.id,
            details: { invalidValue: id },
          });
        } else if (!validIds.has(id)) {
          issues.push({
            table: check.table,
            field: check.field,
            issue: "orphan_taxonomy_reference",
            severity: "error",
            recordId: row.id,
            details: { missingTermId: id },
          });
        }
      }
    }
  }

  return {
    auditName: "taxonomy_integrity",
    tablesChecked: Array.from(tablesChecked),
    issues,
  };
}
