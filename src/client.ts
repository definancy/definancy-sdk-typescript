import createOpenApiClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "../oapi.gen.js";
import { createAuthMiddleware } from "./auth/dpop.js";
import type { AuthProvider } from "./auth/provider.js";
import { errorMiddleware } from "./errors.js";
import { createMediaMiddleware } from "./media.js";

/** Well-known Definancy API environments. */
export const ENVIRONMENTS = {
  /** Stub server — authentication is disabled. */
  stub: "https://stub.definancy.com",
  /** Development server. */
  dev: "https://dev.definancy.com",
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

/** Configuration for creating a Definancy client. */
export interface ClientOptions {
  /**
   * API base URL. Accepts a well-known environment name or a custom URL.
   *
   * @example
   * ```ts
   * createClient({ baseUrl: "stub" })
   * createClient({ baseUrl: "dev", auth: provider })
   * createClient({ baseUrl: "https://custom.example.com" })
   * ```
   */
  baseUrl: Environment | (string & {});

  /**
   * Authentication provider. Required for authenticated environments.
   * Omit for the stub environment where auth is disabled.
   *
   * Use `LocalAuthProvider` for local key-based auth, or implement
   * `AuthProvider` for custom strategies (HSM, remote signing, etc.).
   *
   * @example
   * ```ts
   * const keyPair = await KeyPair.fromSecret(secret);
   * const did = keyPair.computeDid("dev");
   * const auth = new LocalAuthProvider(did, keyPair);
   * ```
   */
  auth?: AuthProvider;

  /**
   * Base URL used to resolve relative media URLs (logos, icons, etc.)
   * returned by the API. Defaults to `baseUrl`.
   *
   * Set this when the client's `baseUrl` is a local proxy path (e.g. `/stub/`)
   * that cannot be used to resolve media URLs loaded directly by the browser.
   *
   * @example
   * ```ts
   * createClient({ baseUrl: "/stub/", mediaBaseUrl: "stub" })
   * ```
   */
  mediaBaseUrl?: Environment | (string & {});

  /**
   * Additional openapi-fetch middleware to apply (executed in order).
   */
  middleware?: Middleware[];
}

/** The Definancy API client — a fully typed openapi-fetch Client\<paths\>. */
export type DefinancyClient = Client<paths>;

/**
 * Create a type-safe Definancy API client.
 *
 * @example
 * ```ts
 * // Unauthenticated (stub)
 * const client = createClient({ baseUrl: "stub" });
 * const { data } = await client.GET("/v1/healthy");
 *
 * // Authenticated (dev)
 * const keyPair = await KeyPair.fromSecret(secret);
 * const did = keyPair.computeDid("dev");
 * const client = createClient({
 *   baseUrl: "dev",
 *   auth: new LocalAuthProvider(did, keyPair),
 * });
 * const { data } = await client.GET("/v1/vault/{vaultId}", {
 *   params: { path: { vaultId: "my-vault" } },
 * });
 * ```
 */
export function createClient(options: ClientOptions): DefinancyClient {
  const baseUrl = resolveBaseUrl(options.baseUrl);

  const client = createOpenApiClient<paths>({ baseUrl });

  // Error middleware first — wraps all subsequent middleware
  client.use(errorMiddleware);

  // Auth middleware (Authorization + DPoP)
  if (options.auth) {
    client.use(createAuthMiddleware(options.auth));
  }

  // Media URL resolution — resolve relative media URLs to absolute
  const mediaBaseUrl = resolveBaseUrl(options.mediaBaseUrl ?? options.baseUrl);
  client.use(createMediaMiddleware(mediaBaseUrl));

  // User-supplied middleware
  if (options.middleware) {
    for (const mw of options.middleware) {
      client.use(mw);
    }
  }

  return client;
}

function resolveBaseUrl(input: string): string {
  if (input in ENVIRONMENTS) {
    return ENVIRONMENTS[input as Environment];
  }
  return input;
}
