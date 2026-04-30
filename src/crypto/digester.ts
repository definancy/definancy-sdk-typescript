// SHA-512/256 is not registered as a WebCrypto algorithm — `crypto.subtle`
// only supports SHA-1/256/384/512. We use the audited noble/hashes pure-JS
// implementation for portability across Node and browser runtimes.
import { sha512_256 as nobleSha512_256 } from "@noble/hashes/sha2.js";

/**
 * SHA-512/256 hash — the primary digest used for Definancy ID checksums
 * and DPoP body hashing.
 */
export async function sha512_256(data: Uint8Array): Promise<Uint8Array> {
  return nobleSha512_256(data);
}

/**
 * SHA-256 hash — used for JWK thumbprint computation.
 *
 * The `new Uint8Array(data)` copy is a workaround for TypeScript 5.7+
 * narrowing `BufferSource` to `Uint8Array<ArrayBuffer>` (excluding
 * `Uint8Array<ArrayBufferLike>` because the latter could be backed by
 * a `SharedArrayBuffer`). Copying produces a fresh `ArrayBuffer`-backed
 * view that satisfies the type. Runtime cost is negligible for the
 * 30–80 byte canonical-JWK-JSON inputs this function handles.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return new Uint8Array(digest);
}
