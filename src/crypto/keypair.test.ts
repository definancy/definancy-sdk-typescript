import { describe, expect, it } from "vitest";
import { KeyPair } from "./keypair.js";

describe("KeyPair.equals", () => {
  it("returns true for two KeyPairs from the same secret", async () => {
    const seed = "qHWHe6jLnx7gD-CZSe3X2UwgC-ISFOVy4rfFWxxJXX0";
    const a = await KeyPair.fromSecret(seed);
    const b = await KeyPair.fromSecret(seed);
    expect(a.equals(b)).toBe(true);
  });

  it("returns false for two randomly-generated KeyPairs", async () => {
    const a = await KeyPair.generate();
    const b = await KeyPair.generate();
    expect(a.equals(b)).toBe(false);
  });

  it("returns true for self-comparison", async () => {
    const kp = await KeyPair.generate();
    expect(kp.equals(kp)).toBe(true);
  });
});
