import type { DefinancyClient } from "./client.js";

type Templates = {
  addressUrl: string;
  transactionUrl: string;
};

/**
 * Network block explorer URL resolver with template caching.
 *
 * Fetches URL templates from the API once per network (via
 * `client.networks.getExplorer`), then resolves all subsequent URLs
 * locally by replacing the `{value}` placeholder.
 *
 * @example
 * ```ts
 * const explorer = createExplorer(client);
 * const url = await explorer.addressUrl("bitcoin-testnet4", "tb1q...");
 * // → "https://mempool.space/testnet4/address/tb1q..."
 * ```
 */
export interface Explorer {
  addressUrl(networkId: string, address: string): Promise<string>;
  transactionUrl(networkId: string, txId: string): Promise<string>;
}

export function createExplorer(client: DefinancyClient): Explorer {
  const cache = new Map<string, Templates>();

  async function getTemplates(networkId: string): Promise<Templates> {
    const cached = cache.get(networkId);
    if (cached) return cached;

    const data = await client.networks.getExplorer(networkId);

    const templates: Templates = {
      addressUrl: data["address-url"],
      transactionUrl: data["transaction-url"],
    };

    cache.set(networkId, templates);
    return templates;
  }

  return {
    async addressUrl(networkId: string, address: string): Promise<string> {
      const t = await getTemplates(networkId);
      return t.addressUrl.replace("{value}", address);
    },

    async transactionUrl(networkId: string, txId: string): Promise<string> {
      const t = await getTemplates(networkId);
      return t.transactionUrl.replace("{value}", txId);
    },
  };
}
