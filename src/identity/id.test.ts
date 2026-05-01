import { describe, expect, it } from "vitest";
import { DefinancyId } from "./id.js";

// A known-good (id, public_key_hex) pair from
// conformance/vectors/id_checksum/rfc_8032_pubkeys.yaml — the first case.
const VALID_ID_STRING = "25NJQAMCWEFLPVKL73J4SZAHHIHOC4XT3KTCGJNPAINGR5YHKENMEF5QTE";
const VALID_PUBKEY_HEX = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

describe("DefinancyId", () => {
  describe("fromString — happy path", () => {
    it("parses a valid 58-char ID string", async () => {
      const id = await DefinancyId.fromString(VALID_ID_STRING);
      expect(id).toBeInstanceOf(DefinancyId);
    });

    it("matches the public key from which it was derived", async () => {
      const fromStr = await DefinancyId.fromString(VALID_ID_STRING);
      const fromKey = DefinancyId.fromPublicKey(hexToBytes(VALID_PUBKEY_HEX));
      expect(Array.from(fromStr.toBytes())).toEqual(Array.from(fromKey.toBytes()));
    });
  });

  describe("fromString — rejection cases", () => {
    it("rejects empty string", async () => {
      await expect(DefinancyId.fromString("")).rejects.toThrow();
    });

    it("rejects a string of the wrong length", async () => {
      // 57 chars instead of 58
      await expect(DefinancyId.fromString("A".repeat(57))).rejects.toThrow();
    });

    it("rejects a string with a too-large length", async () => {
      await expect(DefinancyId.fromString("A".repeat(60))).rejects.toThrow();
    });

    it("rejects valid Base32 of correct length but bad checksum", async () => {
      // Take the valid ID and tweak the last character (which lies in the
      // checksum bytes). The Base32 alphabet excludes 0/1/8/9, so picking a
      // different valid char is safe.
      const lastChar = VALID_ID_STRING.slice(-1);
      const replacement = lastChar === "A" ? "B" : "A";
      const bad = VALID_ID_STRING.slice(0, -1) + replacement;
      expect(bad).not.toBe(VALID_ID_STRING);
      await expect(DefinancyId.fromString(bad)).rejects.toThrow();
    });

    it("rejects malformed Base32 characters", async () => {
      // '0' is not in the Base32 alphabet (which is A-Z, 2-7).
      const bad = "0".repeat(58);
      await expect(DefinancyId.fromString(bad)).rejects.toThrow();
    });
  });

  describe("fromBytes / fromPublicKey input validation", () => {
    it("rejects too-short byte input in fromPublicKey", () => {
      expect(() => DefinancyId.fromPublicKey(new Uint8Array(31))).toThrow();
    });

    it("rejects too-long byte input in fromPublicKey", () => {
      expect(() => DefinancyId.fromPublicKey(new Uint8Array(33))).toThrow();
    });

    it("rejects wrong-length input in fromBytes", () => {
      expect(() => DefinancyId.fromBytes(new Uint8Array(31))).toThrow();
      expect(() => DefinancyId.fromBytes(new Uint8Array(33))).toThrow();
    });
  });

  describe("equality semantics", () => {
    it("two DefinancyId instances built from the same string have equal bytes", async () => {
      const a = await DefinancyId.fromString(VALID_ID_STRING);
      const b = await DefinancyId.fromString(VALID_ID_STRING);
      // Reference equality is NOT expected — but byte equality is.
      expect(a).not.toBe(b);
      expect(Array.from(a.toBytes())).toEqual(Array.from(b.toBytes()));
    });

    it("two DefinancyId instances built from the same public key bytes have equal bytes", () => {
      const bytes = hexToBytes(VALID_PUBKEY_HEX);
      const a = DefinancyId.fromPublicKey(bytes);
      const b = DefinancyId.fromPublicKey(bytes);
      expect(Array.from(a.toBytes())).toEqual(Array.from(b.toBytes()));
    });

    it("toBytes returns a defensive copy (mutation does not affect the ID)", () => {
      const id = DefinancyId.fromPublicKey(hexToBytes(VALID_PUBKEY_HEX));
      const out = id.toBytes();
      out[0] = (out[0] + 1) & 0xff;
      const out2 = id.toBytes();
      expect(out2[0]).not.toBe(out[0]);
    });
  });

  describe("toString round-trip stability", () => {
    it("toString -> fromString -> toString is stable", async () => {
      const original = await DefinancyId.fromString(VALID_ID_STRING);
      const encoded = await original.toString();
      const reparsed = await DefinancyId.fromString(encoded);
      const reEncoded = await reparsed.toString();
      expect(encoded).toBe(VALID_ID_STRING);
      expect(reEncoded).toBe(VALID_ID_STRING);
    });

    it("fromPublicKey -> toString matches the conformance-vector id_string", async () => {
      const id = DefinancyId.fromPublicKey(hexToBytes(VALID_PUBKEY_HEX));
      expect(await id.toString()).toBe(VALID_ID_STRING);
    });
  });
});
