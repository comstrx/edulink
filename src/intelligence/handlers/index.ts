/**
 * Intelligence Intent Handlers — Barrel Export
 *
 * Registers all handlers and exports the dispatch surface.
 *
 * Phase 3A — Intent Handler Infrastructure
 */

// Core
export type {
  IntentHandler,
  HandlerContext,
  HandlerResult,
} from "./core/intent-handler.types";

export {
  registerHandler,
  resolveHandler,
  getRegisteredIntents,
  clearRegistry,
} from "./core/intent-handler.registry";

export {
  dispatchIntent,
  dispatchIntents,
} from "./core/intent-handler.dispatcher";

export type { IntentDispatchResult, IntentDispatchSummary, IntentOutcomeStatus, DispatchSkipped } from "./core/intent-handler.dispatcher";

// Domain handlers
export { criRefreshHandler } from "./cri/cri-refresh.handler";
export { matchRefreshHandler } from "./matching/match-refresh.handler";
export { gapRefreshHandler } from "./gaps/gap-refresh.handler";
export { recommendationGenerationHandler } from "./recommendations/recommendation-generation.handler";
export { talentProfileRefreshHandler } from "./talent/talent-profile-refresh.handler";
export { growthRecommendationRefreshHandler } from "./growth/growth-recommendation-refresh.handler";
export { careerStateRefreshHandler } from "./career/career-state-refresh.handler";
export { reputationRefreshHandler } from "./reputation/reputation-refresh.handler";
export { mobilityRefreshHandler } from "./mobility/mobility-refresh.handler";
export { workforceRefreshHandler } from "./workforce/workforce-refresh.handler";
export { verifiedStateRefreshHandler } from "./verified-state/verified-state-refresh.handler";

// ── Auto-register all handlers ─────────────────────────────────
import { registerHandler } from "./core/intent-handler.registry";
import { criRefreshHandler } from "./cri/cri-refresh.handler";
import { matchRefreshHandler } from "./matching/match-refresh.handler";
import { gapRefreshHandler } from "./gaps/gap-refresh.handler";
import { recommendationGenerationHandler } from "./recommendations/recommendation-generation.handler";
import { talentProfileRefreshHandler } from "./talent/talent-profile-refresh.handler";
import { growthRecommendationRefreshHandler } from "./growth/growth-recommendation-refresh.handler";
import { careerStateRefreshHandler } from "./career/career-state-refresh.handler";
import { reputationRefreshHandler } from "./reputation/reputation-refresh.handler";
import { mobilityRefreshHandler } from "./mobility/mobility-refresh.handler";
import { workforceRefreshHandler } from "./workforce/workforce-refresh.handler";
import { verifiedStateRefreshHandler } from "./verified-state/verified-state-refresh.handler";

let _registered = false;

/** Call once to register all intelligence handlers */
export function bootstrapHandlers(): void {
  if (_registered) return;
  _registered = true;

  registerHandler(criRefreshHandler);
  registerHandler(matchRefreshHandler);
  registerHandler(gapRefreshHandler);
  registerHandler(recommendationGenerationHandler);
  registerHandler(talentProfileRefreshHandler);
  registerHandler(growthRecommendationRefreshHandler);
  registerHandler(careerStateRefreshHandler);
  registerHandler(reputationRefreshHandler);
  registerHandler(mobilityRefreshHandler);
  registerHandler(workforceRefreshHandler);
  registerHandler(verifiedStateRefreshHandler);

  console.log("[Intelligence] All intent handlers registered.");
}
