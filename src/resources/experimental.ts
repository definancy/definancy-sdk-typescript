import type { RequestOptions } from "../options.js";
import type { Status } from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Experimental endpoints reserved for development-environment use. Calls
 * here may evolve faster than the stable surface; partners should not
 * build production flows against them.
 */
export class ExperimentalResource {
  constructor(private readonly client: RawClient) {}

  /** Connectivity probe for the Experimental tag surface. */
  async ping(options?: RequestOptions): Promise<Status> {
    const { data } = await this.client.GET(
      "/v1/experimental/ping",
      buildOptions(options),
    );
    return data!;
  }
}
