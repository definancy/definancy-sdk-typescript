import type { RequestOptions } from "../options.js";
import type {
  Contract,
  Network,
  NetworkConfig,
  NetworkExplorer,
  NetworkId,
} from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Networks — blockchain networks supported by the daemon. List and
 * inspect available networks; configure their `enabled` state; query
 * the per-network native asset and block-explorer URL templates.
 */
export class NetworksResource {
  constructor(private readonly client: RawClient) {}

  /** List all available networks. */
  async list(options?: RequestOptions): Promise<Network[]> {
    const { data } = await this.client.GET("/v1/network", buildOptions(options));
    return data!;
  }

  /** Get a specific network by ID. */
  async get(networkId: NetworkId, options?: RequestOptions): Promise<Network> {
    const { data } = await this.client.GET("/v1/network/{networkId}", {
      params: { path: { networkId } },
      ...buildOptions(options),
    });
    return data!;
  }

  /** Update a network's configuration (e.g. enable/disable). */
  async configure(
    networkId: NetworkId,
    config: NetworkConfig,
    options?: RequestOptions,
  ): Promise<Network> {
    const { data } = await this.client.PATCH("/v1/network/{networkId}", {
      params: { path: { networkId } },
      body: config,
      ...buildOptions(options),
    });
    return data!;
  }

  /**
   * Get the native-asset contract for this network — the
   * `(asset-unit, network-id)` contract representing the network's
   * native gas/transaction currency (e.g. ETH on `ethereum-*`, ALGO on
   * `algorand-testnet`). Returns a `Contract`, not just an `Asset`.
   */
  async getNative(networkId: NetworkId, options?: RequestOptions): Promise<Contract> {
    const { data } = await this.client.GET("/v1/network/{networkId}/native", {
      params: { path: { networkId } },
      ...buildOptions(options),
    });
    return data!;
  }

  /** Get the block-explorer URL templates for this network. */
  async getExplorer(
    networkId: NetworkId,
    options?: RequestOptions,
  ): Promise<NetworkExplorer> {
    const { data } = await this.client.GET("/v1/network/{networkId}/explorer", {
      params: { path: { networkId } },
      ...buildOptions(options),
    });
    return data!;
  }
}
