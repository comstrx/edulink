import { Clock, BarChart3, Users, Layers, Target } from "lucide-react";
import type {
  TrainingItemBase,
  TrainingPathwayItem,
} from "@/lib/training/training-item-types";

// ── Re-export for convenience ──
export type { TrainingItemBase, TrainingPathwayItem };

// Union that detail components accept
export type TrainingDetailItem = TrainingItemBase | TrainingPathwayItem;

// ── Constants ──────────────────────────────────────────────────

export const TYPE_LABELS: Record<string, string> = {
  course: "Course",
  package: "Package",
  pathway: "Pathway",
};

export const META_ITEMS = (item: TrainingDetailItem) => {
  const base = [
    { icon: Clock, label: "Duration", value: item.duration ?? "—" },
    { icon: Users, label: "Audience", value: item.audience ?? "All educators" },
  ];

  if (item.type === "pathway" && "milestones" in item) {
    base.push({
      icon: Layers,
      label: "Milestones",
      value: `${item.milestones.length} stages`,
    });
    if (item.cri_target) {
      base.push({
        icon: Target,
        label: "CRI Target",
        value: `${item.cri_target}`,
      });
    }
  }

  return base;
};

// ── Helper to check if item is a pathway ──
export function isPathwayItem(item: TrainingDetailItem): item is TrainingPathwayItem {
  return item.type === "pathway" && "milestones" in item;
}
