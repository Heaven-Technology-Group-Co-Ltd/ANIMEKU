// Structured server-side logging for P3.6 observability.
// Machine-searchable, simple, no secrets, no full payloads.

export type StructuredTag = "api:captions" | "api:autogenerate" | "anilist";

export type StructuredEvent =
  | "degradation"
  | "failure"
  | "timeout"
  | "rate_limit"
  | "upstream_error"
  | "fallback"
  | "cache_hit"
  | "cache_miss";

export function structuredLog(
  tag: StructuredTag,
  event: StructuredEvent,
  fields: Record<string, string | number | boolean | undefined>,
): void {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== null);
  const pairs = entries.map(([k, v]) => {
    const s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
    if (/[ =\t"]/.test(s)) {
      return `${k}="${s.replace(/"/g, "\\\"")}"`;
    }
    return `${k}=${s}`;
  });
  const msg = `[${tag}] event=${event}${pairs.length ? " " + pairs.join(" ") : ""}`;
  console.error(msg);
}
