import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedTrainingItem {
  id: string;
  user_id: string;
  training_item_id: string;
  created_at: string;
  item_title?: string;
  item_type?: string;
  item_slug?: string;
}

export function useSavedTrainingItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved_training_items", user?.id],
    queryFn: async (): Promise<SavedTrainingItem[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_training_items" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const itemIds = [...new Set((data as any[]).map((d) => d.training_item_id))];
      const { data: items } = await supabase
        .from("training_items")
        .select("id, title, type, slug")
        .in("id", itemIds);

      const itemMap: Record<string, { title: string; type: string; slug: string }> = {};
      items?.forEach((i) => (itemMap[i.id] = { title: i.title, type: i.type, slug: i.slug }));

      return (data as any[]).map((d) => ({
        ...d,
        item_title: itemMap[d.training_item_id]?.title ?? "Unknown",
        item_type: itemMap[d.training_item_id]?.type ?? "course",
        item_slug: itemMap[d.training_item_id]?.slug ?? "",
      }));
    },
    enabled: !!user,
  });
}

export function useIsItemSaved(trainingItemId: string | undefined) {
  const { data: saved } = useSavedTrainingItems();
  if (!trainingItemId || !saved) return false;
  return saved.some((s) => s.training_item_id === trainingItemId);
}

export function useSaveTrainingItem() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (trainingItemId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("saved_training_items" as any)
        .insert({ user_id: user.id, training_item_id: trainingItemId });
      if (error) {
        if (error.code === "23505") return; // Already saved
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_training_items"] });
    },
  });
}

export function useUnsaveTrainingItem() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (trainingItemId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("saved_training_items" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("training_item_id", trainingItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_training_items"] });
    },
  });
}
