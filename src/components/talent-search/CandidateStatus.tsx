import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CandidateStatus = "saved" | "contacted" | "interview" | "offer" | "hired" | "rejected";

export const CANDIDATE_STATUSES: { value: CandidateStatus; label: string; color: string }[] = [
  { value: "saved", label: "Saved", color: "bg-muted text-muted-foreground border-border" },
  { value: "contacted", label: "Contacted", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
  { value: "interview", label: "Interview", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800" },
  { value: "offer", label: "Offer", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  { value: "hired", label: "Hired", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" },
  { value: "rejected", label: "Rejected", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800" },
];

export function getStatusConfig(status: CandidateStatus) {
  return CANDIDATE_STATUSES.find(s => s.value === status) ?? CANDIDATE_STATUSES[0];
}

interface CandidateStatusBadgeProps {
  status: CandidateStatus;
  className?: string;
}

/** Read-only status pill */
export const CandidateStatusBadge = ({ status, className }: CandidateStatusBadgeProps) => {
  const config = getStatusConfig(status);
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border font-medium", config.color, className)}>
      {config.label}
    </Badge>
  );
};

interface CandidateStatusSelectProps {
  value: CandidateStatus;
  onChange: (value: CandidateStatus) => void;
  compact?: boolean;
  className?: string;
}

/** Dropdown to change status */
export const CandidateStatusSelect = ({ value, onChange, compact, className }: CandidateStatusSelectProps) => {
  const config = getStatusConfig(value);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={value} onValueChange={(v) => onChange(v as CandidateStatus)}>
        <SelectTrigger className={cn(
          "border-border/50",
          compact ? "h-6 text-[10px] w-[110px] px-2" : "h-8 text-xs w-[140px] px-2.5"
        )}>
          <SelectValue placeholder="Candidate Stage" />
        </SelectTrigger>
        <SelectContent>
          {CANDIDATE_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CandidateStatusBadge status={value} />
    </div>
  );
};
