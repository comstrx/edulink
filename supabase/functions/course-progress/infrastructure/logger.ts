/**
 * Minimal structured JSON logger (audit #7). One line per event, machine
 * parseable, carrying request context. Swap the sink for pino/OTel in the
 * modular monolith without touching call sites.
 */

import type { Logger } from "../application/ports.ts";

export function createLogger(context: Record<string, unknown>): Logger {
  const emit = (level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>) => {
    const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...context, ...meta });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };

  return {
    info: (msg, meta) => emit("info", msg, meta),
    warn: (msg, meta) => emit("warn", msg, meta),
    error: (msg, meta) => emit("error", msg, meta),
  };
}
