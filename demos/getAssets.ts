/**
 * Demo: list all assets (currencies / tokens) configured on the daemon.
 *
 * Run:
 *   npx tsx demos/getAssets.ts
 *
 * Environment overrides (optional):
 *   DEFINANCY_BASE_URL  — default https://stub.definancy.com
 *   DEFINANCY_NETWORK   — default "stub"
 *   DEFINANCY_SECRET    — default test seed (RFC-8032-derived)
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

async function main() {
  const keyPair = await KeyPair.fromSecret(SECRET);
  const did = keyPair.computeDid(NETWORK);
  const auth = new LocalAuthProvider(did, keyPair);

  const client = createClient({ baseUrl: BASE_URL, auth });

  try {
    const assets = await client.assets.list();
    if (assets.length === 0) {
      console.log("No assets found.");
      return;
    }
    console.log(`Found ${assets.length} assets:`);
    for (const a of assets) {
      console.log(`  ${a.unit.padEnd(6)}  ${a.info.name}`);
    }
  } catch (e) {
    if (e instanceof DefinancyError) {
      console.error(
        `FAILED status=${e.status} code=${e.code} request-id=${e.requestId}`,
      );
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
