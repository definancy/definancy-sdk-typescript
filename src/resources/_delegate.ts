import type { Client } from "openapi-fetch";
import type { paths } from "../../oapi.gen.js";
import type { RequestOptions } from "../options.js";

/**
 * Type alias for the underlying typed openapi-fetch client. Resource
 * modules hold a reference to this and delegate every method call to
 * `client.GET / .POST / ...` with merged options.
 */
export type RawClient = Client<paths>;

/**
 * Build the openapi-fetch options shape from the user's RequestOptions.
 * Merges per-call timeout into the AbortSignal so callers can use either
 * (or both, in which case the request aborts on whichever fires first).
 */
export function buildOptions(opts?: RequestOptions): {
  signal?: AbortSignal;
  headers?: Record<string, string>;
} {
  const result: { signal?: AbortSignal; headers?: Record<string, string> } = {};

  const signal = composeSignal(opts);
  if (signal !== undefined) result.signal = signal;
  if (opts?.headers !== undefined) result.headers = opts.headers;

  return result;
}

function composeSignal(opts?: RequestOptions): AbortSignal | undefined {
  if (opts === undefined) return undefined;
  const userSignal = opts.signal;
  const timeout = opts.timeout;

  if (timeout !== undefined && userSignal !== undefined) {
    // AbortSignal.any composes multiple signals: aborts when any fires.
    // Available in Node 20+ and modern browsers.
    return AbortSignal.any([userSignal, AbortSignal.timeout(timeout)]);
  }
  if (timeout !== undefined) return AbortSignal.timeout(timeout);
  return userSignal;
}
