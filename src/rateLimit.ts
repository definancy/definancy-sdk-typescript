/**
 * Parsed rate-limit headers from the most recent response.
 *
 * The Definancy API emits `x-ratelimit-limit`, `x-ratelimit-remaining`,
 * and `x-ratelimit-reset` on every authenticated response. The SDK
 * captures these on each response (success or failure) and exposes them
 * via `client.lastRateLimit`. Useful for partner code that wants to
 * pause before hitting the cap, or to surface remaining budget in UIs.
 */
export interface RateLimitInfo {
  /** Maximum requests in the current window. */
  limit: number;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the current window resets. */
  resetSeconds: number;
}

/**
 * Parse rate-limit headers from a response. Returns `undefined` if any
 * required header is missing or unparseable — callers should treat that
 * as "no rate-limit info available for this response."
 */
export function parseRateLimit(response: Response): RateLimitInfo | undefined {
  const limit = parseIntHeader(response, "x-ratelimit-limit");
  const remaining = parseIntHeader(response, "x-ratelimit-remaining");
  const reset = parseIntHeader(response, "x-ratelimit-reset");
  if (limit === undefined || remaining === undefined || reset === undefined) {
    return undefined;
  }
  return { limit, remaining, resetSeconds: reset };
}

function parseIntHeader(response: Response, name: string): number | undefined {
  const raw = response.headers.get(name);
  if (raw === null) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
