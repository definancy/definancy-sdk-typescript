import type { Middleware } from "openapi-fetch";

/**
 * Internal mutable holder used by the request-id middleware. Closed-over
 * by `createClient` so the client object exposes `lastRequestId` as a
 * getter that always reflects the most recent response.
 */
export interface RequestIdHolder {
  lastRequestId: string | undefined;
}

/**
 * openapi-fetch middleware that captures the `X-Request-Id` header from
 * each response (success or failure) into the supplied holder. Failure
 * responses also surface the request ID via `DefinancyError.requestId`
 * (set by `errorMiddleware`); this middleware exposes it for successful
 * responses too, so partners can log/trace successful calls.
 */
export function createRequestIdMiddleware(
  holder: RequestIdHolder,
): Middleware {
  return {
    onResponse({ response }) {
      const id = response.headers.get("x-request-id");
      holder.lastRequestId = id ?? undefined;
    },
  };
}
