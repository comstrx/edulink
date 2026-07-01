import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrainingSectionProps {
  title: string;
  /** Optional section icon */
  icon?: React.ElementType;
  /** Optional "View all" link */
  linkTo?: string;
  linkLabel?: string;
  /** Optional count badge next to title */
  count?: number;
  children: React.ReactNode;
}

const TrainingSection = ({
  title,
  icon: Icon,
  linkTo,
  linkLabel,
  count,
  children,
}: TrainingSectionProps) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        )}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {linkLabel ?? "View all"} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
    {children}
  </section>
);

export default TrainingSection;
