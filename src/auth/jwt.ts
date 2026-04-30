import { encodeBase64Url } from "../crypto/encoder.js";

/**
 * Minimal JWT implementation for Definancy auth tokens.
 *
 * Handles encoding header + claims as base64url segments and
 * appending a signature. No external JWT library needed.
 */
export class Jwt {
  private header: Record<string, unknown>;
  private claims: Record<string, unknown>;
  private signature: string | null = null;

  constructor(header: Record<string, unknown>, claims: Record<string, unknown>) {
    this.header = header;
    this.claims = claims;
  }

  /** Set the base64url-encoded signature. */
  setSignature(signature: string): void {
    this.signature = signature;
  }

  /**
   * Encode as `header.claims` (unsigned) or `header.claims.signature` (signed).
   *
   * JSON properties are sorted alphabetically to match Java's canonical encoding.
   */
  encode(): string {
    const h = encodeBase64Url(new TextEncoder().encode(sortedJsonStringify(this.header)));
    const c = encodeBase64Url(new TextEncoder().encode(sortedJsonStringify(this.claims)));

    if (this.signature === null) {
      return `${h}.${c}`;
    }

    return `${h}.${c}.${this.signature}`;
  }
}

/**
 * JSON.stringify with keys sorted alphabetically RECURSIVELY (matches
 * Java's SORT_PROPERTIES_ALPHABETICALLY which is recursive by default).
 *
 * The previous implementation passed `Object.keys(obj).sort()` as the
 * replacer argument to `JSON.stringify`. That argument is a **whitelist
 * of allowed property names that applies recursively** — at every
 * nesting level, only keys named in the array are emitted. So
 * `{cnf:{jkt:"x"}}` with replacer `["cnf"]` produced `{"cnf":{}}`
 * because `jkt` wasn't whitelisted. This silently truncated the
 * Authorization JWT's `cnf.jkt` and the DPoP header's embedded JWK.
 *
 * Fix: pre-canonicalize the object structure (recursively rebuild every
 * object with keys in sorted order, leaving primitives and arrays
 * untouched), then `JSON.stringify` with no replacer. The output is
 * still valid JSON; key ordering is now stable across nesting depths.
 */
function sortedJsonStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(canonicalize(obj));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const input = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(input).sort()) {
    sorted[key] = canonicalize(input[key]);
  }
  return sorted;
}
