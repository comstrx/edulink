import { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";

interface MutationResult<T = unknown> {
  data: T;
  error: PostgrestError | null;
}

/**
 * Wraps a Supabase write operation with error handling.
 * Returns true only on confirmed backend success.
 */
export async function safeMutation<T = unknown>(
  operation: () => PromiseLike<MutationResult<T>>,
  options?: { successMessage?: string; errorMessage?: string }
): Promise<{ success: boolean; data: T | null }> {
  try {
    const { data, error } = await operation();
    if (error) {
      console.error("[safeMutation] Supabase error:", error.message);
      toast.error(options?.errorMessage ?? `Save failed: ${error.message}`);
      return { success: false, data: null };
    }
    if (options?.successMessage) {
      toast.success(options.successMessage);
    }
    return { success: true, data };
  } catch (err: any) {
    console.error("[safeMutation] Unexpected error:", err);
    toast.error(options?.errorMessage ?? "An unexpected error occurred");
    return { success: false, data: null };
  }
}
