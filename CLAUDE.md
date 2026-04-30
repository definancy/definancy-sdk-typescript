# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript SDK for the Definancy API — an institutional-grade financial services API. Built as a typed wrapper around auto-generated OpenAPI types using `openapi-fetch` as the runtime. Mirrors the patterns from the Java SDK (`java-definancy-sdk`).

## Commands

```bash
npm run build       # Build ESM + CJS + declarations via tsup
npm run typecheck   # Type-check without emitting
```

## Code Generation

`oapi.gen.ts` is auto-generated from the OpenAPI spec. To regenerate:

```bash
cd ../../..   # factory root
task gen-ts
```

Do not hand-edit `oapi.gen.ts` — changes are overwritten on regeneration. Modify the OpenAPI spec at `../../../spec/oapi.yaml` instead.

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
    keypair.ts           ← KeyPair — ED25519 key generation (random or from secret seed)
    digester.ts          ← SHA-512/256 and SHA-256 (node:crypto)
    encoder.ts           ← Base32 and Base64url encoding/decoding
```

**Layering principle:** `oapi.gen.ts` is the foundation. The `src/` wrapper depends on it but never modifies it. When the spec changes, regenerate `oapi.gen.ts` and the wrapper adapts via the same type contracts.

## Key Patterns

- **Dual JWT auth** — each authenticated request sends two headers: `Authorization: DPoP {auth-jwt}` (identifies caller via DID + JWK thumbprint) and `DPoP: {dpop-proof}` (proves key possession + request integrity via body hash). Matches the Java SDK's `LocalAuthProvider`.
- **AuthProvider interface** — pluggable auth strategy. `LocalAuthProvider` signs with a local `KeyPair`; custom implementations can use HSM or remote signing.
- **Signer interface** — abstraction over signing. `KeyPair` is the default implementation.
- **Identity** — `DefinancyId` (32-byte ED25519 public key with SHA-512/256 checksum, Base32-encoded to 58 chars) and `DefinancyDid` (`did:definancy:{network}:{id}`).
- **KeyPair.fromSecret(secret)** — deterministic key generation from base64url-encoded 32-byte seed. Matches Java's `KeyPair.generateKeyPairFromSecret()`.
- **openapi-fetch** is the HTTP runtime — reads the generated `paths` interface for full type safety.
- **Middleware chain:** error middleware (throws `DefinancyError`) → auth middleware → media middleware → user middleware.
- **Amount utilities** use pure string arithmetic — no floating-point — for financial precision.
- **Explorer** — `createExplorer(client)` returns an `Explorer` object with `addressUrl(networkId, address)` and `transactionUrl(networkId, txId)`. Fetches URL templates from `GET /v1/network/{networkId}/explorer` (public, no auth), caches per network, resolves locally by replacing `{value}` placeholder.
- **Media middleware** — `createMediaMiddleware(baseUrl)` resolves relative media URLs in API responses to absolute URLs.
- API environments: `stub` (no auth), `dev` (authenticated). Configurable via `createClient({ baseUrl })`.

## Java SDK Reference

The Java SDK at `../java-definancy-sdk/src/main/java/com/definancy/sdk/` is the reference implementation. When adding features, check the Java version for expected behavior — especially auth flow, ID generation, and JWT structure.
