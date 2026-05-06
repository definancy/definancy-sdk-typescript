import type { Middleware } from "openapi-fetch";
import { makeError } from "../errors.js";
import type { ErrorList } from "../types.js";

/**
 * openapi-fetch middleware that intercepts non-2xx responses, parses the
 * structured `ErrorList` body, and throws the most specific
 * `DefinancyError` subclass (`NotFoundError`, `RateLimitError`,
 * `AuthenticationError`, `ValidationError`, `ServerError`).
 *
 * The thrown error always carries the response's `X-Request-Id` (if
 * present) so partner support tickets can be traced server-side. On
 * 429s, the `Retry-After` header is parsed and attached as
 * `RateLimitError.retryAfterSeconds`.
 */
export const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return;

    let errors: ErrorList = [];
    try {
      const body = await response.clone().json();
      if (Array.isArray(body)) {
        errors = body as ErrorList;
      }
    } catch {
      // Body wasn't JSON — fall through with empty errors.
    }

    const requestId = response.headers.get("x-request-id") ?? undefined;
    const retryAfterSeconds = parseRetryAfter(response);

    throw makeError(response.status, errors, requestId, retryAfterSeconds);
  },
};

/**
 * Parse the `Retry-After` header into seconds. RFC 9110 allows two
 * forms — delta-seconds (an integer) or HTTP-date — we accept both.
 * Returns `undefined` if absent or unparseable.
 */
function parseRetryAfter(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (raw === null) return undefined;

  const asInt = Number.parseInt(raw, 10);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return asInt;
  }
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) {
    return Math.max(0, Math.floor((asDate - Date.now()) / 1000));
  }
  return undefined;
}
