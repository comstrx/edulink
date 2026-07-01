/**
 * hiring-signals.ts — Append-only hiring signal writer.
 *
 * Phase 4.4 — Hiring Signals Layer.
 *
 * Signals are passive observations of successful hiring actions.
 * They do NOT control workflows, mutate source entities, or drive UI state.
 *
 * Signal creation must never block or break the original successful action.
 */

import { supabase } from "@/integrations/supabase/client";

import type { Json } from "@/integrations/supabase/types";

export type HiringSignalType =
  | "application_submitted"
  | "application_withdrawn"
  | "application_rejected"
  | "application_stage_changed"
  | "interview_scheduled"
  | "interview_updated"
  | "interview_cancelled"
  | "candidate_hired";

export interface HiringSignalInput {
  signalType: HiringSignalType;
  actorType: "teacher" | "school" | "system";
  actorId?: string;
  teacherId?: string;
  schoolId?: string;
  jobId?: string;
  applicationId?: string;
  interviewId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a single hiring signal. Fire-and-forget — never throws.
 *
 * Must be called only AFTER the original mutation has succeeded.
 * If the insert fails, the error is logged and swallowed.
 */
export async function createHiringSignal(input: HiringSignalInput): Promise<void> {
  try {
    const { error } = await supabase.from("hiring_signals").insert([{
      signal_type: input.signalType,
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      teacher_id: input.teacherId ?? null,
      school_id: input.schoolId ?? null,
      job_id: input.jobId ?? null,
      application_id: input.applicationId ?? null,
      interview_id: input.interviewId ?? null,
      metadata: (input.metadata ?? null) as Json,
    }]);

    if (error) {
      console.warn("[hiring-signals] failed to write signal", {
        signalType: input.signalType,
        error: error.message,
      });
    }
  } catch (err: unknown) {
    console.warn("[hiring-signals] unexpected error", {
      signalType: input.signalType,
      error: err instanceof Error ? err.message : "Unknown",
    });
  }
}
