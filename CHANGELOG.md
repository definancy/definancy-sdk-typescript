# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
