import { Badge } from "@/components/ui/badge";
import { CheckCircle, ShieldCheck } from "lucide-react";

type VerificationStatus = "unverified" | "verified" | "trusted_partner";

interface ProviderTrustBadgeProps {
  verificationStatus: VerificationStatus | string;
  size?: "sm" | "md";
}

/**
 * Renders a trust badge for providers based on their verification_status.
 * Only verified / trusted_partner providers get a badge; unverified returns null.
 */
const ProviderTrustBadge = ({ verificationStatus, size = "sm" }: ProviderTrustBadgeProps) => {
  if (verificationStatus === "verified") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 text-primary border-primary/30 bg-primary/5 ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"}`}
      >
        <CheckCircle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        Verified
      </Badge>
    );
  }

  if (verificationStatus === "trusted_partner") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 text-primary border-primary/30 bg-primary/5 ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"}`}
      >
        <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        Trusted Partner
      </Badge>
    );
  }

  return null;
};

export default ProviderTrustBadge;
