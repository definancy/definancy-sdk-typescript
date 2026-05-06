import type { Middleware } from "openapi-fetch";
import { parseRateLimit, type RateLimitInfo } from "../rateLimit.js";

/**
 * Internal mutable holder used by the rate-limit middleware.
 * Closed-over by `createClient` so the client object exposes
 * `lastRateLimit` as a getter that always reflects the most recent
 * response's parsed `x-ratelimit-*` headers.
 */
export interface RateLimitHolder {
  lastRateLimit: RateLimitInfo | undefined;
}

/**
 * openapi-fetch middleware that captures the parsed `x-ratelimit-*`
 * headers from each response into the supplied holder.
 */
export function createRateLimitMiddleware(
  holder: RateLimitHolder,
): Middleware {
  return {
    onResponse({ response }) {
      const parsed = parseRateLimit(response);
      if (parsed !== undefined) {
        holder.lastRateLimit = parsed;
      }
    },
  };
}
