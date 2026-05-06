import { computeBackoffMs, type RetryPolicy } from "../options.js";

/**
 * Build a `fetch`-compatible function that wraps the supplied `baseFetch`
 * with retry + exponential backoff. Used by `createClient` to install
 * retry behaviour at the transport level — running once per logical
 * request is the wrong layer (the openapi-fetch middleware chain runs
 * once per logical call, not once per HTTP attempt). Wrapping `fetch`
 * makes retries fully transparent to the middleware stack.
 *
 * Retry policy:
 * - 5xx responses: retried up to `policy.maxAttempts`.
 * - 429 responses: retried; honours `Retry-After` header for delay.
 * - Other 4xx responses: NOT retried.
 * - 2xx responses: returned immediately.
 * - Network errors (thrown by `fetch`): retried like 5xx.
 * - `AbortSignal` aborts short-circuit any pending retry.
 */
export function createRetryFetch(
  policy: RetryPolicy,
  baseFetch: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const signal = init?.signal ?? undefined;

    let lastError: unknown;
    let lastResponse: Response | undefined;

    for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException("Aborted", "AbortError");
      }

      try {
        const response = await baseFetch(input, init);
        if (isRetryable(response.status) && attempt + 1 < policy.maxAttempts) {
          const retryAfter = parseRetryAfter(response);
          const delay = computeBackoffMs(attempt, policy, retryAfter);
          // Preserve last response in case a final attempt also fails
          // and we need to surface its body (consumed below by the
          // last-attempt path).
          lastResponse = response;
          await sleep(delay, signal);
          continue;
        }
        return response;
      } catch (e) {
        // Re-throw aborts immediately — never retry an aborted request.
        if (isAbortError(e) || signal?.aborted) {
          throw e;
        }
        lastError = e;
        if (attempt + 1 >= policy.maxAttempts) {
          throw e;
        }
        const delay = computeBackoffMs(attempt, policy);
        await sleep(delay, signal);
      }
    }

    // The loop body either returns a Response or throws. The only path
    // here is "exhausted retries while seeing retryable status" — return
    // the last response so the error middleware can map it to a typed
    // DefinancyError subclass like a single-shot failure.
    if (lastResponse !== undefined) return lastResponse;
    throw lastError ?? new Error("retry: exhausted attempts with no response");
  };
}

function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfter(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (raw === null) return undefined;
  const asInt = Number.parseInt(raw, 10);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt;
  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) {
    return Math.max(0, Math.floor((asDate - Date.now()) / 1000));
  }
  return undefined;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    signal?.addEventListener("abort", onAbort);
  });
}

function isAbortError(e: unknown): boolean {
  return (
    e instanceof DOMException && e.name === "AbortError"
  ) || (
    typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError"
  );
}
