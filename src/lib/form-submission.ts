/**
 * Shared Form Submission Utility
 *
 * Standardizes the pattern: validate → mutate → toast → invalidate.
 * Eliminates duplicated try/catch/toast patterns across forms.
 */

import { z } from "zod";
import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";

export interface FormSubmitOptions<TSchema extends z.ZodTypeAny> {
  /** Zod schema for validation */
  schema: TSchema;
  /** Raw form data to validate */
  data: unknown;
  /** Async mutation function — receives parsed data */
  mutation: (parsed: z.infer<TSchema>) => Promise<void>;
  /** Query keys to invalidate on success */
  invalidateKeys?: string[][];
  /** Query client for invalidation */
  queryClient?: QueryClient;
  /** Success message */
  successMessage?: string;
  /** Error message prefix (the actual error is appended) */
  errorPrefix?: string;
  /** Called on success, after toast and invalidation */
  onSuccess?: () => void;
  /** Called on error, after toast */
  onError?: (err: Error) => void;
}

/**
 * Validates data with a Zod schema, runs the mutation, shows toast,
 * and invalidates specified query keys.
 *
 * Returns true on success, false on validation/mutation failure.
 */
export async function submitForm<TSchema extends z.ZodTypeAny>(
  opts: FormSubmitOptions<TSchema>,
): Promise<boolean> {
  // 1. Validate
  const parsed = opts.schema.safeParse(opts.data);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Validation failed";
    toast.error(msg);
    return false;
  }

  // 2. Mutate
  try {
    await opts.mutation(parsed.data);
  } catch (err: any) {
    const msg = err?.message || "Operation failed";
    toast.error(opts.errorPrefix ? `${opts.errorPrefix}: ${msg}` : msg);
    opts.onError?.(err);
    return false;
  }

  // 3. Success: toast + invalidate
  if (opts.successMessage) {
    toast.success(opts.successMessage);
  }

  if (opts.queryClient && opts.invalidateKeys?.length) {
    await Promise.all(
      opts.invalidateKeys.map((key) => opts.queryClient!.invalidateQueries({ queryKey: key })),
    );
  }

  opts.onSuccess?.();
  return true;
}
