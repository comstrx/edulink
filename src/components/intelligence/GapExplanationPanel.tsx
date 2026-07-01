/**
 * GapExplanationPanel — "Why these gaps?" breakdown
 *
 * Audience-aware explanation for gap signals.
 * Presentation-only — consumes data from explainability adapters.
 *
 * Phase 4.3 — Explainability Layer
 */

import ExplanationSection from "./ExplanationSection";
import type { GapConsumptionData } from "@/intelligence/consumption/types/intelligence-consumption.types";
import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import { explainGap } from "@/intelligence/explainability/adapters/gap-explanation.adapter";

interface GapExplanationPanelProps {
  data: GapConsumptionData;
  audience?: ExposureAudience;
  onView?: () => void;
}

const GapExplanationPanel = ({ data, audience = "teacher", onView }: GapExplanationPanelProps) => {
  const explanation = explainGap(data, audience);
  return <ExplanationSection explanation={explanation} onView={onView} />;
};

export default GapExplanationPanel;
