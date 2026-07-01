/**
 * PricingCta — Renders the correct CTA button based on billing mode.
 *
 * Sprint B3-C: Prevents checkout for non-purchasable items.
 */

import { Button } from "@/components/ui/button";
import type { ResolvedPrice } from "@/contracts/commerce/billing.contracts";

interface PricingCtaProps {
  price: ResolvedPrice | null;
  onAction?: () => void;
  size?: "sm" | "default" | "lg";
  className?: string;
  disabled?: boolean;
}

const PricingCta = ({ price, onAction, size = "default", className = "", disabled = false }: PricingCtaProps) => {
  if (!price) return null;

  const variant = price.pricingMode === "free"
    ? "default"
    : price.checkoutEligible
      ? "default"
      : "outline";

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onAction}
      disabled={disabled}
    >
      {price.ctaLabel}
    </Button>
  );
};

export default PricingCta;
