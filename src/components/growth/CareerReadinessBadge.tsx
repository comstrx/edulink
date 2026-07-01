/**
 * CareerReadinessBadge — Canonical Readiness Display
 *
 * Displays readiness from the SINGLE canonical source:
 * intelligence_talent_profiles.readiness_level
 *
 * ❌ No local readiness computation
 * ❌ No alternate enum
 * ✅ Uses CanonicalReadinessLevel only
 */

import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanonicalReadinessLevel } from "@/intelligence/readiness/canonical-readiness.types";
import {
  CANONICAL_READINESS_LABELS,
  CANONICAL_READINESS_STYLES,
} from "@/intelligence/readiness/canonical-readiness.types";

interface CareerReadinessBadgeProps {
  level: CanonicalReadinessLevel | null;
  size?: "sm" | "md";
}

export default function CareerReadinessBadge({ level, size = "sm" }: CareerReadinessBadgeProps) {
  if (!level) return null;

  const label = CANONICAL_READINESS_LABELS[level];
  const style = CANONICAL_READINESS_STYLES[level];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-0 font-medium",
        style,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      <Zap className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
    </Badge>
  );
}
