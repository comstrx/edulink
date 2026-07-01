/**
 * CORS with an origin allow-list (audit #20). Configure via the ALLOWED_ORIGINS
 * env (comma-separated); falls back to local dev origins.
 */

const DEFAULT_ALLOWED = ["http://localhost:5173", "http://localhost:8080"];

function allowedOrigins(): string[] {
  const fromEnv = Deno.env.get("ALLOWED_ORIGINS");
  if (!fromEnv) return DEFAULT_ALLOWED;
  return fromEnv.split(",").map((s) => s.trim()).filter(Boolean);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = allowedOrigins();
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Vary": "Origin",
  };
}
