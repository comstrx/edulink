/**
 * HTTP response helpers + centralized error mapping. Internal error detail is
 * logged server-side only; the client gets a stable `{ code, message }` shape
 * (audit #8).
 */

import { DomainError } from "../domain/errors.ts";
import type { Logger } from "../application/ports.ts";

export function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function toErrorResponse(
  err: unknown,
  headers: Record<string, string>,
  logger: Logger,
): Response {
  if (err instanceof DomainError) {
    if (err.httpStatus >= 500) {
      logger.error("domain_error", { code: err.code, message: err.message });
    }
    return json({ error: { code: err.code, message: err.message } }, err.httpStatus, headers);
  }

  logger.error("unhandled_error", {
    message: err instanceof Error ? err.message : String(err),
  });
  return json({ error: { code: "internal", message: "Internal error" } }, 500, headers);
}
