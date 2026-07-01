/**
 * fetchPathwayContext — Pathway Awareness Helper
 *
 * Queries training_items to determine whether recommendation targets
 * are pathways, courses within pathways, or standalone courses.
 *
 * Sprint 4 — Phase 2, Step 2: Pathway Awareness
 */

import { supabase } from "@/integrations/supabase/client";
import type { UIPathwayContext } from "../unified-recommendations.adapter";

/**
 * For a set of targetIds, resolves pathway context by checking
 * the training_items table for item type and pathway membership.
 *
 * Returns a map of targetId → UIPathwayContext.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchPathwayContext(
  targetIds: string[],
): Promise<Record<string, UIPathwayContext>> {
  if (targetIds.length === 0) return {};

  const uniqueIds = [...new Set(targetIds)].filter((id) => UUID_RE.test(id));
  if (uniqueIds.length === 0) return {};

  // Look up item type for each target
  const { data: items, error } = await supabase
    .from("training_items")
    .select("id, type")
    .in("id", uniqueIds);

  if (error || !items) return {};

  const contextMap: Record<string, UIPathwayContext> = {};

  // Collect course IDs to check if they belong to any pathway
  const courseIds = items.filter((i) => i.type === "course").map((i) => i.id);

  // For pathway items, mark directly
  for (const item of items) {
    if (item.type === "pathway") {
      contextMap[item.id] = {
        isPathway: true,
        pathwayId: item.id,
        itemType: "pathway",
      };
    }
  }

  // Check if any course targets are part of a pathway via training_package_items
  if (courseIds.length > 0) {
    const { data: packageLinks } = await supabase
      .from("training_package_items")
      .select("item_id, package_id")
      .in("item_id", courseIds);

    if (packageLinks && packageLinks.length > 0) {
      // Resolve which parents are pathways
      const parentIds = [...new Set(packageLinks.map((l) => l.package_id))];
      const { data: parentItems } = await supabase
        .from("training_items")
        .select("id, type")
        .in("id", parentIds)
        .eq("type", "pathway");

      const pathwayParentIds = new Set((parentItems ?? []).map((p) => p.id));

      for (const link of packageLinks) {
        if (pathwayParentIds.has(link.package_id)) {
          contextMap[link.item_id] = {
            isPathway: true,
            pathwayId: link.package_id,
            itemType: "course",
          };
        }
      }
    }

    // Mark remaining courses as standalone
    for (const courseId of courseIds) {
      if (!contextMap[courseId]) {
        contextMap[courseId] = {
          isPathway: false,
          itemType: "course",
        };
      }
    }
  }

  return contextMap;
}
