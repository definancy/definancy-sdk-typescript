import type { Middleware } from "openapi-fetch";
import type { ApiError, ErrorList } from "./types.js";

/**
 * Typed error thrown by the Definancy SDK when the API returns a non-2xx response.
 *
 * @example
 * ```ts
 * try {
 *   await client.GET("/v1/vault/{vaultId}", { params: { path: { vaultId: "x" } } });
 * } catch (e) {
 *   if (e instanceof DefinancyError) {
 *     console.log(e.status);       // 404
 *     console.log(e.errors);       // [{ code: "VLT-404", message: "Vault not found" }]
 *     console.log(e.errors[0].code); // "VLT-404"
 *   }
 * }
 * ```
 */
export class DefinancyError extends Error {
  /** HTTP status code from the response. */
  readonly status: number;

  /** Parsed error list from the response body. */
  readonly errors: ErrorList;

  /** The first error in the list (convenience accessor). */
  get code(): string {
    return this.errors[0]?.code ?? "UNKNOWN";
  }

  constructor(status: number, errors: ErrorList) {
    const primary = errors[0];
    const msg = primary
      ? `${primary.code}: ${primary.message}`
      : `HTTP ${status}`;
    super(msg);
    this.name = "DefinancyError";
    this.status = status;
    this.errors = errors;
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
 * openapi-fetch middleware that intercepts non-2xx responses and throws
 * a DefinancyError with the parsed error body.
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
      // Body wasn't JSON — fall through with empty errors
    }

    throw new DefinancyError(response.status, errors);
  },
};
