import type { RequestOptions } from "../options.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Auth registration — register a Definancy ID with the daemon so its
 * subsequent DPoP-signed requests are recognized as authenticated. In
 * `stub` environments the daemon auto-registers on first authenticated
 * call, so this endpoint is optional there; in production it's the
 * onboarding step a partner runs once per DID.
 */
export class AuthResource {
  constructor(private readonly client: RawClient) {}

  /**
   * Register a Definancy ID (the base32-encoded portion of a DID).
   * Idempotent: re-registering an existing ID returns 200 with no body.
   */
  async register(definancyId: string, options?: RequestOptions): Promise<void> {
    await this.client.PUT("/v1/auth/{definancyId}", {
      params: { path: { definancyId } },
      ...buildOptions(options),
    });
  }
}
