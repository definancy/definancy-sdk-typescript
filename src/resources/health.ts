import type { RequestOptions } from "../options.js";
import type { Status } from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Health probes — service liveness and readiness. Both endpoints are
 * unauthenticated (no DPoP required).
 */
export class HealthResource {
  constructor(private readonly client: RawClient) {}

  /** Liveness check. Returns OK when the daemon is operational. */
  async healthy(options?: RequestOptions): Promise<Status> {
    const { data } = await this.client.GET("/v1/healthy", buildOptions(options));
    return data!;
  }

  /** Readiness check. Returns OK when the daemon is ready to accept traffic. */
  async ready(options?: RequestOptions): Promise<Status> {
    const { data } = await this.client.GET("/v1/ready", buildOptions(options));
    return data!;
  }
}
