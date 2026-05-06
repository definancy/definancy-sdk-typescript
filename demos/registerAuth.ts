/**
 * Demo: register a Definancy ID with the daemon.
 *
 * In `stub` environments the daemon auto-registers on first authenticated
 * call, so this demo is mostly illustrative there. In production it's
 * the onboarding step a partner runs once per DID.
 *
 * Run:
 *   npx tsx demos/registerAuth.ts
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

  const definancyId = await did.id.toString();
  console.log(`Registering ${await did.toString()} ...`);

  try {
    await client.auth.register(definancyId);
    console.log(`OK — DID registered. request-id=${client.lastRequestId}`);
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
