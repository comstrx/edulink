/**
 * Mobility Signals Builder — Sprint 8C
 *
 * Derives hiring-visible mobility signals from teacher_mobility_states.
 */

import type { MobilitySignal, TeacherMobilityState } from "../types/mobility.types";

export function buildMobilitySignals(states: TeacherMobilityState[]): MobilitySignal[] {
  return states
    .filter((s) => s.readinessPercent >= 40)
    .sort((a, b) => b.readinessPercent - a.readinessPercent)
    .map((s) => ({
      key: `mobility_${s.targetId}`,
      label: s.readinessPercent >= 75
        ? `Ready for ${s.targetName}`
        : `Emerging ${s.targetName} candidate`,
      readinessPercent: s.readinessPercent,
      active: s.readinessPercent >= 60,
    }));
}
