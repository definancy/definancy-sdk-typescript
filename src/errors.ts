import type { ApiError, ErrorList } from "./types.js";

/**
 * Typed error thrown by the Definancy SDK when the API returns a non-2xx
 * response. Discriminated subclasses (`NotFoundError`, `RateLimitError`,
 * `AuthenticationError`, `ValidationError`, `ServerError`) cover the
 * common HTTP status families and let partner code use `instanceof`
 * narrowing instead of inspecting `e.status` / `e.code`.
 *
 * @example
 * ```ts
 * try {
 *   await client.vaults.get("missing-vault");
 * } catch (e) {
 *   if (e instanceof NotFoundError) {
 *     // 404 — typed narrow
 *   }
 *   if (e instanceof DefinancyError) {
 *     console.log(e.status);     // 404
 *     console.log(e.code);       // "VLT-404"
 *     console.log(e.requestId);  // "019dfb..." — useful for support tickets
 *   }
 * }
 * ```
 */
export class DefinancyError extends Error {
  /** HTTP status code from the response. */
  readonly status: number;

  /** Parsed error list from the response body. */
  readonly errors: ErrorList;

  /**
   * Server-issued request ID extracted from the `X-Request-Id` response
   * header. Always set when the daemon answered (every authenticated
   * response carries it); may be `undefined` only if the request never
   * reached the daemon (DNS failure, network unreachable).
   */
  readonly requestId: string | undefined;

  /** The first error in the list (convenience accessor). */
  get code(): string {
    return this.errors[0]?.code ?? "UNKNOWN";
  }

  constructor(status: number, errors: ErrorList, requestId?: string) {
    const primary = errors[0];
    const msg = primary
      ? `${primary.code}: ${primary.message}`
      : `HTTP ${status}`;
    super(msg);
    this.name = "DefinancyError";
    this.status = status;
    this.errors = errors;
    this.requestId = requestId;
  }

  /** Check if any error in the list matches a specific error code. */
  hasCode(code: string): boolean {
    return this.errors.some((e) => e.code === code);
  }

  /** Check if this is an authentication error (HTTP 401). */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Check if this is a forbidden/permission error (HTTP 403). */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /** Check if this is a not-found error (HTTP 404). */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /** Check if this is a conflict error (HTTP 409). */
  isConflict(): boolean {
    return this.status === 409;
  }

  /** Check if this is a validation error (HTTP 400). */
  isValidation(): boolean {
    return this.status === 400;
  }
}

/**
 * Authentication failure (HTTP 401) — request reached the server but the
 * Authorization or DPoP token was rejected. Common causes: token expired,
 * DID not registered for the environment, JKT-binding mismatch.
 */
export class AuthenticationError extends DefinancyError {
  constructor(status: number, errors: ErrorList, requestId?: string) {
    super(status, errors, requestId);
    this.name = "AuthenticationError";
  }
}

/**
 * Resource not found (HTTP 404).
 */
export class NotFoundError extends DefinancyError {
  constructor(status: number, errors: ErrorList, requestId?: string) {
    super(status, errors, requestId);
    this.name = "NotFoundError";
  }
}

/**
 * Validation failure (HTTP 400) — request shape was rejected by the
 * server (missing required field, invalid format, etc.).
 */
export class ValidationError extends DefinancyError {
  constructor(status: number, errors: ErrorList, requestId?: string) {
    super(status, errors, requestId);
    this.name = "ValidationError";
  }
}

/**
 * Rate limit exceeded (HTTP 429). `retryAfterSeconds` reflects the
 * `Retry-After` header when the server set one; `undefined` otherwise.
 * The client's retry middleware already honours this header — this
 * subclass is exposed for partner code that wants to surface the wait
 * time in UI or logs.
 */
export class RateLimitError extends DefinancyError {
  readonly retryAfterSeconds: number | undefined;

  constructor(
    status: number,
    errors: ErrorList,
    requestId?: string,
    retryAfterSeconds?: number,
  ) {
    super(status, errors, requestId);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Server-side error (HTTP 5xx) — the daemon failed to handle the request
 * for an internal reason. The retry middleware will have already retried
 * up to the configured maximum before this surfaces.
 */
export class ServerError extends DefinancyError {
  constructor(status: number, errors: ErrorList, requestId?: string) {
    super(status, errors, requestId);
    this.name = "ServerError";
  }
}

/**
 * Build the most specific `DefinancyError` subclass for the given status
 * code. Used by the error middleware on each non-2xx response.
 */
export function makeError(
  status: number,
  errors: ErrorList,
  requestId?: string,
  retryAfterSeconds?: number,
): DefinancyError {
  if (status === 400) return new ValidationError(status, errors, requestId);
  if (status === 401) return new AuthenticationError(status, errors, requestId);
  if (status === 404) return new NotFoundError(status, errors, requestId);
  if (status === 429) {
    return new RateLimitError(status, errors, requestId, retryAfterSeconds);
  }
  if (status >= 500 && status <= 599) {
    return new ServerError(status, errors, requestId);
  }
  return new DefinancyError(status, errors, requestId);
}

// Re-export the body-shape types alongside the error classes so partner
// code only has to import from one module.
export type { ApiError, ErrorList };
