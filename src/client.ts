import createOpenApiClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "../oapi.gen.js";
import { createAuthMiddleware } from "./auth/dpop.js";
import type { AuthProvider } from "./auth/provider.js";
import { createMediaMiddleware } from "./media.js";
import { errorMiddleware } from "./middleware/error.js";
import {
  createRateLimitMiddleware,
  type RateLimitHolder,
} from "./middleware/rateLimit.js";
import {
  createRequestIdMiddleware,
  type RequestIdHolder,
} from "./middleware/requestId.js";
import { createRetryFetch } from "./middleware/retry.js";
import { DEFAULT_RETRY_POLICY, type RetryPolicy } from "./options.js";
import type { RateLimitInfo } from "./rateLimit.js";

import { AssetsResource } from "./resources/assets.js";
import { AuthResource } from "./resources/auth.js";
import { ContractsResource } from "./resources/contracts.js";
import { DocumentsResource } from "./resources/documents.js";
import { ExperimentalResource } from "./resources/experimental.js";
import { HealthResource } from "./resources/health.js";
import { NetworksResource } from "./resources/networks.js";
import { PaymentAcceptancesResource } from "./resources/paymentAcceptances.js";
import { QrCodesResource } from "./resources/qrCodes.js";
import { VaultsResource } from "./resources/vaults.js";
import { VelocityLimitsResource } from "./resources/velocityLimits.js";

/** Well-known Definancy API environments. */
export const ENVIRONMENTS = {
  /** Stub server — `Environment: stub` on the daemon side. */
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
   * Omit for purely-public endpoints (the unauthenticated probes
   * `health.healthy()` / `health.ready()` / `experimental.ping()`).
   *
   * @example
   * ```ts
   * const keyPair = await KeyPair.fromSecret(secret);
   * const did = keyPair.computeDid("stub");
   * const auth = new LocalAuthProvider(did, keyPair);
   * ```
   */
  auth?: AuthProvider;

  /**
   * Base URL used to resolve relative media URLs (logos, icons, etc.)
   * returned by the API. Defaults to `baseUrl`.
   *
   * Set this when the client's `baseUrl` is a local proxy path (e.g.
   * `/stub/`) that cannot be used to resolve media URLs loaded directly
   * by the browser.
   */
  mediaBaseUrl?: Environment | (string & {});

  /**
   * Additional openapi-fetch middleware applied AFTER the SDK's
   * internal middleware (error mapping, request-id capture, rate-limit
   * capture). Use for custom logging, tracing, or business hooks.
   */
  middleware?: Middleware[];

  /**
   * Retry policy applied to transient failures (5xx and 429). Skipped
   * on 2xx, on other 4xx, and on `AbortSignal` aborts. Defaults to
   * 3 attempts with exponential backoff from 200 ms to 5 s.
   */
  retry?: RetryPolicy;

  /**
   * Custom fetch implementation. Defaults to the global `fetch`.
   * Useful for testing (mock fetch) or for environments that need a
   * polyfilled / instrumented fetch.
   */
  fetch?: typeof fetch;
}

/**
 * The Definancy API client — an ergonomic resource-grouped facade
 * over the typed wire layer. Each resource (`vaults`, `networks`,
 * `paymentAcceptances`, etc.) is a namespace of methods that return
 * typed values directly (no `{ data, error }` envelope) and throw a
 * `DefinancyError` subclass on non-2xx.
 *
 * For endpoints not yet wrapped by the facade — or for very low-level
 * use — the underlying typed openapi-fetch client is exposed at `.raw`.
 *
 * The facade also exposes `lastRequestId` and `lastRateLimit` snapshots
 * of the most recent response's metadata (server-issued request ID and
 * `x-ratelimit-*` headers respectively).
 */
export interface DefinancyClient {
  /**
   * Underlying typed openapi-fetch client. Use for spec endpoints not
   * yet wrapped by a facade method, or for direct wire-level access:
   *
   * ```ts
   * const r = await client.raw.GET("/v1/vault/{vaultId}", {
   *   params: { path: { vaultId: "myVault" } },
   * });
   * ```
   */
  readonly raw: Client<paths>;

  /**
   * Server-issued request ID (`X-Request-Id`) of the most recent
   * response, success or failure. `undefined` until the first response.
   */
  readonly lastRequestId: string | undefined;

  /**
   * Parsed `x-ratelimit-*` headers of the most recent response.
   * `undefined` until a response carries rate-limit headers.
   */
  readonly lastRateLimit: RateLimitInfo | undefined;

  /** Liveness / readiness probes (unauthenticated). */
  readonly health: HealthResource;
  /** Auth registration. */
  readonly auth: AuthResource;
  /** Networks: list, get, configure, native asset, explorer. */
  readonly networks: NetworksResource;
  /** Assets: list, get, configure. */
  readonly assets: AssetsResource;
  /** Contracts: list, get, configure. */
  readonly contracts: ContractsResource;
  /** Vaults: list, get, set, configure, archive, subscribe/unsubscribe contracts. */
  readonly vaults: VaultsResource;
  /** Payment acceptances: estimate, create, get, update, archive, link/unlink documents. */
  readonly paymentAcceptances: PaymentAcceptancesResource;
  /** Documents: submit, get, archive. */
  readonly documents: DocumentsResource;
  /** Velocity limits (account- and vault-scope). */
  readonly velocityLimits: VelocityLimitsResource;
  /** QR code generation. */
  readonly qrCodes: QrCodesResource;
  /** Experimental endpoints. */
  readonly experimental: ExperimentalResource;
}

/**
 * Create a Definancy API client.
 *
 * @example
 * ```ts
 * // Unauthenticated (probes only)
 * const client = createClient({ baseUrl: "stub" });
 * const status = await client.health.healthy();
 *
 * // Authenticated
 * const keyPair = await KeyPair.fromSecret(secret);
 * const auth = new LocalAuthProvider(keyPair.computeDid("stub"), keyPair);
 * const client = createClient({ baseUrl: "stub", auth });
 *
 * const vault = await client.vaults.get("myVault");
 * const estimate = await client.paymentAcceptances.estimate("myVault", [...]);
 * ```
 */
export function createClient(options: ClientOptions): DefinancyClient {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const retry = options.retry ?? DEFAULT_RETRY_POLICY;
  const baseFetch = options.fetch ?? fetch;

  // State holders captured by middleware closures so the facade getters
  // always reflect the most recent response.
  const requestIdHolder: RequestIdHolder = { lastRequestId: undefined };
  const rateLimitHolder: RateLimitHolder = { lastRateLimit: undefined };

  const raw = createOpenApiClient<paths>({
    baseUrl,
    fetch: createRetryFetch(retry, baseFetch),
  });

  // Ordering: requestId + rateLimit first so they capture metadata even
  // when subsequent middleware (errorMiddleware) throws. errorMiddleware
  // next so partner middleware sees only successful responses. User
  // middleware last for full composition control.
  raw.use(createRequestIdMiddleware(requestIdHolder));
  raw.use(createRateLimitMiddleware(rateLimitHolder));
  raw.use(errorMiddleware);

  if (options.auth) {
    raw.use(createAuthMiddleware(options.auth));
  }

  const mediaBaseUrl = resolveBaseUrl(options.mediaBaseUrl ?? options.baseUrl);
  raw.use(createMediaMiddleware(mediaBaseUrl));

  if (options.middleware) {
    for (const mw of options.middleware) {
      raw.use(mw);
    }
  }

  return {
    raw,
    get lastRequestId() {
      return requestIdHolder.lastRequestId;
    },
    get lastRateLimit() {
      return rateLimitHolder.lastRateLimit;
    },
    health: new HealthResource(raw),
    auth: new AuthResource(raw),
    networks: new NetworksResource(raw),
    assets: new AssetsResource(raw),
    contracts: new ContractsResource(raw),
    vaults: new VaultsResource(raw),
    paymentAcceptances: new PaymentAcceptancesResource(raw),
    documents: new DocumentsResource(raw),
    velocityLimits: new VelocityLimitsResource(raw),
    qrCodes: new QrCodesResource(raw),
    experimental: new ExperimentalResource(raw),
  };
}

function resolveBaseUrl(input: string): string {
  if (input in ENVIRONMENTS) {
    return ENVIRONMENTS[input as Environment];
  }
  return input;
}
