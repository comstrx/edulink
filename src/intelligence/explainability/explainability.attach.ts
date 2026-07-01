/**
 * Explainability View Attachment — Sprint 5.4
 *
 * Utility to attach ExplainabilityView to decision outputs.
 * Pure helper — no logic changes, no side effects.
 */

import type { ExplainabilityMeta } from "@/intelligence/observability/explainability.types";
import type { ExplainabilityView } from "@/intelligence/explainability/explainability.presentation";
import { buildExplainabilityView } from "@/intelligence/explainability/explainability.presentation";

/**
 * Attach explainabilityView to any decision output that has explainability.
 * Returns the same object with the view field populated.
 * If no explainability exists, returns unchanged.
 */
export function attachExplainabilityView<
  T extends { explainability?: ExplainabilityMeta; explainabilityView?: ExplainabilityView },
>(output: T): T {
  if (output.explainability) {
    output.explainabilityView = buildExplainabilityView(output.explainability);
  }
  return output;
}
