import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all published+active courses for use in the Package bundled course selector.
 * Returns id + title for admin display.
 */
export function useAvailableCourses() {
  return useQuery({
    queryKey: ["available_courses_for_package"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_items")
        .select("id, title, slug, duration, duration_hours")
        .eq("type", "course")
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetches the bundled course IDs for a given package from the junction table.
 */
export function usePackageCourseIds(packageId: string | undefined) {
  return useQuery({
    queryKey: ["package_course_ids", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase
        .from("training_package_items")
        .select("item_id, sort_order")
        .eq("package_id", packageId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((r) => r.item_id);
    },
    enabled: !!packageId,
  });
}

/**
 * Syncs the bundled course IDs for a package.
 * Deletes removed items, inserts new ones, preserves sort order.
 */
export async function syncPackageCourses(
  packageId: string,
  courseIds: string[],
): Promise<void> {
  // Delete all existing
  const { error: delError } = await supabase
    .from("training_package_items")
    .delete()
    .eq("package_id", packageId);

  if (delError) throw new Error(`Failed to clear package items: ${delError.message}`);

  if (courseIds.length === 0) return;

  // Insert new set with sort order
  const rows = courseIds.map((itemId, index) => ({
    package_id: packageId,
    item_id: itemId,
    sort_order: index + 1,
  }));

  const { error: insError } = await supabase
    .from("training_package_items")
    .insert(rows);

  if (insError) throw new Error(`Failed to insert package items: ${insError.message}`);
}
