/**
 * IntelligenceErrorState — Reusable error placeholder for intelligence cards.
 * Shows a safe, non-crashing error state when snapshot fetching fails.
 * Supports optional retry action. Never fabricates values.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligenceErrorStateProps {
  message?: string;
  className?: string;
  /** Optional retry callback */
  onRetry?: () => void;
}

const IntelligenceErrorState = ({
  message = "Unable to load intelligence data",
  className,
  onRetry,
}: IntelligenceErrorStateProps) => (
  <Card className={cn("border-destructive/20", className)}>
    <CardContent className="p-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Something went wrong</h2>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 shrink-0" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

export default IntelligenceErrorState;
