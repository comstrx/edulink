import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Star, CalendarCheck, Gift, UserCheck, HelpCircle } from "lucide-react";
import type { ApplicationStatus } from "@/hooks/useApplications";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
}

const STATUS_MAP: Record<ApplicationStatus, StatusConfig> = {
  applied: {
    label: "Applied",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  shortlisted: {
    label: "Shortlisted",
    icon: Star,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  interview: {
    label: "Interview",
    icon: CalendarCheck,
    className: "bg-violet-100 text-violet-800 border-violet-200",
  },
  offer: {
    label: "Offer",
    icon: Gift,
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  hired: {
    label: "Hired",
    icon: UserCheck,
    className: "bg-teal-100 text-teal-800 border-teal-200",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: XCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

const FALLBACK: StatusConfig = {
  label: "Unknown",
  icon: HelpCircle,
  className: "bg-muted text-muted-foreground border-border",
};

export function ApplicationStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status as ApplicationStatus] ?? FALLBACK;
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} gap-1 text-xs`}>
      <Icon className="h-3 w-3" /> {config.label}
    </Badge>
  );
}
