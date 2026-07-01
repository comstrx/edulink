import { Link } from "react-router-dom";
import { ChevronRight, GraduationCap } from "lucide-react";

interface TrainingHeaderProps {
  /** Page title displayed as the h1 */
  title: string;
  /** Icon rendered before the title */
  icon: React.ElementType;
  /** Short description under the title */
  description: string;
  /** The breadcrumb root — defaults to "Training" */
  rootLabel?: string;
  /** Link for the breadcrumb root */
  rootTo?: string;
  /** Optional right-side action (e.g. a button) */
  action?: React.ReactNode;
}

/**
 * Consistent page header with breadcrumb for all Training workspace pages.
 * Used across both Teacher and School training layers.
 */
const TrainingHeader = ({
  title,
  icon: Icon,
  description,
  rootLabel = "Training",
  rootTo,
  action,
}: TrainingHeaderProps) => (
  <div className="space-y-1">
    {/* Breadcrumb */}
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      <GraduationCap className="h-3.5 w-3.5" />
      {rootTo ? (
        <Link to={rootTo} className="hover:text-foreground transition-colors">
          {rootLabel}
        </Link>
      ) : (
        <span>{rootLabel}</span>
      )}
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{title}</span>
    </nav>

    {/* Title row — wraps on mobile */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <span className="truncate">{title}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>
);

export default TrainingHeader;
