import { describe, expect, it } from "vitest";
import { decodeBase32, decodeBase64Url } from "./encoder.js";

describe("decodeBase32 strict alphabet", () => {
  it("throws on input containing characters outside [A-Z2-7]", () => {
    expect(() => decodeBase32("AAA1AAA")).toThrow(/[Ii]nvalid base32/);
    expect(() => decodeBase32("AAA!AAA")).toThrow();
  });
});

describe("decodeBase64Url strict alphabet", () => {
  it("throws on input containing characters outside [A-Za-z0-9_-]", () => {
    expect(() => decodeBase64Url("AAA!AAA")).toThrow();
  });
});
