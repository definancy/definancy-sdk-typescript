import type { RequestOptions } from "../options.js";
import type { Asset, AssetConfig, AssetUnit } from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Assets — fungible asset definitions (currencies, tokens). List and
 * inspect catalog entries; configure their `enabled` state.
 */
export class AssetsResource {
  constructor(private readonly client: RawClient) {}

  /** List all available assets. */
  async list(options?: RequestOptions): Promise<Asset[]> {
    const { data } = await this.client.GET("/v1/asset", buildOptions(options));
    return data!;
  }

  /** Get a specific asset by unit (e.g. "EUR", "BTC", "USDC"). */
  async get(assetUnit: AssetUnit, options?: RequestOptions): Promise<Asset> {
    const { data } = await this.client.GET("/v1/asset/{assetUnit}", {
      params: { path: { assetUnit } },
      ...buildOptions(options),
    });
    return data!;
  }

  /** Update an asset's configuration (e.g. enable/disable). */
  async configure(
    assetUnit: AssetUnit,
    config: AssetConfig,
    options?: RequestOptions,
  ): Promise<Asset> {
    const { data } = await this.client.PATCH("/v1/asset/{assetUnit}", {
      params: { path: { assetUnit } },
      body: config,
      ...buildOptions(options),
    });
    return data!;
  }
}
