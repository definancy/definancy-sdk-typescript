# @definancy/sdk

TypeScript SDK for the [Definancy API](https://github.com/definancy/definancy-spec).

## What it is

A typed client for the Definancy platform. The wire layer is generated from
the OpenAPI spec and powered by [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/);
the auth, identity, and crypto layers are hand-written for byte-identical
behavior with the sibling Java SDK. Ships ESM + CJS dual exports plus
`.d.ts` declarations.

## Install

The package is published to GitHub Packages under the `@definancy` scope
(restricted access). Configure `.npmrc` in your project root:

```
@definancy:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` must be a Personal Access Token with `read:packages`. Then:

```bash
npm install @definancy/sdk
```

## Quickstart

```typescript
import {
  createClient,
  KeyPair,
  LocalAuthProvider,
} from "@definancy/sdk";

// Deterministic key from a base64url-encoded 32-byte seed
const keyPair = await KeyPair.fromSecret(process.env.DEFINANCY_SECRET!);
const did = keyPair.computeDid("dev");

const client = createClient({
  baseUrl: "dev",
  auth: new LocalAuthProvider(did, keyPair),
});

const { data, error } = await client.GET("/v1/vault/{vaultId}", {
  params: { path: { vaultId: "my-vault" } },
});
if (error) throw error;
console.log(data);
```

The `stub` environment runs without authentication — omit `auth` to use it.

## Public API

- **Client** — `createClient`, `ENVIRONMENTS`, `ClientOptions`,
  `DefinancyClient`, `Environment`
- **Auth** — `createAuthMiddleware`, `LocalAuthProvider`, `AuthProvider`,
  `Authentication`, `Signer`, `createJwk`, `jwkThumbprint`, `Jwk`
- **Identity** — `DefinancyId`, `DefinancyDid`
- **Crypto** — `KeyPair`
- **Errors** — `DefinancyError`, `errorMiddleware`
- **Media** — `createMediaMiddleware`
- **Explorer** — `createExplorer`, `Explorer`
- **Amounts** — `amountFromValue`, `amountFromRaw`, `valueToRaw`,
  `rawToValue`, `normalizeAmount`
- **Generated types** — `paths`, `components`, `operations`, `ApiPaths`,
  plus convenience aliases (`Vault`, `Asset`, `Network`, `PaymentAcceptance`,
  ...). See `src/types.ts` for the full list.

## Auth model

Each authenticated request carries two JWTs. The `Authorization: DPoP <jwt>`
header identifies the caller via DID and a JWK thumbprint confirmation
claim. The `DPoP` header is a fresh proof JWT that attests key possession
plus request integrity (HTTP method, target URI, and a SHA-256 hash of
the body). Both JWTs are Ed25519-signed.

`AuthProvider` is the pluggable interface. `LocalAuthProvider` signs with
a local `KeyPair`; implement your own for HSM-backed or remote signing.

## Build from source

```bash
npm install
npm run build       # tsup → ESM + CJS + .d.ts in dist/
npm run typecheck   # tsc --noEmit
```

## Requirements

- Node.js 20+
- ES2022-compatible consumer; ESM is the primary entry, CJS is provided
  via `require` exports

## Releases

Tagged releases (with the published `.tgz` attached) live at
<https://github.com/definancy/definancy-sdk-typescript/releases>.

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability reporting policy.

## License

MIT
