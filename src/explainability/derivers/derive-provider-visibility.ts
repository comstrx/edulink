/**
 * Provider Visibility Explanation Deriver
 *
 * Explains why a provider appears publicly or is restricted.
 * Consumes: visibility settings + verification state + provider status
 *
 * Distinguishes between:
 * - explicit_public_visibility
 * - verified_provider_profile
 * - eligible_catalog_items
 * - provider_account_status
 * - incomplete_requirements
 * - restricted_visibility
 */

import type {
  ExplanationContract,
  ExplanationReason,
  MissingSignal,
  ExplanationAudience,
} from "../types/explanation-contract.types";
import { deriveConfidence } from "../utils/derive-confidence";
import { applyAudienceFilter } from "../utils/filter-by-audience";

export interface ProviderVisibilityInput {
  isPublic: boolean;
  isVerified: boolean;
  isActive: boolean;
  verificationCount: number;
  hasCompleteProfile: boolean;
  /** Whether the provider has published eligible catalog items */
  hasEligibleCatalogItems?: boolean;
  /** Whether the provider is explicitly restricted */
  isRestricted?: boolean;
}

export function deriveProviderVisibilityExplanation(
  input: ProviderVisibilityInput,
  audience: ExplanationAudience
): ExplanationContract {
  const reasons: ExplanationReason[] = [];
  const missing: MissingSignal[] = [];

  // Account status (primary)
  if (input.isActive) {
    reasons.push({
      label: "Provider account is active",
      sourceDomain: "identity",
      signalType: "provider_status",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Active provider status",
      sourceDomain: "identity",
      signalType: "provider_status",
      hint: "Activate your provider account to appear in listings.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Explicit restriction check
  if (input.isRestricted) {
    reasons.push({
      label: "Provider currently restricted from public listing",
      sourceDomain: "visibility",
      signalType: "provider_status",
      evidenceStatus: "verified",
      visibility: ["school", "internal"],
    });
  }

  // Explicit public visibility (primary)
  if (input.isPublic && !input.isRestricted) {
    reasons.push({
      label: "Provider profile verified and eligible for public catalog listing",
      sourceDomain: "visibility",
      signalType: "visibility_setting",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      isPrimary: true,
    });
  } else if (!input.isPublic) {
    missing.push({
      label: "Public visibility",
      sourceDomain: "visibility",
      signalType: "visibility_setting",
      hint: "Set profile visibility to public to appear in search results.",
      visibility: ["school", "internal"],
    });
  }

  // Verification (primary)
  if (input.isVerified) {
    reasons.push({
      label: `Verified provider (${input.verificationCount} verification(s))`,
      sourceDomain: "trust",
      signalType: "verification",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      signalCount: input.verificationCount,
      verificationBasis: "account_verifications",
      isPrimary: true,
    });
  } else {
    missing.push({
      label: "Provider verification",
      sourceDomain: "trust",
      signalType: "verification",
      hint: "Complete provider profile verification to increase trust and visibility.",
      visibility: ["public", "school", "internal"],
    });
  }

  // Complete profile
  if (input.hasCompleteProfile) {
    reasons.push({
      label: "Profile information is complete",
      sourceDomain: "identity",
      signalType: "provider_status",
      evidenceStatus: "derived",
      visibility: ["school", "internal"],
    });
  } else {
    missing.push({
      label: "Complete profile",
      sourceDomain: "identity",
      signalType: "provider_status",
      hint: "Complete all profile fields to improve discoverability.",
      visibility: ["school", "internal"],
    });
  }

  // Eligible catalog items
  if (input.hasEligibleCatalogItems) {
    reasons.push({
      label: "Published eligible training items in catalog",
      sourceDomain: "training",
      signalType: "catalog_eligibility",
      evidenceStatus: "verified",
      visibility: ["public", "school", "internal"],
      verificationBasis: "training_items",
    });
  } else if (input.hasEligibleCatalogItems === false) {
    missing.push({
      label: "Published catalog items",
      sourceDomain: "training",
      signalType: "catalog_eligibility",
      hint: "Publish eligible training items to appear in the training catalog.",
      visibility: ["school", "internal"],
    });
  }

  const confidence = deriveConfidence(reasons, missing);

  // Derive summary based on rule-level state
  let summary: string;
  if (input.isRestricted) {
    summary = "Provider currently restricted from public listing.";
  } else if (input.isPublic && input.isVerified && input.isActive) {
    summary = "Provider is publicly visible with verified status.";
  } else if (input.isActive && input.isPublic && !input.isVerified) {
    summary = "Provider profile exists but verification is incomplete.";
  } else if (input.isActive && !input.isPublic) {
    summary = "Provider visibility limited due to private profile settings.";
  } else if (!input.isActive) {
    summary = "Provider is not currently visible in public listings.";
  } else {
    summary = "Provider has limited visibility. Complete requirements for full public listing.";
  }

  return applyAudienceFilter(
    {
      status: "ready",
      context: "provider_visibility",
      confidenceLevel: confidence,
      summary,
      reasons,
      missingSignals: missing,
      audience,
    },
    audience
  );
}
