/**
 * Demo: bootstrap pattern.
 *
 * Discover all networks, assets, and contracts on the daemon, enable
 * any that are disabled, then create or replace `sdkDemoVault` to
 * include every available contract. Idempotent — re-runnable without
 * cleanup.
 *
 * Mirrors the Java demo `APISetVault` and the gateway-demo's setup
 * flow.
 *
 * Run:
 *   npx tsx demos/setVault.ts
 *
 * Environment overrides (optional):
 *   DEFINANCY_BASE_URL  — default https://stub.definancy.com
 *   DEFINANCY_NETWORK   — default "stub"
 *   DEFINANCY_SECRET    — default test seed
 *   DEFINANCY_VAULT     — default "sdkDemoVault"
 */
import {
  createClient,
  KeyPair,
  LocalAuthProvider,
  DefinancyError,
} from "../src/index.js";

const BASE_URL = process.env.DEFINANCY_BASE_URL ?? "https://stub.definancy.com";
const NETWORK = process.env.DEFINANCY_NETWORK ?? "stub";
const SECRET =
  process.env.DEFINANCY_SECRET ??
  "qHWHe6jLnx7gD-CZSe3X2UwgC-ISFOVy4rfFWxxJXX0";
const VAULT_ID = process.env.DEFINANCY_VAULT ?? "sdkDemoVault";

async function main() {
  const keyPair = await KeyPair.fromSecret(SECRET);
  const did = keyPair.computeDid(NETWORK);
  const auth = new LocalAuthProvider(did, keyPair);

  const client = createClient({ baseUrl: BASE_URL, auth });

  try {
    // 1. Enable all disabled networks.
    const networks = await client.networks.list();
    let enabledNetworks = 0;
    for (const n of networks) {
      if (!n.config.enabled) {
        await client.networks.configure(n.id, { enabled: true });
        enabledNetworks++;
      }
    }
    console.log(`Enabled ${enabledNetworks} networks`);

    // 2. Enable all disabled assets.
    const assets = await client.assets.list();
    let enabledAssets = 0;
    for (const a of assets) {
      if (!a.config.enabled) {
        await client.assets.configure(a.unit, { enabled: true });
        enabledAssets++;
      }
    }
    console.log(`Enabled ${enabledAssets} assets`);

    // 3. Enable all disabled contracts.
    const contracts = await client.contracts.list();
    let enabledContracts = 0;
    for (const c of contracts) {
      if (!c.config.enabled) {
        await client.contracts.configure(
          c.id["asset-unit"],
          c.id["network-id"],
          { enabled: true },
        );
        enabledContracts++;
      }
    }
    console.log(`Enabled ${enabledContracts} contracts`);

    // 4. Set the vault to include every available contract.
    const contractIds = contracts.map((c) => ({
      "asset-unit": c.id["asset-unit"],
      "network-id": c.id["network-id"],
    }));

    const vault = await client.vaults.set(VAULT_ID, {
      enabled: true,
      "contract-ids": contractIds,
    });

    console.log(
      `Vault '${vault.id}' set with ${vault.config["contract-ids"]?.length ?? 0} contracts`,
    );
    console.log(`request-id=${client.lastRequestId}`);
  } catch (e) {
    if (e instanceof DefinancyError) {
      console.error(
        `FAILED status=${e.status} code=${e.code} request-id=${e.requestId}`,
      );
      console.error(`  ${e.message}`);
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
