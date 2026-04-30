import type { DefinancyDid } from "../identity/did.js";
import { Jwt } from "./jwt.js";

/**
 * Authorization JWT — identifies the caller via DID and binds to a DPoP key.
 *
 * Header: `{ alg: "EdDSA", typ: "JWT" }`
 * Claims:
 * - `iss` / `sub`: DID string
 * - `aud`: audience URL (scheme + host + port)
 * - `iat` / `exp`: issued-at and expiry (epoch seconds)
 * - `cnf.jkt`: JWK thumbprint binding to the DPoP proof key
 *
 * `iat` and `exp` are explicit parameters (no implicit `Date.now()`).
 * The factory stays a pure data transformation; clock impurity lives at
 * the call boundary (e.g. `LocalAuthProvider.authenticate`). This shape
 * lets conformance vectors pin specific timestamps for byte-exact
 * cross-language comparison.
 */
export async function createAuthorizationJwt(
  did: DefinancyDid,
  audience: string,
  jwkThumbprint: string,
  iat: number,
  exp: number,
): Promise<Jwt> {
  const header = {
    alg: "EdDSA" as const,
    typ: "JWT" as const,
  };

  const didStr = await did.toString();

  const claims = {
    aud: audience,
    cnf: { jkt: jwkThumbprint },
    exp,
    iat,
    iss: didStr,
    sub: didStr,
  };

  return new Jwt(header, claims);
}
