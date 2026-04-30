import type { Jwk } from "./jwk.js";

/**
 * Abstraction over cryptographic signing operations.
 *
 * Implementations must provide ED25519 signing and JWK export.
 * The default implementation is `KeyPair`, but custom implementations
 * can be provided (e.g., HSM-backed signers, remote signing services).
 *
 * `sign` accepts either a `string` (UTF-8 encoded internally — the
 * common JWT-signing path: `header_b64 + "." + claims_b64`) or a raw
 * `Uint8Array` (for arbitrary message bytes that don't round-trip
 * through UTF-8, e.g. raw-byte test vectors).
 */
export interface Signer {
  /** Sign a message and return the base64url-encoded signature. */
  sign(input: string | Uint8Array): Promise<string>;

  /** Export the public key as a JWK. */
  jwk(): Promise<Jwk>;
}
