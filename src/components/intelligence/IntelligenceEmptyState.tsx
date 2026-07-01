/**
 * IntelligenceEmptyState — Reusable empty placeholder for intelligence cards.
 * Renders when no snapshot has been computed yet. Never fabricates values.
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface IntelligenceEmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  /** Optional CTA or action slot */
  children?: React.ReactNode;
  className?: string;
}

const IntelligenceEmptyState = ({ icon: Icon, title, message, children, className }: IntelligenceEmptyStateProps) => (
  <Card className={cn("border-border/50", className)}>
    <CardContent className="p-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </CardContent>
  </Card>
);

export default IntelligenceEmptyState;
