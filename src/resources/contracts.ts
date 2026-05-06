import type { RequestOptions } from "../options.js";
import type {
  AssetUnit,
  Contract,
  ContractConfig,
  NetworkId,
} from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Contracts — `(asset-unit, network-id)` tuples representing the
 * asset's deployment on a specific network (e.g. USDC on Ethereum
 * Sepolia, EUR on the target network). List, inspect, and toggle
 * `enabled` per contract.
 */
export class ContractsResource {
  constructor(private readonly client: RawClient) {}

  /** List all available contracts. */
  async list(options?: RequestOptions): Promise<Contract[]> {
    const { data } = await this.client.GET("/v1/contract", buildOptions(options));
    return data!;
  }

  /** Get a specific contract. */
  async get(
    assetUnit: AssetUnit,
    networkId: NetworkId,
    options?: RequestOptions,
  ): Promise<Contract> {
    const { data } = await this.client.GET(
      "/v1/contract/{assetUnit}/{networkId}",
      {
        params: { path: { assetUnit, networkId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Update a contract's configuration (e.g. enable/disable). */
  async configure(
    assetUnit: AssetUnit,
    networkId: NetworkId,
    config: ContractConfig,
    options?: RequestOptions,
  ): Promise<Contract> {
    const { data } = await this.client.PATCH(
      "/v1/contract/{assetUnit}/{networkId}",
      {
        params: { path: { assetUnit, networkId } },
        body: config,
        ...buildOptions(options),
      },
    );
    return data!;
  }
}
