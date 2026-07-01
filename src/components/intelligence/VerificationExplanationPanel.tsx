/**
 * VerificationExplanationPanel — "What does this mean?" for verification status
 *
 * Audience-aware explanation for verification signals.
 * Presentation-only.
 *
 * Phase 4.3 — Explainability Layer
 */

import ExplanationSection from "./ExplanationSection";
import type { VerifiedStateConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import { explainVerification } from "@/intelligence/explainability/adapters/verification-explanation.adapter";

interface VerificationExplanationPanelProps {
  data: VerifiedStateConsumptionData;
  audience?: ExposureAudience;
  onView?: () => void;
}

const VerificationExplanationPanel = ({ data, audience = "teacher", onView }: VerificationExplanationPanelProps) => {
  const explanation = explainVerification(data, audience);
  return <ExplanationSection explanation={explanation} onView={onView} />;
};

export default VerificationExplanationPanel;
