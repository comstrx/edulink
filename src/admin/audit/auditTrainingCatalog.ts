/**
 * Training Catalog Integrity Audit
 * Sprint 8H-C
 *
 * Validates training items, packages, and pathways for structural correctness.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AuditResult, AuditIssue } from "./auditTypes";

export async function auditTrainingCatalog(): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const tablesChecked = ["training_items", "training_package_items"];

  // 1. Courses without skill mappings
  const { data: items } = await supabase
    .from("training_items")
    .select("id, type, skill_term_ids, competency_domain_term_ids, status");

  if (items) {
    for (const item of items as any[]) {
      if (item.type === "course") {
        if (!item.skill_term_ids || item.skill_term_ids.length === 0) {
          issues.push({
            table: "training_items",
            field: "skill_term_ids",
            issue: "course_without_skill_mapping",
            severity: "warning",
            recordId: item.id,
          });
        }
        if (!item.competency_domain_term_ids || item.competency_domain_term_ids.length === 0) {
          issues.push({
            table: "training_items",
            field: "competency_domain_term_ids",
            issue: "course_without_competency_domain",
            severity: "warning",
            recordId: item.id,
          });
        }
      }
    }
  }

  // 2. Package items referencing missing courses
  const { data: pkgItems } = await supabase
    .from("training_package_items")
    .select("id, package_id, course_id");

  if (pkgItems && items) {
    const itemIds = new Set((items as any[]).map((i) => i.id));
    for (const pi of pkgItems as any[]) {
      if (!itemIds.has(pi.course_id)) {
        issues.push({
          table: "training_package_items",
          field: "course_id",
          issue: "package_references_missing_course",
          severity: "error",
          recordId: pi.id,
          details: { packageId: pi.package_id, missingCourseId: pi.course_id },
        });
      }
    }
  }

  // 3. Pathways with empty milestones
  if (items) {
    for (const item of items as any[]) {
      if (item.type === "pathway") {
        // Pathways store milestones in JSONB; we check via pathway_executions if any exist
        // For catalog-level: just flag if status is published but missing skill mappings
        if (item.status === "published" && (!item.skill_term_ids || item.skill_term_ids.length === 0)) {
          issues.push({
            table: "training_items",
            field: "skill_term_ids",
            issue: "published_pathway_without_skill_mapping",
            severity: "warning",
            recordId: item.id,
          });
        }
      }
    }
  }

  return { auditName: "training_catalog", tablesChecked, issues };
}
