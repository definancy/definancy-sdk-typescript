import type { RequestOptions } from "../options.js";
import type {
  AssetUnit,
  NetworkId,
  Vault,
  VaultConfig,
  VaultId,
} from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Vaults — partner-owned containers that hold subscribed contracts and
 * carry payment-acceptance + document state. Vault IDs are
 * partner-chosen strings. The lifecycle is `set` (create or full
 * replace) → `configure` (partial update) → `archive` (soft delete);
 * `subscribe`/`unsubscribe` add/remove contracts from a vault's enabled
 * set.
 */
export class VaultsResource {
  constructor(private readonly client: RawClient) {}

  /** List all vaults owned by the caller's account. */
  async list(options?: RequestOptions): Promise<Vault[]> {
    const { data } = await this.client.GET("/v1/vault", buildOptions(options));
    return data!;
  }

  /** Get a specific vault by ID. */
  async get(vaultId: VaultId, options?: RequestOptions): Promise<Vault> {
    const { data } = await this.client.GET("/v1/vault/{vaultId}", {
      params: { path: { vaultId } },
      ...buildOptions(options),
    });
    return data!;
  }

  /**
   * Set a vault's full configuration (create or full replace). Use
   * {@link configure} for partial updates.
   */
  async set(
    vaultId: VaultId,
    config: VaultConfig,
    options?: RequestOptions,
  ): Promise<Vault> {
    const { data } = await this.client.PUT("/v1/vault/{vaultId}", {
      params: { path: { vaultId } },
      body: config,
      ...buildOptions(options),
    });
    return data!;
  }

  /** Apply a partial update to a vault's configuration. */
  async configure(
    vaultId: VaultId,
    config: VaultConfig,
    options?: RequestOptions,
  ): Promise<Vault> {
    const { data } = await this.client.PATCH("/v1/vault/{vaultId}", {
      params: { path: { vaultId } },
      body: config,
      ...buildOptions(options),
    });
    return data!;
  }

  /** Archive (soft-delete) a vault. Idempotent — returns 204 on second call. */
  async archive(vaultId: VaultId, options?: RequestOptions): Promise<void> {
    await this.client.DELETE("/v1/vault/{vaultId}", {
      params: { path: { vaultId } },
      ...buildOptions(options),
    });
  }

  /**
   * Subscribe a contract to this vault. Idempotent — re-subscribing a
   * contract that's already active returns 200 with the unchanged Vault.
   */
  async subscribeContract(
    vaultId: VaultId,
    assetUnit: AssetUnit,
    networkId: NetworkId,
    options?: RequestOptions,
  ): Promise<Vault> {
    const { data } = await this.client.PUT(
      "/v1/vault/{vaultId}/contract/{assetUnit}/{networkId}",
      {
        params: { path: { vaultId, assetUnit, networkId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Unsubscribe a contract from this vault. Idempotent. */
  async unsubscribeContract(
    vaultId: VaultId,
    assetUnit: AssetUnit,
    networkId: NetworkId,
    options?: RequestOptions,
  ): Promise<Vault> {
    const { data } = await this.client.DELETE(
      "/v1/vault/{vaultId}/contract/{assetUnit}/{networkId}",
      {
        params: { path: { vaultId, assetUnit, networkId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }
}
