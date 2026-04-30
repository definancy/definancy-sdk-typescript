import type { Middleware } from "openapi-fetch";
import type { AuthProvider } from "./provider.js";

/**
 * Creates an openapi-fetch middleware that attaches Definancy DPoP
 * authentication headers to every request.
 *
 * Each request gets two headers:
 * - `Authorization: DPoP {authorization-jwt}` — identifies the caller via DID
 * - `DPoP: {dpop-proof-jwt}` — proves possession of the private key
 *
 * The DPoP proof includes a SHA-512/256 hash of the request body (`bsh` claim)
 * when a body is present, ensuring request integrity.
 *
 * @example
 * ```ts
 * const keyPair = await KeyPair.fromSecret(secret);
 * const did = keyPair.computeDid("dev");
 * const provider = new LocalAuthProvider(did, keyPair);
 * const middleware = createAuthMiddleware(provider);
 * ```
 */
export function createAuthMiddleware(provider: AuthProvider): Middleware {
  return {
    async onRequest({ request }) {
      // Read the request body if present
      let body: Uint8Array | null = null;
      if (request.body) {
        const cloned = request.clone();
        const bodyBuffer = await cloned.arrayBuffer();
        body = new Uint8Array(bodyBuffer);
      }

      const auth = await provider.authenticate(request.method, request.url, body);

      request.headers.set("Authorization", `DPoP ${auth.authorization}`);
      request.headers.set("DPoP", auth.dpop);
    },
  };
}
