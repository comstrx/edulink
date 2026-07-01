/**
 * useBilling — Marketplace Billing & Pricing Hooks
 *
 * Sprint B3-C: Price resolution, billing policies, checkout eligibility.
 * All pricing resolved server-side — never trust client-submitted prices.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricingMode, ResolvedPrice } from "@/contracts/commerce/billing.contracts";

// ── Billing Policies ──

export function useBillingPolicies() {
  return useQuery({
    queryKey: ["billing-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_policies")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}

// ── Price Display Helpers ──

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function resolveDisplayLabel(mode: PricingMode, amount: number, currency: string): string {
  switch (mode) {
    case "free":
      return "Free";
    case "one_time":
      return formatCurrency(amount, currency);
    case "contact_sales":
      return "Contact Sales";
    case "custom_quote":
      return "Request Quote";
    case "subscription":
      return "Subscription";
    default:
      return "—";
  }
}

function resolveCtaLabel(mode: PricingMode, productType: string): string {
  if (mode === "free") {
    return productType === "mentor_session" ? "Book Free Session" : "Enroll Free";
  }
  if (mode === "one_time") {
    return productType === "mentor_session" ? "Book Session" : "Purchase";
  }
  if (mode === "contact_sales") return "Contact Sales";
  if (mode === "custom_quote") return "Request Quote";
  if (mode === "subscription") return "View Plans";
  return "Learn More";
}

// ── Training Item Price Resolution ──

export function useResolveTrainingPrice(item: {
  id: string;
  pricing_type?: string | null;
  price_amount?: number | null;
  price_currency?: string | null;
  ownership_type?: string | null;
} | null | undefined): ResolvedPrice | null {
  if (!item) return null;

  // Map existing training pricing_type to normalized PricingMode
  const rawType = item.pricing_type;
  let mode: PricingMode = "free";
  if (rawType === "fixed" || rawType === "one_time") mode = "one_time";
  else if (rawType === "contact_sales") mode = "contact_sales";
  else if (rawType === "custom" || rawType === "custom_quote") mode = "custom_quote";
  else if (rawType === "included_in_plan" || rawType === "subscription") mode = "subscription";

  const amount = mode === "one_time" ? Number(item.price_amount ?? 0) : 0;
  const currency = item.price_currency ?? "USD";
  const purchasableOnline = mode === "free" || mode === "one_time";
  const checkoutEligible = mode === "one_time" && amount > 0;

  return {
    pricingMode: mode,
    amount,
    currency,
    purchasableOnline,
    requiresManualApproval: mode === "contact_sales" || mode === "custom_quote",
    displayLabel: resolveDisplayLabel(mode, amount, currency),
    ctaLabel: resolveCtaLabel(mode, "training_item"),
    checkoutEligible,
  };
}

// ── Mentor Price Resolution ──

export function useResolveMentorPrice(mentor: {
  id: string;
  pricing_type?: string | null;
  session_price_amount?: number | null;
  session_price_currency?: string | null;
} | null | undefined): ResolvedPrice | null {
  if (!mentor) return null;

  const mode = (mentor.pricing_type ?? "free") as PricingMode;
  const amount = mode === "one_time" ? Number(mentor.session_price_amount ?? 0) : 0;
  const currency = mentor.session_price_currency ?? "USD";
  const purchasableOnline = mode === "free" || mode === "one_time";
  const checkoutEligible = mode === "one_time" && amount > 0;

  return {
    pricingMode: mode,
    amount,
    currency,
    purchasableOnline,
    requiresManualApproval: mode === "contact_sales" || mode === "custom_quote",
    displayLabel: mode === "one_time"
      ? `From ${formatCurrency(amount, currency)}`
      : resolveDisplayLabel(mode, amount, currency),
    ctaLabel: resolveCtaLabel(mode, "mentor_session"),
    checkoutEligible,
  };
}
