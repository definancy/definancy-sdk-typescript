import type { DefinancyDid } from "../identity/did.js";
import { createAuthorizationJwt } from "./authorization.js";
import { createDpopProof } from "./dpop-proof.js";
import { jwkThumbprint } from "./jwk.js";
import type { AuthProvider, Authentication } from "./provider.js";
import type { Signer } from "./signer.js";

/**
 * Local authentication provider that signs requests using a local key pair.
 *
 * Produces a signed Authorization JWT + DPoP proof for each request.
 * Matches the Java SDK's `LocalAuthProvider`.
 *
 * @example
 * ```ts
 * const keyPair = await KeyPair.fromSecret(secret);
 * const did = keyPair.computeDid("dev");
 * const provider = new LocalAuthProvider(did, keyPair);
 * ```
 */
export class LocalAuthProvider implements AuthProvider {
  private readonly did: DefinancyDid;
  private readonly signer: Signer;

  constructor(did: DefinancyDid, signer: Signer) {
    this.did = did;
    this.signer = signer;
  }

  async authenticate(
    method: string,
    url: string,
    body: Uint8Array | null,
  ): Promise<Authentication> {
    const parsed = new URL(url);
    const audience = `${parsed.protocol}//${parsed.host}`;
    // RFC 9449 §4.2: htu is the request URI without query and fragment.
    const htu = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

    const jwk = await this.signer.jwk();
    const thumbprint = await jwkThumbprint(jwk);

    // Build and sign Authorization JWT (clock impurity stays at this boundary)
    const iat = Math.floor(Date.now() / 1000);
    const authJwt = await createAuthorizationJwt(this.did, audience, thumbprint, iat, iat + 60);
    authJwt.setSignature(await this.signer.sign(authJwt.encode()));

    // Build and sign DPoP proof (clock + jti impurities stay at this boundary)
    const jti = crypto.randomUUID();
    const dpopIat = Math.floor(Date.now() / 1000);
    const dpopJwt = await createDpopProof(jti, method, htu, body, jwk, dpopIat, dpopIat + 60);
    dpopJwt.setSignature(await this.signer.sign(dpopJwt.encode()));

    return {
      authorization: authJwt.encode(),
      dpop: dpopJwt.encode(),
    };
  }
}
