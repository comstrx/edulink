import { supabase } from "@/integrations/supabase/client";

/**
 * Detects whether adding a prerequisite would create a circular dependency chain.
 * 
 * Uses BFS to walk the prerequisite graph from `prerequisiteItemId` and checks
 * if `trainingItemId` is reachable — which would mean adding this edge creates a cycle.
 * 
 * @returns `true` if a cycle would be created, `false` if safe to add.
 */
export async function wouldCreateCycle(
  trainingItemId: string,
  prerequisiteItemId: string
): Promise<boolean> {
  // Self-reference is always a cycle
  if (trainingItemId === prerequisiteItemId) return true;

  // BFS: starting from prerequisiteItemId, can we reach trainingItemId?
  const visited = new Set<string>();
  const queue: string[] = [prerequisiteItemId];

  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    const unvisited = batch.filter((id) => !visited.has(id));
    if (unvisited.length === 0) break;

    for (const id of unvisited) visited.add(id);

    const { data, error } = await supabase
      .from("training_item_prerequisites")
      .select("prerequisite_item_id")
      .in("training_item_id", unvisited);

    if (error) {
      console.error("Cycle detection query failed:", error);
      throw new Error("Failed to check prerequisite cycle");
    }

    if (!data || data.length === 0) continue;

    for (const row of data) {
      if (row.prerequisite_item_id === trainingItemId) return true;
      if (!visited.has(row.prerequisite_item_id)) {
        queue.push(row.prerequisite_item_id);
      }
    }
  }

  return false;
}

/**
 * Validates and inserts a prerequisite link, rejecting cycles.
 * 
 * @returns The inserted row on success.
 * @throws If a cycle would be created or the insert fails.
 */
export async function addPrerequisiteSafe(
  trainingItemId: string,
  prerequisiteItemId: string,
  isRequired = true
) {
  const isCycle = await wouldCreateCycle(trainingItemId, prerequisiteItemId);
  if (isCycle) {
    throw new Error(
      "Cannot add prerequisite: this would create a circular dependency chain."
    );
  }

  const { data, error } = await supabase
    .from("training_item_prerequisites")
    .insert({
      training_item_id: trainingItemId,
      prerequisite_item_id: prerequisiteItemId,
      is_required: isRequired,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
