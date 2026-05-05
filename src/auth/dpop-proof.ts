import { sha512_256 } from "../crypto/digester.js";
import { encodeBase64Url } from "../crypto/encoder.js";
import type { Jwk } from "./jwk.js";
import { Jwt } from "./jwt.js";

/**
 * DPoP (Demonstrating Proof-of-Possession) proof JWT per RFC 9449.
 *
 * Header: `{ alg: "EdDSA", typ: "DPoP+JWT", jwk: { ... } }`
 * Claims:
 * - `jti`: unique token ID
 * - `htm`: HTTP method
 * - `htu`: request URI without query and fragment (RFC 9449 §4.2)
 * - `iat` / `exp`: issued-at and expiry (epoch seconds)
 * - `bsh`: SHA-512/256 hash of request body (if present)
 *
 * `iat` and `exp` are explicit parameters (no implicit `Date.now()`).
 * `id` (jti) is also explicit. The factory stays a pure data
 * transformation; impurities (clock, randomness) live at the call
 * boundary (e.g. `LocalAuthProvider.authenticate`). This shape lets
 * conformance vectors pin specific values for byte-exact cross-language
 * comparison.
 */
export async function createDpopProof(
  id: string,
  method: string,
  uri: string,
  body: Uint8Array | null,
  jwk: Jwk,
  iat: number,
  exp: number,
): Promise<Jwt> {
  let bodyHash: string | undefined;
  if (body !== null && body.length > 0) {
    const digest = await sha512_256(body);
    bodyHash = encodeBase64Url(digest);
  }

  const header: Record<string, unknown> = {
    alg: "EdDSA",
    jwk: { crv: jwk.crv, kty: jwk.kty, x: jwk.x },
    typ: "DPoP+JWT",
  };

  const claims: Record<string, unknown> = {
    exp,
    htm: method,
    htu: uri,
    iat,
    jti: id,
  };

  if (bodyHash !== undefined) {
    claims.bsh = bodyHash;
  }

  return new Jwt(header, claims);
}
