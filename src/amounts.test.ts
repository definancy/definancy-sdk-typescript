import { describe, expect, it } from "vitest";
import {
  amountFromRaw,
  amountFromValue,
  normalizeAmount,
  rawToValue,
  valueToRaw,
} from "./amounts.js";

describe("amounts — language-specific edge cases", () => {
  describe("negative-zero handling", () => {
    it("treats '-0' as '0' in valueToRaw", () => {
      // Pure string arithmetic should not preserve a meaningless sign on zero.
      expect(valueToRaw("-0", 6)).toBe("0");
      expect(valueToRaw("0", 6)).toBe("0");
    });

    it("amountFromValue('-0') and amountFromValue('0') produce the same raw", () => {
      const negZero = amountFromValue("-0", 6);
      const posZero = amountFromValue("0", 6);
      expect(negZero.raw).toBe(posZero.raw);
      expect(negZero.raw).toBe("0");
      // The function preserves the original `value` string, but the raw
      // representation is canonical.
      expect(negZero.decimals).toBe(posZero.decimals);
    });

    it("treats '-0' as '0' in rawToValue", () => {
      expect(rawToValue("-0", 6)).toBe("0");
      expect(rawToValue("0", 6)).toBe("0");
    });

    it("preserves negative sign for non-zero values", () => {
      expect(valueToRaw("-1.5", 6)).toBe("-1500000");
      expect(rawToValue("-1500000", 6)).toBe("-1.5");
    });
  });

  describe("invalid decimals input", () => {
    it("throws on negative decimals in valueToRaw", () => {
      expect(() => valueToRaw("1", -1)).toThrow(RangeError);
    });

    it("throws on non-integer decimals in valueToRaw", () => {
      expect(() => valueToRaw("1", 6.5)).toThrow(RangeError);
    });

    it("throws on negative decimals in rawToValue", () => {
      expect(() => rawToValue("1", -1)).toThrow(RangeError);
    });

    it("throws on non-integer decimals in rawToValue", () => {
      expect(() => rawToValue("1", 6.5)).toThrow(RangeError);
    });

    it("throws when fractional part exceeds decimals", () => {
      expect(() => valueToRaw("1.1234567", 6)).toThrow(RangeError);
    });
  });

  describe("normalizeAmount edge cases", () => {
    it("throws when input has neither value nor raw", () => {
      // @ts-expect-error — intentionally invalid input shape
      expect(() => normalizeAmount({ decimals: 6 })).toThrow();
    });

    it("throws when value-only input has no decimals", () => {
      expect(() => normalizeAmount({ value: "1.5" })).toThrow();
    });

    it("normalizes a value-only input given decimals", () => {
      const out = normalizeAmount({ value: "1.5" }, 6);
      expect(out).toEqual({ value: "1.5", raw: "1500000", decimals: 6 });
    });

    it("normalizes a raw-only input", () => {
      const out = normalizeAmount({ raw: "1500000", decimals: 6 });
      expect(out).toEqual({ value: "1.5", raw: "1500000", decimals: 6 });
    });

    it("returns the input as-is when both raw and value are present", () => {
      const full = { value: "1.5", raw: "1500000", decimals: 6 };
      expect(normalizeAmount(full)).toEqual(full);
    });
  });

  describe("very-large-decimal precision (well past Number.MAX_SAFE_INTEGER)", () => {
    // Number.MAX_SAFE_INTEGER is 2^53 - 1 = 9007199254740991 (16 digits).
    // The conformance vector exercises a 30-ish digit value; here we push
    // into 30+ digits and a high decimals count to confirm we never
    // silently lose precision via floating-point coercion.
    it("preserves a 30-digit integer through valueToRaw at decimals=18", () => {
      const value = "123456789012345678901234567890.123456789012345678";
      const expectedRaw = "123456789012345678901234567890123456789012345678";
      expect(valueToRaw(value, 18)).toBe(expectedRaw);
    });

    it("preserves a 30-digit integer through rawToValue at decimals=18", () => {
      const raw = "123456789012345678901234567890123456789012345678";
      const expectedValue = "123456789012345678901234567890.123456789012345678";
      expect(rawToValue(raw, 18)).toBe(expectedValue);
    });

    it("never produces scientific notation for very-large values", () => {
      const huge = "9".repeat(60);
      const out = rawToValue(huge, 30);
      expect(out).not.toMatch(/e/i);
      expect(out.length).toBeGreaterThan(60); // includes the decimal point
    });

    it("preserves trailing-zero stripping for large fractional parts", () => {
      // 30-digit raw, decimals=20: trailing zeros in fractional part should
      // be stripped.
      const raw = "123456789012345678901234567000000000000";
      const out = rawToValue(raw, 30);
      // Fractional portion ends in ...000000000000 → stripped.
      expect(out.endsWith("0")).toBe(false);
    });
  });

  describe("roundtrip property: valueToRaw(rawToValue(x)) === x", () => {
    const cases: Array<[string, number]> = [
      ["0", 6],
      ["1", 0],
      ["1500000", 6],
      ["10500000", 6],
      ["-1500000", 6],
      ["999999999999999999", 18],
      ["1", 30],
    ];

    for (const [raw, decimals] of cases) {
      it(`raw=${raw}, decimals=${decimals}`, () => {
        const value = rawToValue(raw, decimals);
        const roundtrip = valueToRaw(value, decimals);
        expect(roundtrip).toBe(raw);
      });
    }
  });

  describe("roundtrip property: rawToValue(valueToRaw(v)) === v (canonical form)", () => {
    // Note: only canonical forms (no leading zeros, no trailing zeros after
    // decimal) survive a full roundtrip — that's by design.
    const cases: Array<[string, number]> = [
      ["0", 6],
      ["1.5", 6],
      ["10.5", 6],
      ["1234567890.123456", 6],
      ["-1.5", 6],
    ];

    for (const [value, decimals] of cases) {
      it(`value=${value}, decimals=${decimals}`, () => {
        const raw = valueToRaw(value, decimals);
        const roundtrip = rawToValue(raw, decimals);
        expect(roundtrip).toBe(value);
      });
    }
  });

  describe("amountFromValue / amountFromRaw shape", () => {
    it("amountFromValue produces the expected shape", () => {
      expect(amountFromValue("10.50", 6)).toEqual({
        value: "10.50",
        raw: "10500000",
        decimals: 6,
      });
    });

    it("amountFromRaw produces the expected shape", () => {
      expect(amountFromRaw("10500000", 6)).toEqual({
        value: "10.5",
        raw: "10500000",
        decimals: 6,
      });
    });
  });
});
