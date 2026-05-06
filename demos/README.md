# SDK demos

End-to-end examples that exercise the public facade against
`https://stub.definancy.com` (or any other Definancy daemon supplied
via env). Each demo is a standalone Node script — no test runner, no
build step — designed as the shortest path from "the SDK works on my
machine" to "I built something with it."

Run any demo with `tsx`:

```bash
npx tsx demos/getAssets.ts
```

## Recommended order

| Order | Demo | What it does |
|---|---|---|
| 1 | `registerAuth.ts` | Register the test DID with the daemon. Stub auto-registers on first call, but production needs this once per DID. |
| 2 | `getAssets.ts` | List available assets — minimum read demo, verifies auth works end-to-end. |
| 3 | `setVault.ts` | Bootstrap pattern: enable all networks/assets/contracts, then set `sdkDemoVault` to include every contract. Idempotent. |
| 4 | `getPaymentEstimate.ts` | After step 3, estimate the cost of paying 1.23 EUR. |

## Configuration

Each demo reads these environment variables (with defaults targeting
the deployed stub):

| Variable | Default |
|---|---|
| `DEFINANCY_BASE_URL` | `https://stub.definancy.com` |
| `DEFINANCY_NETWORK` | `stub` |
| `DEFINANCY_SECRET` | a baked-in RFC-8032-derived test seed |
| `DEFINANCY_VAULT` | `sdkDemoVault` |

The defaults are deliberately permissive so a fresh checkout can
`npx tsx demos/getAssets.ts` and see something work. **Don't ship the
default secret to production.**

## Patterns these demos illustrate

- **Construct the client once** — `createClient({ baseUrl, auth })` returns the facade. Reuse it across calls.
- **Resource-grouped methods** — `client.assets.list()`, `client.vaults.set(...)` etc. Type-safe; each method returns the typed value directly (no `{ data, error }` envelope).
- **Errors are typed exceptions** — wrap calls in `try/catch (e: DefinancyError)`. Subclasses (`NotFoundError`, `RateLimitError`, etc.) cover the common HTTP-status families.
- **Request IDs for support** — every error carries `e.requestId`; successful responses surface the most recent ID via `client.lastRequestId`. Include this in any partner-support ticket.
- **Escape hatch** — `client.raw.GET(...)` is the typed openapi-fetch handle for endpoints not yet wrapped by the facade.

## Going further

For the full set of resources and methods, see the project root
`README.md` and the per-resource doc-comments in
`src/resources/*.ts`. The Java SDK ships an equivalent demo set under
`languages/java/sdk/demos/`.
