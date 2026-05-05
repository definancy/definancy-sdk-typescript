# CLAUDE.md

Guidance for AI assistants (Claude Code, Copilot, Cursor, etc.) working
in this repository.

## Project Overview

TypeScript SDK for the
[Definancy API](https://github.com/definancy/definancy-spec) — a typed
wrapper around auto-generated OpenAPI types using
[`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) as the HTTP
runtime. Hand-written auth, identity, and crypto layers implement
DPoP-style request signing on top of Ed25519. Ships ESM + CJS dual
exports plus `.d.ts` declarations.

The sibling [Java SDK](https://github.com/definancy/definancy-sdk-java)
implements the same wire protocol — cross-language behavior parity is
enforced by [shared golden vectors](https://github.com/definancy/definancy-spec/tree/main/conformance).

## Commands

```bash
npm install
npm run build       # Build ESM + CJS + declarations via tsup
npm run typecheck   # Type-check without emitting
npm test            # Run vitest unit tests
npm run conformance # Run conformance suite (requires definancy-spec checkout — see below)
```

## Code Generation

`oapi.gen.ts` is auto-generated from the upstream OpenAPI spec at
[`definancy-spec`](https://github.com/definancy/definancy-spec). This
repo ships the generated file ready to use — regeneration happens
upstream, not here. **Don't hand-edit `oapi.gen.ts`** — it gets
overwritten by the next regeneration.

Wire-shape changes (paths, schemas, security schemes) belong in the
spec repo; new SDK releases pick up the updated spec.

## Architecture

```
oapi.gen.ts              ← generated types (paths, components, operations) — never edit
src/
  index.ts               ← public API surface — all exports go through here
  client.ts              ← createClient() factory, wires openapi-fetch + middleware
  types.ts               ← convenience type aliases (Vault, Asset, NetworkExplorer, etc.)
  amounts.ts             ← Amount conversion (fromValue, fromRaw) — pure string arithmetic
  errors.ts              ← DefinancyError class + error middleware
  explorer.ts            ← createExplorer() — cached block explorer URL resolver
  media.ts               ← createMediaMiddleware() — resolves relative media URLs
  auth/
    dpop.ts              ← createAuthMiddleware() — attaches Authorization + DPoP headers
    authorization.ts     ← Authorization JWT (DID, audience, JWK thumbprint confirmation)
    dpop-proof.ts        ← DPoP proof JWT (method, URI, body hash)
    jwt.ts               ← JWT encoding with sorted-key canonical JSON
    jwk.ts               ← JWK creation + RFC 7638 thumbprint (SHA-256)
    signer.ts            ← Signer interface (sign + jwk)
    provider.ts          ← AuthProvider interface + Authentication result type
    local-provider.ts    ← LocalAuthProvider — signs with local KeyPair
  identity/
    id.ts                ← DefinancyId — checksum-validated IDs (Base32 + SHA-512/256)
    did.ts               ← DefinancyDid — did:definancy:{network}:{id}
  crypto/
    keypair.ts           ← KeyPair — Ed25519 key generation (random or from secret seed)
    digester.ts          ← SHA-512/256 and SHA-256 (node:crypto)
    encoder.ts           ← Base32 and Base64url encoding/decoding
conformance/
  runner.ts              ← loads shared golden vectors and asserts byte-identical output
```

**Layering principle:** `oapi.gen.ts` is the foundation. The `src/`
wrapper depends on it but never modifies it. When the upstream spec
changes, a new `oapi.gen.ts` ships and the wrapper adapts via the same
type contracts.

## Key Patterns

- **Dual JWT auth** — each authenticated request sends two headers:
  `Authorization: DPoP {auth-jwt}` (identifies caller via DID + JWK
  thumbprint) and `DPoP: {dpop-proof}` (proves key possession + request
  integrity via body hash). Behavior matches the sibling Java SDK
  byte-for-byte.
- **AuthProvider interface** — pluggable auth strategy. `LocalAuthProvider`
  signs with a local `KeyPair`; custom implementations can use HSM or
  remote signing.
- **Signer interface** — abstraction over signing. `KeyPair` is the
  default implementation.
- **Identity** — `DefinancyId` (32-byte Ed25519 public key with
  SHA-512/256 checksum, Base32-encoded to 58 chars) and `DefinancyDid`
  (`did:definancy:{network}:{id}`).
- **`KeyPair.fromSecret(secret)`** — deterministic key generation from a
  base64url-encoded 32-byte seed.
- **openapi-fetch** is the HTTP runtime — reads the generated `paths`
  interface for full type safety.
- **Middleware chain:** error middleware (throws `DefinancyError`) → auth
  middleware → media middleware → user middleware.
- **Amount utilities** use pure string arithmetic — no floating-point —
  for financial precision.
- **Explorer** — `createExplorer(client)` returns an `Explorer` object
  with `addressUrl(networkId, address)` and
  `transactionUrl(networkId, txId)`. Fetches URL templates from
  `GET /v1/network/{networkId}/explorer` (public, no auth), caches per
  network, resolves locally by replacing `{value}` placeholder.
- **Media middleware** — `createMediaMiddleware(baseUrl)` resolves
  relative media URLs in API responses to absolute URLs.
- API environments: `stub` (no auth), `dev` (authenticated). Configurable
  via `createClient({ baseUrl })`.

## Cross-language conformance

Hand-written domain code (auth, identity, crypto, amount math) must
produce byte-identical output to the sibling
[Java SDK](https://github.com/definancy/definancy-sdk-java) for every
input. This is enforced by golden vectors hosted in the
[spec repo](https://github.com/definancy/definancy-spec/tree/main/conformance).

The runner walks up from the SDK directory looking for
`spec/conformance/vectors/`. To run conformance locally, clone the spec
repo as a sibling:

```bash
# In the parent directory of this repo:
git clone https://github.com/definancy/definancy-spec.git spec
# Then back in this SDK:
npm run conformance
```

A failed conformance test is a release-blocking bug — it means this SDK
disagrees with the wire contract. Fix the code; never relax the vector.
