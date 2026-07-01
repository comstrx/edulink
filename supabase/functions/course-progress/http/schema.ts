/** Request validation at the boundary (audit #5 — no more untyped `body.x`). */

import { z } from "npm:zod@3";

export const patchBodySchema = z.object({
  execution_id: z.string().uuid(),
  action: z.enum(["start", "continue", "complete"]),
});

export type PatchBody = z.infer<typeof patchBodySchema>;
