import type { RequestOptions } from "../options.js";
import type { VaultId, VelocityLimitFormat } from "../types.js";
import { buildOptions, type RawClient } from "./_delegate.js";

/**
 * Velocity limits — rolling-window payment caps. Two scopes:
 *
 * - **Account** (`velocityLimits.account.*`): caps applied across all
 *   vaults owned by the caller's account.
 * - **Vault** (`velocityLimits.vault.*`): per-vault caps, evaluated
 *   in addition to account-scope caps.
 *
 * The `windowMinutes` parameter identifies a specific limit (zero means
 * "single payment cap"); `set` upserts; `delete` removes the limit for
 * that window (idempotent — returns 204 even if absent).
 */
export class VelocityLimitsResource {
  /** Account-scope velocity limits (apply across every vault). */
  readonly account: AccountVelocityLimits;
  /** Vault-scope velocity limits (apply only to a specific vault). */
  readonly vault: VaultVelocityLimits;

  constructor(client: RawClient) {
    this.account = new AccountVelocityLimits(client);
    this.vault = new VaultVelocityLimits(client);
  }
}

/** Account-scope velocity-limit operations. */
export class AccountVelocityLimits {
  constructor(private readonly client: RawClient) {}

  /** List all account-scope velocity limits. */
  async list(options?: RequestOptions): Promise<VelocityLimitFormat[]> {
    const { data } = await this.client.GET(
      "/v1/account/velocity-limits",
      buildOptions(options),
    );
    return data!;
  }

  /** Set (upsert) an account-scope velocity limit. */
  async set(
    config: VelocityLimitFormat,
    options?: RequestOptions,
  ): Promise<VelocityLimitFormat> {
    const { data } = await this.client.POST(
      "/v1/account/velocity-limits",
      {
        body: config,
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Remove the account-scope limit for a window. Idempotent. */
  async delete(windowMinutes: number, options?: RequestOptions): Promise<void> {
    await this.client.DELETE(
      "/v1/account/velocity-limits/{windowMinutes}",
      {
        params: { path: { windowMinutes } },
        ...buildOptions(options),
      },
    );
  }
}

/** Vault-scope velocity-limit operations. */
export class VaultVelocityLimits {
  constructor(private readonly client: RawClient) {}

  /** List all velocity limits configured on the given vault. */
  async list(
    vaultId: VaultId,
    options?: RequestOptions,
  ): Promise<VelocityLimitFormat[]> {
    const { data } = await this.client.GET(
      "/v1/vault/{vaultId}/velocity-limits",
      {
        params: { path: { vaultId } },
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Set (upsert) a vault-scope velocity limit. */
  async set(
    vaultId: VaultId,
    config: VelocityLimitFormat,
    options?: RequestOptions,
  ): Promise<VelocityLimitFormat> {
    const { data } = await this.client.POST(
      "/v1/vault/{vaultId}/velocity-limits",
      {
        params: { path: { vaultId } },
        body: config,
        ...buildOptions(options),
      },
    );
    return data!;
  }

  /** Remove a vault-scope limit for a window. Idempotent. */
  async delete(
    vaultId: VaultId,
    windowMinutes: number,
    options?: RequestOptions,
  ): Promise<void> {
    await this.client.DELETE(
      "/v1/vault/{vaultId}/velocity-limits/{windowMinutes}",
      {
        params: { path: { vaultId, windowMinutes } },
        ...buildOptions(options),
      },
    );
  }
}
