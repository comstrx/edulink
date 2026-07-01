/**
 * MobilityCard — Progressive Domain Activation
 *
 * States:
 * - NOT STARTED: no mobility states → purposeful CTA
 * - ACTIVE: mobility data exists → full display
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, ChevronRight, ArrowUpRight, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useTeacherMobility } from "@/mobility/hooks/useTeacherMobility";
import { cn } from "@/lib/utils";

interface MobilityCardProps {
  teacherId?: string;
}

export default function MobilityCard({ teacherId }: MobilityCardProps) {
  const { states, isLoading } = useTeacherMobility(teacherId);

  if (!teacherId || isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Career Mobility</h3>
          </div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  /* ═══ NOT STARTED ═══ */
  if (states.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Career Mobility</h3>
              <p className="text-xs text-muted-foreground">Global opportunities</p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-2.5">
            <p className="text-sm font-medium text-foreground">
              Unlock global opportunities as your profile grows
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Career mobility insights appear as you build skills, earn credentials, and gain experience across different roles.
            </p>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Globe className="h-3 w-3" />
              Browse opportunities
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ═══ ACTIVE ═══ */
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Career Mobility</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {states.length} opportunities
          </Badge>
        </div>

        <div className="space-y-2.5">
          {states.slice(0, 5).map((state) => {
            const readiness = Math.round(state.readinessPercent);
            const isReady = readiness >= 75;
            const isEmerging = readiness >= 40;

            return (
              <div
                key={state.targetId}
                className="rounded-lg border border-border/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <ArrowUpRight className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isReady ? "text-primary" : isEmerging ? "text-muted-foreground" : "text-muted-foreground/50"
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{state.targetName}</p>
                      <p className="text-[10px] text-muted-foreground">{state.trackName}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-[10px] shrink-0",
                    isReady
                      ? "bg-primary/10 text-primary"
                      : isEmerging
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {readiness}% ready
                  </Badge>
                </div>

                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isReady ? "bg-primary" : isEmerging ? "bg-primary/60" : "bg-muted-foreground/30"
                    )}
                    style={{ width: `${readiness}%` }}
                  />
                </div>

                {state.blockingGaps.length > 0 && (
                  <div className="space-y-1">
                    {state.blockingGaps.slice(0, 2).map((gap, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <p className="text-[10px] text-muted-foreground truncate">{gap.label}</p>
                      </div>
                    ))}
                    {state.blockingGaps.length > 2 && (
                      <p className="text-[10px] text-muted-foreground/70 pl-4">
                        +{state.blockingGaps.length - 2} more gaps
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
