import type { Jwk } from "../auth/jwk.js";
import { createJwk } from "../auth/jwk.js";
import type { Signer } from "../auth/signer.js";
import { DefinancyDid } from "../identity/did.js";
import { DefinancyId } from "../identity/id.js";
import { decodeBase64Url, encodeBase64Url } from "./encoder.js";

/**
 * ED25519 key pair implementing the Signer interface.
 *
 * Supports both random generation and deterministic generation from a
 * base64url-encoded secret (matching Java's `KeyPair.generateKeyPairFromSecret`).
 *
 * @example
 * ```ts
 * // Random generation
 * const kp = await KeyPair.generate();
 *
 * // Deterministic from secret (matches Java SDK)
 * const kp = await KeyPair.fromSecret("qHWHe6jLnx7gD-CZSe3X2UwgC-ISFOVy4rfFWxxJXX0");
 *
 * // Get DID
 * const did = await kp.computeDid("dev");
 * console.log(did.toString()); // "did:definancy:dev:ZKKXG4KA5..."
 *
 * // Export secret for storage
 * const secret = await kp.export();
 * ```
 */
export class KeyPair implements Signer {
  private readonly privateKey: CryptoKey;
  private readonly publicKey: CryptoKey;
  private readonly rawPublicKey: Uint8Array;

  private constructor(
    privateKey: CryptoKey,
    publicKey: CryptoKey,
    rawPublicKey: Uint8Array,
  ) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.rawPublicKey = rawPublicKey;
  }

  /** Generate a random ED25519 key pair. */
  static async generate(): Promise<KeyPair> {
    const result = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const pair = result as { privateKey: CryptoKey; publicKey: CryptoKey };
    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    return new KeyPair(pair.privateKey, pair.publicKey, rawPub);
  }

  /**
   * Generate a key pair deterministically from a base64url-encoded 32-byte secret.
   *
   * This matches the Java SDK's `KeyPair.generateKeyPairFromSecret(secret)`.
   * The secret is the raw ED25519 private key seed.
   */
  static async fromSecret(secret: string): Promise<KeyPair> {
    const seed = decodeBase64Url(secret);
    if (seed.length !== 32) {
      throw new Error(`Secret must be 32 bytes (base64url-encoded), got ${seed.length}`);
    }

    // Import the seed as a PKCS#8 ED25519 private key
    // ED25519 PKCS#8 wrapping: ASN.1 prefix + seed
    const pkcs8 = new Uint8Array([
      0x30, 0x2e,             // SEQUENCE (46 bytes)
      0x02, 0x01, 0x00,       // INTEGER 0 (version)
      0x30, 0x05,             // SEQUENCE (5 bytes)
      0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
      0x04, 0x22,             // OCTET STRING (34 bytes)
      0x04, 0x20,             // OCTET STRING (32 bytes)
      ...seed,                // 32-byte private key seed
    ]);

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      "Ed25519",
      true,
      ["sign"],
    );

    // Derive public key by exporting as JWK and re-importing as verify-only
    const jwk = await crypto.subtle.exportKey("jwk", privateKey);
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x },
      "Ed25519",
      true,
      ["verify"],
    );

    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
    return new KeyPair(privateKey, publicKey, rawPub);
  }

  /** Export the private key seed as a base64url-encoded string. */
  async export(): Promise<string> {
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", this.privateKey));
    // Extract the 32-byte seed from PKCS#8 wrapping (skip ASN.1 prefix)
    const seed = pkcs8.slice(pkcs8.length - 32);
    return encodeBase64Url(seed);
  }

  /** Get the raw 32-byte public key. */
  publicKeyBytes(): Uint8Array {
    return new Uint8Array(this.rawPublicKey);
  }

  /** Compute the Definancy ID from this key pair's public key. */
  computeId(): DefinancyId {
    return DefinancyId.fromPublicKey(this.rawPublicKey);
  }

  /** Compute the DID for this key pair on a given network. */
  computeDid(network: string): DefinancyDid {
    return new DefinancyDid(network, this.computeId());
  }

  /**
   * Sign a message and return the base64url-encoded signature. Accepts
   * either a string (UTF-8 encoded internally) or raw bytes — the
   * latter for arbitrary message bytes that don't round-trip through
   * UTF-8 (e.g. raw-byte conformance vectors).
   */
  async sign(input: string | Uint8Array): Promise<string> {
    // The `new Uint8Array(...)` copy on the bytes branch satisfies TS 5.7+'s
    // narrower `BufferSource` (excludes `Uint8Array<SharedArrayBuffer>`).
    const data =
      typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
    const signature = await crypto.subtle.sign("Ed25519", this.privateKey, data);
    return encodeBase64Url(new Uint8Array(signature));
  }

  /** Export the public key as a JWK. */
  async jwk(): Promise<Jwk> {
    return createJwk(this.rawPublicKey);
  }
}
