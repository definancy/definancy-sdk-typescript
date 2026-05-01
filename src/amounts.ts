import type { Amount, AmountFormat, AmountRaw, AmountValue, Decimals } from "./types.js";

/**
 * Create an Amount from a human-readable decimal value string.
 *
 * @example
 * ```ts
 * const amt = amountFromValue("10.50", 6);
 * // { value: "10.50", raw: "10500000", decimals: 6 }
 * ```
 */
export function amountFromValue(value: string, decimals: Decimals): Amount {
  const raw = valueToRaw(value, decimals);
  return { value, raw, decimals };
}

/**
 * Create an Amount from a raw integer string (smallest unit).
 *
 * @example
 * ```ts
 * const amt = amountFromRaw("10500000", 6);
 * // { value: "10.5", raw: "10500000", decimals: 6 }
 * ```
 */
export function amountFromRaw(raw: string, decimals: Decimals): Amount {
  const value = rawToValue(raw, decimals);
  return { value, raw, decimals };
}

/**
 * Convert a human-readable decimal value to a raw integer string.
 *
 * Uses pure string arithmetic — no floating-point.
 */
export function valueToRaw(value: string, decimals: Decimals): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new RangeError(`decimals must be a non-negative integer, got ${decimals}`);
  }
  if (value === "") {
    throw new RangeError("value must not be empty");
  }

  const negative = value.startsWith("-");
  const abs = negative ? value.slice(1) : value;

  const dotIndex = abs.indexOf(".");
  let intPart: string;
  let fracPart: string;

  if (dotIndex === -1) {
    intPart = abs;
    fracPart = "";
  } else {
    intPart = abs.slice(0, dotIndex);
    fracPart = abs.slice(dotIndex + 1);
  }

  if (intPart === "" && fracPart === "") {
    throw new RangeError(`value "${value}" has no digits`);
  }

  if (fracPart.length > decimals) {
    throw new RangeError(
      `value "${value}" has ${fracPart.length} decimal places, but only ${decimals} are allowed`,
    );
  }

  // Pad fractional part to the right with zeros
  const paddedFrac = fracPart.padEnd(decimals, "0");
  const raw = stripLeadingZeros(intPart + paddedFrac);

  return negative && raw !== "0" ? `-${raw}` : raw;
}

/**
 * Convert a raw integer string to a human-readable decimal value.
 *
 * Uses pure string arithmetic — no floating-point.
 */
export function rawToValue(raw: string, decimals: Decimals): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new RangeError(`decimals must be a non-negative integer, got ${decimals}`);
  }
  if (raw === "") {
    throw new RangeError("raw must not be empty");
  }

  const negative = raw.startsWith("-");
  const abs = negative ? raw.slice(1) : raw;

  if (decimals === 0) {
    const val = stripLeadingZeros(abs);
    return negative && val !== "0" ? `-${val}` : val;
  }

  // Pad the absolute value so it has at least `decimals + 1` digits
  const padded = abs.padStart(decimals + 1, "0");

  const intPart = stripLeadingZeros(padded.slice(0, padded.length - decimals));
  const fracPart = stripTrailingZeros(padded.slice(padded.length - decimals));

  const value = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  return negative && value !== "0" ? `-${value}` : value;
}

/**
 * Normalize an AmountFormat (which can be value-only or raw-only) into a
 * complete Amount (both value and raw).
 *
 * Requires decimals when the input is value-only, since decimals cannot be
 * inferred from the value alone.
 */
export function normalizeAmount(input: AmountFormat, decimals?: Decimals): Amount {
  const hasValue = "value" in input && input.value !== undefined;
  const hasRaw = "raw" in input && input.raw !== undefined;

  if (hasRaw && hasValue) {
    // Already a full Amount
    return input as Amount;
  }

  if (hasRaw) {
    const rawInput = input as AmountRaw;
    return amountFromRaw(rawInput.raw, rawInput.decimals);
  }

  if (hasValue) {
    if (decimals === undefined) {
      throw new Error(
        "decimals is required when normalizing an AmountValue (value-only) to Amount",
      );
    }
    return amountFromValue((input as AmountValue).value, decimals);
  }

  throw new Error("AmountFormat must have either 'value' or 'raw'");
}

function stripLeadingZeros(s: string): string {
  const stripped = s.replace(/^0+/, "");
  return stripped.length === 0 ? "0" : stripped;
}

function stripTrailingZeros(s: string): string {
  return s.replace(/0+$/, "");
}
