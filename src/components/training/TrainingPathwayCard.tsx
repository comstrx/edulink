import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TrainingPathwayCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Base wrapper for all pathway card variants.
 * Provides consistent card chrome; variants compose inside.
 */
const TrainingPathwayCard = ({ children, className }: TrainingPathwayCardProps) => (
  <Card className={className}>
    <CardContent className="p-5 space-y-3">
      {children}
    </CardContent>
  </Card>
);

/* ── Shared sub-elements ── */

const PathwayBadgeRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start justify-between">{children}</div>
);

const PathwayTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="font-semibold text-foreground">{children}</p>
);

const PathwayDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

export { TrainingPathwayCard, PathwayBadgeRow, PathwayTitle, PathwayDescription };
