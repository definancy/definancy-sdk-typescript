import { sha512_256 } from "../crypto/digester.js";
import { decodeBase32, encodeBase32 } from "../crypto/encoder.js";

const LEN_BYTES = 32;
const CHECKSUM_LEN_BYTES = 4;
const EXPECTED_STR_ENCODED_LEN = 58;

/**
 * A Definancy ID — a 32-byte identifier derived from an ED25519 public key.
 *
 * The string representation is Base32-encoded (no padding) with a 4-byte
 * SHA-512/256 checksum appended, producing a 58-character string.
 *
 * @example
 * ```ts
 * // From a public key (raw 32 bytes)
 * const id = DefinancyId.fromPublicKey(publicKeyBytes);
 * console.log(await id.toString()); // "ZKKXG4KA5PTZ526QA4..."
 *
 * // From an encoded string (validates checksum)
 * const id = await DefinancyId.fromString("ZKKXG4KA5PTZ526QA4...");
 *
 * // From raw bytes
 * const id = DefinancyId.fromBytes(rawBytes);
 * ```
 */
export class DefinancyId {
  private readonly bytes: Uint8Array;

  private constructor(bytes: Uint8Array) {
    if (bytes.length !== LEN_BYTES) {
      throw new Error(`ID must be ${LEN_BYTES} bytes, got ${bytes.length}`);
    }
    this.bytes = new Uint8Array(bytes);
  }

  /** Create an ID from raw 32-byte ED25519 public key material. */
  static fromPublicKey(publicKeyBytes: Uint8Array): DefinancyId {
    if (publicKeyBytes.length !== LEN_BYTES) {
      throw new Error(`Public key must be ${LEN_BYTES} bytes, got ${publicKeyBytes.length}`);
    }
    return new DefinancyId(publicKeyBytes);
  }

  /** Create an ID from raw 32-byte ID material. */
  static fromBytes(bytes: Uint8Array): DefinancyId {
    return new DefinancyId(bytes);
  }

  /**
   * Create an ID from a Base32-encoded string with checksum validation.
   * Throws if the string is malformed or the checksum doesn't match.
   */
  static async fromString(encoded: string): Promise<DefinancyId> {
    if (encoded.length !== EXPECTED_STR_ENCODED_LEN) {
      throw new Error(
        `Expected ${EXPECTED_STR_ENCODED_LEN}-character ID string, got ${encoded.length}`,
      );
    }

    const decoded = decodeBase32(encoded);
    if (decoded.length !== LEN_BYTES + CHECKSUM_LEN_BYTES) {
      throw new Error(
        `Decoded ID must be ${LEN_BYTES + CHECKSUM_LEN_BYTES} bytes, got ${decoded.length}`,
      );
    }

    const idBytes = decoded.slice(0, LEN_BYTES);
    const checksum = decoded.slice(LEN_BYTES, LEN_BYTES + CHECKSUM_LEN_BYTES);

    const hash = await sha512_256(idBytes);
    const expectedChecksum = hash.slice(LEN_BYTES - CHECKSUM_LEN_BYTES);

    if (!constantTimeEqual(checksum, expectedChecksum)) {
      throw new Error("ID checksum validation failed");
    }

    return new DefinancyId(idBytes);
  }

  /** Get the raw 32-byte ID. */
  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }

  /**
   * Encode the ID as a 58-character Base32 string with checksum.
   *
   * Steps:
   * 1. Compute SHA-512/256 of the 32-byte ID
   * 2. Take the last 4 bytes of the hash as checksum
   * 3. Append checksum to ID (36 bytes total)
   * 4. Base32-encode without padding
   */
  async toString(): Promise<string> {
    const hash = await sha512_256(this.bytes);
    const checksum = hash.slice(LEN_BYTES - CHECKSUM_LEN_BYTES);

    const withChecksum = new Uint8Array(LEN_BYTES + CHECKSUM_LEN_BYTES);
    withChecksum.set(this.bytes, 0);
    withChecksum.set(checksum, LEN_BYTES);

    const encoded = encodeBase32(withChecksum);
    if (encoded.length !== EXPECTED_STR_ENCODED_LEN) {
      throw new Error(`Unexpected encoded ID length: ${encoded.length}`);
    }

    return encoded;
  }
}

/** Constant-time comparison to prevent timing attacks on checksum validation. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
