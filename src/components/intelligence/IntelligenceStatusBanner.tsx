/**
 * IntelligenceStatusBanner — Standardized freshness/lifecycle banner
 *
 * Single entry point for rendering freshness state from ConsumptionMeta.
 * Handles: fresh (no banner), stale, invalidated, recomputing.
 * Never fabricates values. Shows real metadata status.
 */

import type { ConsumptionMeta } from "@/intelligence/consumption/types/intelligence-consumption.types";
import IntelligenceStaleBanner from "./IntelligenceStaleBanner";

interface IntelligenceStatusBannerProps {
  metadata: ConsumptionMeta;
  /** Custom label overrides per state */
  labels?: {
    stale?: string;
    invalidated?: string;
    recomputing?: string;
  };
}

/**
 * Renders the appropriate freshness banner based on metadata.
 * Returns null for fresh data (no banner needed).
 */
const IntelligenceStatusBanner = ({ metadata, labels }: IntelligenceStatusBannerProps) => {
  // Fresh data — no banner needed
  if (!metadata.isStale && !metadata.isInvalidated && !metadata.isRecomputing) {
    return null;
  }

  return (
    <IntelligenceStaleBanner
      isRecomputing={metadata.isRecomputing}
      isInvalidated={metadata.isInvalidated}
      label={
        metadata.isRecomputing
          ? labels?.recomputing
          : metadata.isInvalidated
            ? labels?.invalidated
            : labels?.stale
      }
    />
  );
};

export default IntelligenceStatusBanner;
