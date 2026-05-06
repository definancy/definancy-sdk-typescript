/**
 * Per-call request options. Passed as the optional last argument on every
 * facade method (`client.vaults.get(id, options)` etc.).
 */
export interface RequestOptions {
  /**
   * Cancellation signal. Forwarded to the underlying fetch. Aborting the
   * signal also short-circuits any pending retry.
   */
  signal?: AbortSignal;

  /**
   * Per-call timeout in milliseconds. Overrides the client-wide
   * `timeout` setting passed to `createClient`. The effective timeout is
   * implemented by composing an `AbortController` with `signal`; if both
   * are set, the request aborts when either fires.
   */
  timeout?: number;

  /**
   * Extra headers to merge onto the request after the SDK's auth + media
   * middleware have run. Use sparingly — most cross-cutting concerns
   * belong in `createClient({ middleware })`.
   */
  headers?: Record<string, string>;
}

/**
 * Retry policy applied to transient failures (HTTP 5xx and 429). Skipped
 * on 2xx, on 4xx (other than 429), and when the per-call `signal` aborts.
 */
export interface RetryPolicy {
  /** Maximum number of attempts including the initial request. Default: 3. */
  maxAttempts: number;

  /** Initial backoff delay before the first retry, in milliseconds. */
  baseDelayMs: number;

  /** Cap on the exponential backoff delay, in milliseconds. */
  maxDelayMs: number;

  /**
   * Optional jitter factor in [0, 1]. The actual delay is sampled uniformly
   * from `[delay * (1 - jitter), delay * (1 + jitter)]`. Default: 0.2.
   */
  jitter?: number;
}

/**
 * Default retry policy. Three attempts, exponential backoff from 200ms to
 * 5s with 20% jitter. `Retry-After` (when present on 429) overrides the
 * computed backoff.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  jitter: 0.2,
};

/**
 * Compute the backoff delay for a given attempt index (0-based) under a
 * retry policy. `retryAfterSeconds` (when set, e.g. parsed from a
 * `Retry-After` header on 429) takes precedence over the computed value.
 */
export function computeBackoffMs(
  attempt: number,
  policy: RetryPolicy,
  retryAfterSeconds?: number,
): number {
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, policy.maxDelayMs);
  }
  const exponential = policy.baseDelayMs * 2 ** attempt;
  const capped = Math.min(exponential, policy.maxDelayMs);
  const jitter = policy.jitter ?? 0;
  if (jitter <= 0) return capped;
  const lower = capped * (1 - jitter);
  const upper = capped * (1 + jitter);
  return lower + Math.random() * (upper - lower);
}
