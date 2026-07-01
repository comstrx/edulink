/**
 * Billing & Pricing Contracts — Sprint B3-C
 *
 * Types and events for the marketplace billing and pricing layer.
 */

import type { DomainEvent } from "../core/domain-event";

// ── Pricing Modes ──

export type PricingMode = "free" | "one_time" | "contact_sales" | "custom_quote" | "subscription";

// ── Resolved Price ──

export interface ResolvedPrice {
  pricingMode: PricingMode;
  amount: number;
  currency: string;
  purchasableOnline: boolean;
  requiresManualApproval: boolean;
  /** Display label for UI */
  displayLabel: string;
  /** CTA text */
  ctaLabel: string;
  /** Whether checkout flow should be entered */
  checkoutEligible: boolean;
}

// ── Event Payloads ──

export interface PriceResolvedPayload {
  itemType: string;
  itemId: string;
  pricingMode: PricingMode;
  amount: number;
  currency: string;
  resolvedAt: string;
}

export interface ContactSalesRequestedPayload {
  itemType: string;
  itemId: string;
  userId: string;
  requestedAt: string;
}

export interface QuoteRequestedPayload {
  itemType: string;
  itemId: string;
  userId: string;
  requestedAt: string;
}

// ── Typed Events ──

export type PriceResolvedEvent = DomainEvent<PriceResolvedPayload>;
export type ContactSalesRequestedEvent = DomainEvent<ContactSalesRequestedPayload>;
export type QuoteRequestedEvent = DomainEvent<QuoteRequestedPayload>;
