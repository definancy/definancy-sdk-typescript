# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — BREAKING
- **Tier-3 facade.** `createClient()` now returns a resource-grouped
  client: `client.vaults.get(id)`, `client.assets.list()`,
  `client.paymentAcceptances.estimate(vaultId, [...])`, etc. Eleven
  namespaces (`health`, `auth`, `networks`, `assets`, `contracts`,
  `vaults`, `paymentAcceptances`, `documents`, `velocityLimits`,
  `qrCodes`, `experimental`) cover all 39 spec operations. Methods
  throw `DefinancyError` (or a subclass) on non-2xx and return the
  parsed body directly — no more `{ data, error }` tuples on the
  primary surface.
- **`client.raw`** — escape hatch exposing the underlying `openapi-fetch`
  handle. Use for spec endpoints not yet wrapped by the facade
  (`client.raw.GET("/v1/...", ...)`).
- **Discriminated error subclasses** — `NotFoundError`, `RateLimitError`,
  `AuthenticationError`, `ValidationError`, `ServerError` extend
  `DefinancyError` and let partner code use `instanceof` narrowing.
  `DefinancyError.requestId` carries the `X-Request-Id` from the
  response for support-ticket correlation.
- **Per-call options** — every facade method accepts an optional final
  `RequestOptions { signal?, timeout?, headers? }` argument.
- **Built-in retry** — exponential backoff + jitter on 429 / 5xx,
  honouring `Retry-After`. Default policy ships pre-wired; configurable
  via `createClient({ retry })`.
- **Rate-limit + request-ID introspection** — `client.lastRequestId`
  and `client.lastRateLimit` expose the most recent values parsed from
  response headers.

### Changed — BREAKING
- **`createClient()` return shape** flipped from the bare
  `openapi-fetch` `Client<paths>` to the new `DefinancyClient` facade.
  Migrate `client.GET/POST/PUT/PATCH/DELETE(...)` call sites to
  `client.<resource>.<op>(...)`, or use `client.raw.<METHOD>(...)` to
  keep the pre-existing wire-level call shape.

### Fixed
- **DPoP `htu` claim** now follows RFC 9449 §4.2 (scheme + authority + path,
  no query, no fragment), replacing the previous audience-only value
  (scheme + host) that diverged from spec. Servers strictly validating
  `htu` against the request URI will now accept proofs that previously
  would have been rejected.

### Changed
- **Conformance runner** loads vectors from `spec/conformance/vectors/`
  (the conformance suite consolidated into the spec submodule —
  `definancy-spec` repo).

### Documentation
- README upstream link updated `definancy-api` → `definancy-spec` (the
  spec repo was renamed; the old URL still redirects).
- `CLAUDE.md` rewritten for standalone-clone consumers — removed
  references to upstream tooling and replaced relative cross-repo paths
  with public GitHub URLs.

## [0.3.0] - 2026-05-02

CI maintenance only. No SDK code changes; the published package contents are
identical to 0.2.0.

### Changed
- `.github/workflows/publish.yml` Node 20 → 24 (current LTS, project-wide policy).

## [0.2.0] - 2026-05-01

Cleanup MINOR — TS parity for 2 of the 5 latent defects flagged by 0.1.0.
The other 3 defects (Ed25519PublicKey null, hashCode, defensive copy) are
Java-class-specific and have no TS equivalent.

### Changed (BREAKING)
- `rawToValue("")` now throws `RangeError`. Previously returned `"0"`
  (empty input fell through `padStart` logic). Brings `rawToValue`
  consistent with the 0.1.0 `valueToRaw` tightening.
- `valueToRaw("-")` (and any input that has a sign but no digits, e.g.
  `"-."`) now throws `RangeError`. Previously returned `"0"`. Same class
  of "empty fell through" bug as the 0.1.0 fix, applied to a different
  input shape.

### Migration
- Catch `RangeError` at any call site that was relying on either silent
  behavior.

## [0.1.0] - 2026-05-01

### Added
- `DefinancyId.equals(other)` — value-based equality on the 32-byte
  payload, constant-time. Matches the Java SDK's `ID.equals`.
- `KeyPair.equals(other)` — value-based equality on public + private key
  bytes, constant-time. Matches Java SDK's `KeyPair.equals`.

### Changed (BREAKING)
- `valueToRaw("")` now throws `RangeError`. Previously returned `"0"` —
  empty input fell through padding logic. Same behavioral fix as Java
  `AmountMath.valueToRaw("")`.

### Internal
- `KeyPair` now stores the raw 32-byte private key seed alongside the
  `CryptoKey` reference (required to make `equals` synchronous).
  Consumers should treat `KeyPair` instances as sensitive — don't
  serialize or log them. Use `export()` to obtain a base64url-encoded
  seed for storage.

## [0.0.3] - 2026-05-01

### Added
- Vitest-based unit test layer (`src/**/*.test.ts`) covering
  TypeScript-specific edge cases that the cross-language conformance
  vectors don't reach: error class semantics, middleware composition,
  identity edge cases, and amount-math JS-number-boundary precision.
- `npm test` and `npm run test:watch` scripts.

## [0.0.2] - 2026-05-01

### Added
- Partner-facing `README.md` covering install, quickstart, public API map,
  auth model, and build instructions.
- `SECURITY.md` with vulnerability reporting policy and supported-versions
  matrix.

## [0.0.1] - 2026-05-01

### Added
- Initial release.
