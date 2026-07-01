/**
 * Data Integrity Audit — Barrel Export
 * Sprint 8H-C
 */

export { runFullDataAudit } from "./runFullDataAudit";
export { auditTaxonomyIntegrity } from "./auditTaxonomyIntegrity";
export { auditRequiredFields } from "./auditRequiredFields";
export { auditForeignKeyIntegrity } from "./auditForeignKeyIntegrity";
export { auditDuplicateRecords } from "./auditDuplicateRecords";
export { auditScoringReadiness } from "./auditScoringReadiness";
export { auditTrainingCatalog } from "./auditTrainingCatalog";

export type { AuditIssue, AuditResult, FullAuditReport, AuditIssueSeverity } from "./auditTypes";
