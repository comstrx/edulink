/**
 * PricingBadge — Displays pricing label for marketplace items.
 *
 * Sprint B3-C: Shows correct pricing mode label with appropriate styling.
 * Uses resolved pricing data — never hardcodes values.
 */

import { Badge } from "@/components/ui/badge";
import type { ResolvedPrice } from "@/contracts/commerce/billing.contracts";

interface PricingBadgeProps {
  price: ResolvedPrice | null;
  className?: string;
}

const PricingBadge = ({ price, className = "" }: PricingBadgeProps) => {
  if (!price) return null;

  const variant = price.pricingMode === "free"
    ? "secondary"
    : price.pricingMode === "one_time"
      ? "default"
      : "outline";

  return (
    <Badge variant={variant} className={`text-xs ${className}`}>
      {price.displayLabel}
    </Badge>
  );
};

export default PricingBadge;
