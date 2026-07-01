/**
 * Maps ExposureAudience to ExplanationAudience and ReputationAudience.
 *
 * ExposureAudience: "teacher" | "school" | "public" | "admin"
 * ExplanationAudience: "public" | "school" | "internal"
 * ReputationAudience: "public" | "school" | "internal"
 */

import type { ExposureAudience } from "@/intelligence/exposure/types/exposure.types";
import type { ExplanationAudience } from "../types/explanation-contract.types";
import type { ReputationAudience } from "@/reputation/types/reputation-graph.types";

export function mapToExplanationAudience(
  exposure: ExposureAudience
): ExplanationAudience {
  switch (exposure) {
    case "admin":
      return "internal";
    case "school":
      return "school";
    case "teacher":
      return "school"; // Teachers see their own school-level explanations
    case "public":
    default:
      return "public";
  }
}

/**
 * Maps ExposureAudience to ReputationAudience for hook-level signal gating.
 */
export function mapToReputationAudience(
  exposure: ExposureAudience
): ReputationAudience {
  switch (exposure) {
    case "admin":
      return "internal";
    case "school":
      return "school";
    case "teacher":
      return "internal"; // Teachers viewing own profile get full signals
    case "public":
    default:
      return "public";
  }
}
