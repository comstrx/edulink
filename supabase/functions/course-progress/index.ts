/**
 * course-progress — composition root (thin HTTP adapter).
 *
 * Refactored from a 512-LOC handler that mixed HTTP, auth, validation, domain
 * rules and multi-table orchestration into layers:
 *
 *   http/         request parsing, zod validation, CORS, error mapping
 *   application/  use cases (CourseProgressService) + ports
 *   domain/       pure rules (state machine, pathway policy) + typed errors
 *   infrastructure/ Supabase repository, verified auth, structured logging
 *
 * The multi-write "complete" flow is now atomic via the
 * `complete_course_progress` RPC — see delivery/proposed-sql/.
 */

import { createClients } from "./infrastructure/supabase.factory.ts";
import { resolveIdentity } from "./infrastructure/auth.ts";
import { createLogger } from "./infrastructure/logger.ts";
import { createCourseProgressRepository } from "./infrastructure/course-progress.repository.ts";
import { CourseProgressService } from "./application/course-progress.service.ts";
import { corsHeaders } from "./http/cors.ts";
import { patchBodySchema } from "./http/schema.ts";
import { json, toErrorResponse } from "./http/responses.ts";
import { Errors } from "./domain/errors.ts";

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  const logger = createLogger({ fn: "course-progress", requestId: crypto.randomUUID() });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) throw Errors.unauthenticated();

    const { user, admin } = createClients(authHeader);
    const identity = await resolveIdentity(user);
    const service = new CourseProgressService(
      createCourseProgressRepository(user, admin, logger),
      logger,
    );

    if (req.method === "GET") {
      const data = await service.list(identity);
      return json({ data }, 200, cors);
    }

    if (req.method === "PATCH") {
      const raw = await req.json().catch(() => null);
      const parsed = patchBodySchema.safeParse(raw);
      if (!parsed.success) {
        throw Errors.invalidRequest("Invalid request body", { issues: parsed.error.issues });
      }
      const { execution_id, action } = parsed.data;

      switch (action) {
        case "start":
          await service.start(identity, execution_id);
          return json({ success: true }, 200, cors);
        case "continue":
          await service.resume(identity, execution_id);
          return json({ success: true }, 200, cors);
        case "complete": {
          const result = await service.complete(identity, execution_id);
          return json({ success: true, data: result }, 200, cors);
        }
      }
    }

    return json({ error: { code: "method_not_allowed", message: "Method not allowed" } }, 405, cors);
  } catch (err) {
    return toErrorResponse(err, cors, logger);
  }
});
