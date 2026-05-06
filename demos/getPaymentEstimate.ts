/**
 * Demo: get a payment estimate.
 *
 * Computes the equivalent payable amounts for a target purchase
 * (1.23 EUR on the `target` network) across every contract subscribed
 * to the vault. Run `setVault.ts` first to ensure the vault exists and
 * has contracts subscribed.
 *
 * Run:
 *   npx tsx demos/getPaymentEstimate.ts
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
    const estimate = await client.paymentAcceptances.estimate(VAULT_ID, [
      {
        "contract-id": { "asset-unit": "EUR", "network-id": "target" },
        amount: { value: "1.23" },
      },
    ]);

    if (estimate.scenarios.length === 0) {
      console.log("No payment scenarios found.");
      return;
    }
    console.log("Payment scenarios:");
    for (const scenario of estimate.scenarios) {
      const pay = scenario.pay;
      const cid = pay["contract-id"];
      console.log(
        `  Pay ${pay.amount.value} ${cid["asset-unit"]} on ${cid["network-id"]}`,
      );
    }
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
