/**
 * Full Data Audit Runner
 * Sprint 8H-C
 *
 * Executes all audit scripts and returns a unified report.
 */

import { auditTaxonomyIntegrity } from "./auditTaxonomyIntegrity";
import { auditRequiredFields } from "./auditRequiredFields";
import { auditForeignKeyIntegrity } from "./auditForeignKeyIntegrity";
import { auditDuplicateRecords } from "./auditDuplicateRecords";
import { auditScoringReadiness } from "./auditScoringReadiness";
import { auditTrainingCatalog } from "./auditTrainingCatalog";
import type { FullAuditReport, AuditResult } from "./auditTypes";

export async function runFullDataAudit(): Promise<FullAuditReport> {
  const audits = await Promise.all([
    auditTaxonomyIntegrity(),
    auditRequiredFields(),
    auditForeignKeyIntegrity(),
    auditDuplicateRecords(),
    auditScoringReadiness(),
    auditTrainingCatalog(),
  ]);

  const allIssues = audits.flatMap((a) => a.issues);
  const allTables = new Set(audits.flatMap((a) => a.tablesChecked));

  return {
    summary: {
      auditsRun: audits.length,
      tablesChecked: allTables.size,
      issuesFound: allIssues.length,
      errorCount: allIssues.filter((i) => i.severity === "error").length,
      warningCount: allIssues.filter((i) => i.severity === "warning").length,
    },
    results: audits,
    issues: allIssues,
    completedAt: new Date().toISOString(),
  };
}
