/**
 * Engine Debug — Types
 *
 * Structured records for inspecting engine inputs/outputs.
 * In-memory only — no DB persistence.
 *
 * Phase 10A.4
 */

export interface EngineDebugRecord {
  traceId: string;
  engineName: string;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown>;
  reasonCodes: string[];
  timestamp: string;
  durationMs: number;
}
