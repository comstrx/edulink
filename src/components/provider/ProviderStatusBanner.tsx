import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Ban, Clock, XCircle } from "lucide-react";

interface ProviderStatusBannerProps {
  status: string;
  rejectionReason?: string | null;
}

const ProviderStatusBanner = ({ status, rejectionReason }: ProviderStatusBannerProps) => {
  if (status === "active") return null;

  const configs: Record<string, { icon: any; bg: string; border: string; title: string; description: string }> = {
    draft: {
      icon: Clock,
      bg: "bg-muted/50",
      border: "border-border",
      title: "Draft Provider",
      description: "Your provider has not been submitted for review yet. Complete your organization details and submit when ready.",
    },
    pending_review: {
      icon: Clock,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      title: "Under Review",
      description: "Your provider application is being reviewed by the platform team. Some actions may be limited until approval.",
    },
    rejected: {
      icon: XCircle,
      bg: "bg-destructive/5",
      border: "border-destructive/20",
      title: "Application Rejected",
      description: rejectionReason || "Your provider application was not approved. You may update your details and resubmit.",
    },
    suspended: {
      icon: Ban,
      bg: "bg-destructive/5",
      border: "border-destructive/20",
      title: "Provider Suspended",
      description: "Your provider organization is currently suspended. Normal operations are restricted. Contact support for assistance.",
    },
    inactive: {
      icon: AlertTriangle,
      bg: "bg-muted/50",
      border: "border-border",
      title: "Provider Inactive",
      description: "Your provider organization is currently inactive.",
    },
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`${config.bg} border ${config.border} rounded-md p-4 flex items-start gap-3`}>
      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
      <div>
        <p className="font-medium text-sm">{config.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
      </div>
    </div>
  );
};

export default ProviderStatusBanner;
