/**
 * ApplicantIntelligenceRow — Intelligence badges for a single applicant
 *
 * Wraps Match, CRI, Verified, and Gap badges for a teacher×job pair.
 * Uses exposure-aware hooks to enforce audience-based access rules.
 * Presentation-only — consumes stable snapshots via exposure layer.
 *
 * Phase 4.1 — Exposure-governed
 */

import {
  useExposedMatch,
  useExposedCri,
  useExposedGap,
  useExposedVerification,
} from "@/intelligence/exposure/hooks/useExposedIntelligence";
import { useTeacherJobMatchSnapshot } from "@/intelligence/consumption/hooks/useTeacherJobMatchSnapshot";
import { useTeacherCriSnapshot } from "@/intelligence/consumption/hooks/useTeacherCriSnapshot";
import { useTeacherGapSnapshot } from "@/intelligence/consumption/hooks/useTeacherGapSnapshot";
import { useTeacherVerifiedStateSnapshot } from "@/intelligence/consumption/hooks/useTeacherVerifiedStateSnapshot";
import MatchSnapshotBadge from "./MatchSnapshotBadge";
import CriScoreBadge from "./CriScoreBadge";
import GapIndicatorBadge from "./GapIndicatorBadge";
import VerifiedStateBadge from "./VerifiedStateBadge";

interface ApplicantIntelligenceRowProps {
  teacherId: string;
  jobId: string;
}

/**
 * This component lives in school-facing hiring surfaces.
 * The exposure-aware hooks automatically resolve the audience
 * and filter intelligence data accordingly.
 *
 * For backward compatibility, badge components still accept
 * raw ConsumptionResult props. The exposure hooks are used here
 * to validate access — if exposure level is "hidden", the badge
 * won't render (consumption hooks return empty/null gracefully).
 */
const ApplicantIntelligenceRow = ({ teacherId, jobId }: ApplicantIntelligenceRowProps) => {
  // Exposure-aware hooks enforce audience rules
  const matchExposed = useExposedMatch(teacherId, jobId);
  const criExposed = useExposedCri(teacherId, jobId);
  const gapExposed = useExposedGap(teacherId);
  const verificationExposed = useExposedVerification(teacherId);

  // Raw consumption results for badge rendering (backward-compatible props)
  const matchResult = useTeacherJobMatchSnapshot(teacherId, jobId);
  const criResult = useTeacherCriSnapshot(teacherId, jobId);
  const gapResult = useTeacherGapSnapshot(teacherId);
  const verifiedResult = useTeacherVerifiedStateSnapshot(teacherId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {matchExposed.exposed.level !== "hidden" && <MatchSnapshotBadge result={matchResult} />}
      {criExposed.exposed.level !== "hidden" && <CriScoreBadge result={criResult} />}
      {verificationExposed.exposed.level !== "hidden" && <VerifiedStateBadge result={verifiedResult} showTooltip />}
      {gapExposed.exposed.level !== "hidden" && <GapIndicatorBadge result={gapResult} />}
    </div>
  );
};

export default ApplicantIntelligenceRow;
