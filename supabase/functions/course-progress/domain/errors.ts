/**
 * Domain errors — a small typed hierarchy so the application layer can throw
 * intent ("this is forbidden") without knowing anything about HTTP. The http
 * layer maps `code` → status and to a *safe* client message (audit #8).
 */

export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "invalid_state"
  | "conflict"
  | "internal";

const HTTP_STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 400,
  invalid_state: 409,
  conflict: 409,
  internal: 500,
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.details = details;
  }
}

export const Errors = {
  unauthenticated: (m = "Authentication required") => new DomainError("unauthenticated", m),
  forbidden: (m = "Not permitted") => new DomainError("forbidden", m),
  notFound: (m = "Resource not found") => new DomainError("not_found", m),
  invalidRequest: (m: string, details?: Record<string, unknown>) =>
    new DomainError("invalid_request", m, details),
  invalidState: (m: string) => new DomainError("invalid_state", m),
  conflict: (m: string) => new DomainError("conflict", m),
  internal: (m = "Internal error") => new DomainError("internal", m),
};
