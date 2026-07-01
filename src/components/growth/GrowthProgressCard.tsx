/**
 * GrowthProgressCard — Sprint 2.2
 * Shows training progress + credential counts from intelligence layer.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Award, BookOpen, Route } from "lucide-react";
import type { GrowthSummary } from "@/growth/types/growth-summary.types";

interface GrowthProgressCardProps {
  growth: GrowthSummary;
}

export default function GrowthProgressCard({ growth }: GrowthProgressCardProps) {
  if (growth.resolvedState === "loading") {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading progress…</span>
        </CardContent>
      </Card>
    );
  }

  if (growth.resolvedState !== "resolved") return null;

  const { trainingProgress: tp, credentials: ec } = growth;

  const stats = [
    { icon: BookOpen, label: "Completed", value: tp.completedCount, sub: `${tp.verifiedCount} verified` },
    { icon: Award, label: "Credentials", value: ec.totalActive, sub: "active credentials" },
    { icon: Route, label: "Active Pathways", value: tp.activePathways, sub: `${tp.activePathways} pathway(s)` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Growth Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">{s.value} <span className="font-normal text-muted-foreground text-xs">{s.label}</span></p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
