import { sha256 } from "../crypto/digester.js";
import { encodeBase64Url } from "../crypto/encoder.js";

/**
 * JSON Web Key (RFC 7517) for ED25519 keys.
 *
 * Properties are ordered alphabetically for canonical representation,
 * which is required for thumbprint computation (RFC 7638).
 */
export interface Jwk {
  readonly crv: string;
  readonly kty: string;
  readonly x: string;
}

/** Create a JWK from an ED25519 public key's raw bytes. */
export function createJwk(publicKeyBytes: Uint8Array): Jwk {
  return {
    crv: "Ed25519",
    kty: "OKP",
    x: encodeBase64Url(publicKeyBytes),
  };
}

/**
 * Compute the JWK thumbprint (RFC 7638) — SHA-256 of the canonical
 * JSON representation with lexicographically sorted keys.
 *
 * Used in the Authorization JWT's `cnf` (confirmation) claim to bind
 * the token to a specific key.
 */
export async function jwkThumbprint(jwk: Jwk): Promise<string> {
  // RFC 7638: canonical JSON with sorted keys
  const canonical = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
  const hash = await sha256(new TextEncoder().encode(canonical));
  return encodeBase64Url(hash);
}
