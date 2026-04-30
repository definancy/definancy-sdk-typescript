/**
 * Cross-language conformance runner — TypeScript SDK.
 *
 * Loads YAML test vectors from the factory's `conformance/vectors/` tree
 * and asserts that the SDK's hand-written domain code produces byte-identical
 * outputs. Reports `<name>:<label> PASS|FAIL` per case and exits non-zero on
 * any failure.
 *
 * Usage:
 *   npm run conformance
 *
 * Vectors live at `<factory>/conformance/vectors/<domain>/<scenario>.yaml`.
 * The runner expects to be executed from inside the factory checkout (the
 * relative path traversal below assumes this layout).
 *
 * See `<factory>/conformance/README.md` for the schema, encoding-suffix
 * conventions, and YAML rules. Vectors encode CORRECT behavior; failing
 * cases here are SDK bugs to fix, not vectors to relax.
 */

import yaml from "js-yaml";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import fastGlob from "fast-glob";

import {
  encodeBase32,
  decodeBase32,
  encodeBase64Url,
  decodeBase64Url,
} from "../src/crypto/encoder.js";
import { sha256, sha512_256 } from "../src/crypto/digester.js";
import { KeyPair } from "../src/crypto/keypair.js";
import { DefinancyId } from "../src/identity/id.js";
import { DefinancyDid } from "../src/identity/did.js";
import { createJwk, jwkThumbprint } from "../src/auth/jwk.js";
import { Jwt } from "../src/auth/jwt.js";
import { createAuthorizationJwt } from "../src/auth/authorization.js";
import { createDpopProof } from "../src/auth/dpop-proof.js";
import { valueToRaw, rawToValue } from "../src/amounts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// languages/typescript/sdk/conformance → … → factory
const VECTORS_ROOT = join(__dirname, "../../../../conformance/vectors");

interface VectorCase {
  label: string;
  input: Record<string, string>;
  output: Record<string, string>;
}

interface VectorFile {
  name: string;
  description: string;
  metadata?: Record<string, string>;
  cases: VectorCase[];
}

let passed = 0;
let failed = 0;
let skipped = 0;

function report(name: string, label: string, ok: boolean, diag = ""): void {
  const status = ok ? "PASS" : "FAIL";
  const suffix = diag ? ` ${diag}` : "";
  console.log(`${name}:${label} ${status}${suffix}`);
  if (ok) {
    passed++;
  } else {
    failed++;
  }
}

function skip(name: string, label: string, reason: string): void {
  console.log(`${name}:${label} SKIP ${reason}`);
  skipped++;
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

async function loadVectors(domain: string): Promise<VectorFile[]> {
  const pattern = `${domain}/*.yaml`;
  const files = await fastGlob(pattern, { cwd: VECTORS_ROOT, absolute: true });
  return files.map((f) => yaml.load(readFileSync(f, "utf8")) as VectorFile);
}

// =============================================================================
// Domain: base32
// =============================================================================
async function runBase32(): Promise<void> {
  for (const vec of await loadVectors("base32")) {
    for (const c of vec.cases) {
      // encode
      const inputBytes = hexToBytes(c.input.bytes_hex);
      const actualEncoded = encodeBase32(inputBytes);
      report(
        vec.name,
        `${c.label}/encode`,
        actualEncoded === c.output.encoded,
        actualEncoded === c.output.encoded
          ? ""
          : `expected="${c.output.encoded}" actual="${actualEncoded}"`,
      );

      // decode round-trip
      try {
        const decodedHex = bytesToHex(decodeBase32(c.output.encoded));
        report(
          vec.name,
          `${c.label}/decode`,
          decodedHex === c.input.bytes_hex,
          decodedHex === c.input.bytes_hex
            ? ""
            : `expected_hex="${c.input.bytes_hex}" actual_hex="${decodedHex}"`,
        );
      } catch (err) {
        report(vec.name, `${c.label}/decode`, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: base64url
// =============================================================================
async function runBase64Url(): Promise<void> {
  for (const vec of await loadVectors("base64url")) {
    for (const c of vec.cases) {
      // encode
      const inputBytes = hexToBytes(c.input.bytes_hex);
      const actualEncoded = encodeBase64Url(inputBytes);
      report(
        vec.name,
        `${c.label}/encode`,
        actualEncoded === c.output.encoded,
        actualEncoded === c.output.encoded
          ? ""
          : `expected="${c.output.encoded}" actual="${actualEncoded}"`,
      );

      // decode round-trip
      try {
        const decodedHex = bytesToHex(decodeBase64Url(c.output.encoded));
        report(
          vec.name,
          `${c.label}/decode`,
          decodedHex === c.input.bytes_hex,
          decodedHex === c.input.bytes_hex
            ? ""
            : `expected_hex="${c.input.bytes_hex}" actual_hex="${decodedHex}"`,
        );
      } catch (err) {
        report(vec.name, `${c.label}/decode`, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: sha256
// =============================================================================
async function runSha256(): Promise<void> {
  for (const vec of await loadVectors("sha256")) {
    for (const c of vec.cases) {
      try {
        const actualHex = bytesToHex(await sha256(hexToBytes(c.input.bytes_hex)));
        report(
          vec.name,
          c.label,
          actualHex === c.output.digest_hex,
          actualHex === c.output.digest_hex
            ? ""
            : `expected="${c.output.digest_hex}" actual="${actualHex}"`,
        );
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: ed25519
//
// Two operations per case:
//   1. derive_pubkey(seed) — always run
//   2. sign(seed, message) — only when the message is empty or a clean UTF-8
//      string. The current SDK sign() takes a JS string and TextEncoder-
//      encodes it to UTF-8; arbitrary message bytes (e.g. RFC 8032 Test 3's
//      `af82`) can't be round-tripped through that API. The skip is
//      documented per case so the failure mode is visible.
// =============================================================================
async function runEd25519(): Promise<void> {
  for (const vec of await loadVectors("ed25519")) {
    for (const c of vec.cases) {
      const seedHex = c.input.seed_hex;
      const messageHex = c.input.message_hex;
      const expectedPubHex = c.output.public_key_hex;
      const expectedSigHex = c.output.signature_hex;

      // derive_pubkey
      let kp: KeyPair;
      try {
        const seedB64Url = encodeBase64Url(hexToBytes(seedHex));
        kp = await KeyPair.fromSecret(seedB64Url);
      } catch (err) {
        report(vec.name, `${c.label}/derive_pubkey`, false, `error="${(err as Error).message}"`);
        continue;
      }
      const actualPubHex = bytesToHex(kp.publicKeyBytes());
      report(
        vec.name,
        `${c.label}/derive_pubkey`,
        actualPubHex === expectedPubHex,
        actualPubHex === expectedPubHex
          ? ""
          : `expected="${expectedPubHex}" actual="${actualPubHex}"`,
      );

      // sign — pass raw bytes directly; the SDK's sign() accepts Uint8Array
      // for arbitrary message bytes that don't round-trip through UTF-8.
      try {
        const messageBytes = hexToBytes(messageHex);
        const sigB64Url = await kp.sign(messageBytes);
        const sigBytes = decodeBase64Url(sigB64Url);
        const actualSigHex = bytesToHex(sigBytes);
        report(
          vec.name,
          `${c.label}/sign`,
          actualSigHex === expectedSigHex,
          actualSigHex === expectedSigHex
            ? ""
            : `expected="${expectedSigHex}" actual="${actualSigHex}"`,
        );
      } catch (err) {
        report(vec.name, `${c.label}/sign`, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: sha512_256
//
// Note: this domain is expected to FAIL today — the TS SDK calls
// `crypto.subtle.digest("SHA-512/256", ...)` which is not a registered
// WebCrypto algorithm. See `algorithms/sha512_256.md`. The vectors are
// kept active so the runner reports the failure as a documented red
// state until Session 3 swaps in a real SHA-512/256.
// =============================================================================
async function runSha512_256(): Promise<void> {
  for (const vec of await loadVectors("sha512_256")) {
    for (const c of vec.cases) {
      try {
        const actualHex = bytesToHex(await sha512_256(hexToBytes(c.input.bytes_hex)));
        report(
          vec.name,
          c.label,
          actualHex === c.output.digest_hex,
          actualHex === c.output.digest_hex
            ? ""
            : `expected="${c.output.digest_hex}" actual="${actualHex}"`,
        );
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: id_checksum
//
// Composition test: DefinancyId.fromPublicKey(pubkey).toString() should
// equal the expected id_string. The SDK's toString() computes the
// SHA-512/256 checksum internally, so this domain is also expected to
// FAIL until the sha512_256 bug is fixed (same root cause).
// =============================================================================
async function runIdChecksum(): Promise<void> {
  for (const vec of await loadVectors("id_checksum")) {
    for (const c of vec.cases) {
      try {
        const id = DefinancyId.fromPublicKey(hexToBytes(c.input.public_key_hex));
        const actual = await id.toString();
        report(
          vec.name,
          c.label,
          actual === c.output.id_string,
          actual === c.output.id_string
            ? ""
            : `expected="${c.output.id_string}" actual="${actual}"`,
        );
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: did_parse
//
// `did:definancy:{network}:{id}` formatting. The SDK produces this via
// `DefinancyDid.toString()` which delegates to `DefinancyId.toString()`,
// so this transitively hits the sha512_256 bug too.
// =============================================================================
async function runDidParse(): Promise<void> {
  for (const vec of await loadVectors("did_parse")) {
    for (const c of vec.cases) {
      try {
        // The vector input is `(network, id_string)`; the SDK only knows
        // how to construct DefinancyId from a public key or its string
        // form. We reconstruct via fromString (which itself calls
        // sha512_256 to verify the checksum — same failure mode).
        const id = await DefinancyId.fromString(c.input.id_string);
        const did = new DefinancyDid(c.input.network, id);
        const actual = await did.toString();
        report(
          vec.name,
          c.label,
          actual === c.output.did,
          actual === c.output.did ? "" : `expected="${c.output.did}" actual="${actual}"`,
        );
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: jwk_thumbprint
//
// Two ops per case:
//   - x_b64url: createJwk(pubkey).x must match expected base64url-no-padding
//   - thumbprint_b64url: await jwkThumbprint(jwk) must match
// jwk_thumbprint internally uses SHA-256 (which works) — should be all PASS.
// =============================================================================
async function runJwkThumbprint(): Promise<void> {
  for (const vec of await loadVectors("jwk_thumbprint")) {
    for (const c of vec.cases) {
      try {
        const jwk = createJwk(hexToBytes(c.input.public_key_hex));
        report(
          vec.name,
          `${c.label}/x`,
          jwk.x === c.output.x_b64url,
          jwk.x === c.output.x_b64url
            ? ""
            : `expected="${c.output.x_b64url}" actual="${jwk.x}"`,
        );

        const tp = await jwkThumbprint(jwk);
        report(
          vec.name,
          `${c.label}/thumbprint`,
          tp === c.output.thumbprint_b64url,
          tp === c.output.thumbprint_b64url
            ? ""
            : `expected="${c.output.thumbprint_b64url}" actual="${tp}"`,
        );
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: jwt_canonical
//
// Tests JWT canonical serialization via the SDK's `Jwt` class:
// `new Jwt(header, claims).encode()` should produce
// `header_b64.claims_b64`.
//
// This catches the documented `sortedJsonStringify` bug at jwt.ts:43 —
// any case with nested objects (`cnf.jkt`, `jwk.{crv,kty,x}`) will FAIL
// until that bug is fixed: TS emits `{"cnf":{}}` instead of
// `{"cnf":{"jkt":"..."}}`.
// =============================================================================
async function runJwtCanonical(): Promise<void> {
  for (const vec of await loadVectors("jwt_canonical")) {
    for (const c of vec.cases) {
      try {
        const header = c.input.header as unknown as Record<string, unknown>;
        const claims = c.input.claims as unknown as Record<string, unknown>;
        const expected = c.output.unsigned_jwt;

        const actual = new Jwt(header, claims).encode();

        const ok = actual === expected;
        let diag = "";
        if (!ok) {
          // Per-segment diagnostic: which side diverged?
          const [actualH, actualC] = actual.split(".");
          const [expectedH, expectedC] = expected.split(".");
          const decode = (b: string): string => Buffer.from(b, "base64url").toString("utf8");
          const headerOk = actualH === expectedH;
          const claimsOk = actualC === expectedC;
          if (!headerOk) {
            diag += `header_actual_utf8="${decode(actualH)}" `;
          }
          if (!claimsOk) {
            diag += `claims_actual_utf8="${decode(actualC)}"`;
          }
        }
        report(vec.name, c.label, ok, diag.trim());
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: authorization_jwt
//
// End-to-end Authorization JWT mint: from a fixed Ed25519 seed, derive
// keypair → DefinancyId → DefinancyDid → JWK thumbprint, then mint a
// JWT with pinned iat/exp, sign it, and assemble the compact form.
//
// Intermediate values (did, jwk_thumbprint_b64url) are checked first so
// a failure attributes to the right step.
// =============================================================================
async function runAuthorizationJwt(): Promise<void> {
  for (const vec of await loadVectors("authorization_jwt")) {
    for (const c of vec.cases) {
      try {
        const seedHex = c.input.seed_hex as unknown as string;
        const network = c.input.network as unknown as string;
        const audience = c.input.audience as unknown as string;
        const iat = c.input.iat as unknown as number;
        const exp = c.input.exp as unknown as number;

        const expectedDid = c.output.did;
        const expectedThumbprint = c.output.jwk_thumbprint_b64url;
        const expectedJwt = c.output.jwt_compact;

        const seedB64Url = encodeBase64Url(hexToBytes(seedHex));
        const kp = await KeyPair.fromSecret(seedB64Url);

        const id = DefinancyId.fromPublicKey(kp.publicKeyBytes());
        const did = new DefinancyDid(network, id);

        // Diagnostic: did/thumbprint must match before the JWT can match
        const actualDid = await did.toString();
        report(vec.name, `${c.label}/did`, actualDid === expectedDid,
          actualDid === expectedDid ? "" : `expected="${expectedDid}" actual="${actualDid}"`);

        const jwk = await kp.jwk();
        const actualTp = await jwkThumbprint(jwk);
        report(vec.name, `${c.label}/jwk_thumbprint`, actualTp === expectedThumbprint,
          actualTp === expectedThumbprint ? "" : `expected="${expectedThumbprint}" actual="${actualTp}"`);

        const authJwt = await createAuthorizationJwt(did, audience, actualTp, iat, exp);
        const unsigned = authJwt.encode();
        const sig = await kp.sign(unsigned);
        authJwt.setSignature(sig);
        const actualJwt = authJwt.encode();

        report(vec.name, `${c.label}/jwt_compact`, actualJwt === expectedJwt,
          actualJwt === expectedJwt ? "" : `expected="${expectedJwt}" actual="${actualJwt}"`);
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: dpop_proof
//
// End-to-end DPoP proof mint: from a fixed Ed25519 seed, derive keypair
// → JWK, then mint a DPoP proof with pinned jti/iat/exp/method/htu
// (body=null in this scenario), sign, assemble compact form.
// =============================================================================
async function runDpopProof(): Promise<void> {
  for (const vec of await loadVectors("dpop_proof")) {
    for (const c of vec.cases) {
      try {
        const seedHex = c.input.seed_hex as unknown as string;
        const jti = c.input.jti as unknown as string;
        const method = c.input.method as unknown as string;
        const htu = c.input.htu as unknown as string;
        const iat = c.input.iat as unknown as number;
        const exp = c.input.exp as unknown as number;
        const expectedJwk_x = c.output.jwk_x_b64url;
        const expectedJwt = c.output.jwt_compact;

        const seedB64Url = encodeBase64Url(hexToBytes(seedHex));
        const kp = await KeyPair.fromSecret(seedB64Url);
        const jwk = await kp.jwk();

        // Diagnostic: x must match before the JWT can match
        report(vec.name, `${c.label}/jwk_x`, jwk.x === expectedJwk_x,
          jwk.x === expectedJwk_x ? "" : `expected="${expectedJwk_x}" actual="${jwk.x}"`);

        const dpop = await createDpopProof(jti, method, htu, null, jwk, iat, exp);
        const unsigned = dpop.encode();
        const sig = await kp.sign(unsigned);
        dpop.setSignature(sig);
        const actualJwt = dpop.encode();

        report(vec.name, `${c.label}/jwt_compact`, actualJwt === expectedJwt,
          actualJwt === expectedJwt ? "" : `expected="${expectedJwt}" actual="${actualJwt}"`);
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: dpop_body_hash
//
// DPoP proof with a non-null body. Tests the bsh claim pipeline
// (sha512_256(body) → base64url) and full JWT compact. Two sub-checks
// per case (bsh, jwt_compact) so the diagnostic attributes failures.
// =============================================================================
async function runDpopBodyHash(): Promise<void> {
  for (const vec of await loadVectors("dpop_body_hash")) {
    for (const c of vec.cases) {
      try {
        const seedHex = c.input.seed_hex as unknown as string;
        const jti = c.input.jti as unknown as string;
        const method = c.input.method as unknown as string;
        const htu = c.input.htu as unknown as string;
        const bodyBytesHex = c.input.body_bytes_hex as unknown as string;
        const iat = c.input.iat as unknown as number;
        const exp = c.input.exp as unknown as number;

        const expectedBsh = c.output.bsh_b64url;
        const expectedJwt = c.output.jwt_compact;

        const bodyBytes = hexToBytes(bodyBytesHex);

        // Independent bsh check (bypasses the JWT path)
        const bsh = encodeBase64Url(await sha512_256(bodyBytes));
        report(vec.name, `${c.label}/bsh`, bsh === expectedBsh,
          bsh === expectedBsh ? "" : `expected="${expectedBsh}" actual="${bsh}"`);

        // Full JWT compact check (composes bsh into the claims, signs, encodes)
        const seedB64Url = encodeBase64Url(hexToBytes(seedHex));
        const kp = await KeyPair.fromSecret(seedB64Url);
        const jwk = await kp.jwk();

        const dpop = await createDpopProof(jti, method, htu, bodyBytes, jwk, iat, exp);
        const unsigned = dpop.encode();
        const sig = await kp.sign(unsigned);
        dpop.setSignature(sig);
        const actualJwt = dpop.encode();

        report(vec.name, `${c.label}/jwt_compact`, actualJwt === expectedJwt,
          actualJwt === expectedJwt ? "" : `expected="${expectedJwt}" actual="${actualJwt}"`);
      } catch (err) {
        report(vec.name, c.label, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Domain: amount_math
//
// Pure-string conversion between human decimal value and raw integer
// (smallest-unit). Two ops per case: valueToRaw, rawToValue. No
// floating point allowed; the contract is byte-exact strings.
// =============================================================================
async function runAmountMath(): Promise<void> {
  for (const vec of await loadVectors("amount_math")) {
    for (const c of vec.cases) {
      const value = c.input.value as unknown as string;
      const raw = c.input.raw as unknown as string;
      const decimals = c.input.decimals as unknown as number;

      try {
        const actualRaw = valueToRaw(value, decimals);
        report(vec.name, `${c.label}/valueToRaw`, actualRaw === raw,
          actualRaw === raw ? "" : `expected="${raw}" actual="${actualRaw}"`);
      } catch (err) {
        report(vec.name, `${c.label}/valueToRaw`, false, `error="${(err as Error).message}"`);
      }

      try {
        const actualValue = rawToValue(raw, decimals);
        report(vec.name, `${c.label}/rawToValue`, actualValue === value,
          actualValue === value ? "" : `expected="${value}" actual="${actualValue}"`);
      } catch (err) {
        report(vec.name, `${c.label}/rawToValue`, false, `error="${(err as Error).message}"`);
      }
    }
  }
}

// =============================================================================
// Entry point
// =============================================================================
await runBase32();
await runBase64Url();
await runSha256();
await runSha512_256();
await runEd25519();
await runJwkThumbprint();
await runIdChecksum();
await runDidParse();
await runJwtCanonical();
await runAuthorizationJwt();
await runDpopProof();
await runDpopBodyHash();
await runAmountMath();

console.log("");
console.log(`Total: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP`);
process.exit(failed > 0 ? 1 : 0);
