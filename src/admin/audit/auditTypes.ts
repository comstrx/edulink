/**
 * Data Integrity Audit — Shared Types
 * Sprint 8H-C
 */

export type AuditIssueSeverity = "error" | "warning" | "info";

export interface AuditIssue {
  table: string;
  field?: string;
  issue: string;
  severity: AuditIssueSeverity;
  recordId?: string;
  details?: Record<string, unknown>;
}

export interface AuditResult {
  auditName: string;
  tablesChecked: string[];
  issues: AuditIssue[];
}

export interface FullAuditReport {
  summary: {
    auditsRun: number;
    tablesChecked: number;
    issuesFound: number;
    errorCount: number;
    warningCount: number;
  };
  results: AuditResult[];
  issues: AuditIssue[];
  completedAt: string;
}
