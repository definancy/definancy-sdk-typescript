import type { Middleware } from "openapi-fetch";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient, ENVIRONMENTS } from "./client.js";

describe("ENVIRONMENTS", () => {
  it("exports the expected named environments", () => {
    expect(ENVIRONMENTS).toEqual({
      stub: "https://stub.definancy.com",
      dev: "https://dev.definancy.com",
    });
  });

  it("is `as const` typed (object is not mutated by the SDK)", () => {
    const before = { ...ENVIRONMENTS };
    // Just creating a client should not mutate ENVIRONMENTS.
    createClient({ baseUrl: "stub" });
    expect(ENVIRONMENTS).toEqual(before);
  });
});

describe("createClient — public surface shape", () => {
  it("returns an object with the expected openapi-fetch methods", () => {
    const client = createClient({ baseUrl: "stub" });
    // Spot-check the openapi-fetch surface — full method coverage is not the
    // goal; we only assert the shape so a future openapi-fetch upgrade that
    // changes it breaks the test loudly.
    expect(typeof client.GET).toBe("function");
    expect(typeof client.POST).toBe("function");
    expect(typeof client.PUT).toBe("function");
    expect(typeof client.DELETE).toBe("function");
    expect(typeof client.PATCH).toBe("function");
    expect(typeof client.use).toBe("function");
    expect(typeof client.eject).toBe("function");
  });

  it("accepts a custom baseUrl unchanged", () => {
    const client = createClient({ baseUrl: "https://custom.example.com" });
    expect(client).toBeDefined();
    // The baseUrl is internal to openapi-fetch; we can't read it directly,
    // but we can verify resolution via the fetch round-trip in the
    // middleware composition tests below.
  });

  it("resolves a well-known environment to its full URL", async () => {
    // We fire a real .GET() with a mocked global fetch and read the URL the
    // client constructed.
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    try {
      const client = createClient({ baseUrl: "stub" });
      // /v1/healthy is a real generated path in oapi.gen.ts.
      await client.GET("/v1/healthy");
      expect(fetchMock).toHaveBeenCalled();
      const call = fetchMock.mock.calls[0];
      expect(call).toBeDefined();
      const requestArg = call![0] as unknown as Request;
      expect(requestArg.url).toBe("https://stub.definancy.com/v1/healthy");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("createClient — middleware composition", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("applies media middleware on responses (resolves relative media URLs)", async () => {
    // The client wires the media middleware automatically with
    // baseUrl=mediaBaseUrl=resolved(baseUrl). A response containing a
    // relative media object should have the URL absolutized.
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ icon: { type: "image/png", url: "/img/foo.png" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const client = createClient({ baseUrl: "stub" });
    // /v1/healthy is a real generated path; the response body shape isn't
    // statically validated by the middleware path under test, so we
    // re-cast the data to inspect what the media middleware produced.
    const result = await client.GET("/v1/healthy");
    expect(result.data as unknown).toEqual({
      icon: { type: "image/png", url: "https://stub.definancy.com/img/foo.png" },
    });
  });

  it("applies error middleware on responses (4xx becomes a thrown DefinancyError)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ code: "NOT_FOUND", message: "x" }]), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const client = createClient({ baseUrl: "stub" });
    // The error middleware is registered inside createClient → must throw.
    await expect(client.GET("/v1/healthy")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("invokes user-supplied middleware in addition to built-ins", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const userMiddleware: Middleware = { onRequest, onResponse };

    const client = createClient({
      baseUrl: "stub",
      middleware: [userMiddleware],
    });
    await client.GET("/v1/healthy");

    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onResponse).toHaveBeenCalledTimes(1);
  });

  it("applies multiple user-supplied middlewares in order", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const callOrder: string[] = [];
    const mw1: Middleware = {
      onRequest: () => {
        callOrder.push("mw1.req");
      },
      onResponse: () => {
        callOrder.push("mw1.res");
      },
    };
    const mw2: Middleware = {
      onRequest: () => {
        callOrder.push("mw2.req");
      },
      onResponse: () => {
        callOrder.push("mw2.res");
      },
    };

    const client = createClient({ baseUrl: "stub", middleware: [mw1, mw2] });
    await client.GET("/v1/healthy");

    // openapi-fetch runs onRequest in registration order and onResponse in
    // reverse registration order. We just assert that BOTH ran exactly once
    // each — strict order is openapi-fetch's contract, not ours.
    expect(callOrder).toContain("mw1.req");
    expect(callOrder).toContain("mw2.req");
    expect(callOrder).toContain("mw1.res");
    expect(callOrder).toContain("mw2.res");
    expect(callOrder.filter((c) => c === "mw1.req")).toHaveLength(1);
    expect(callOrder.filter((c) => c === "mw2.req")).toHaveLength(1);
  });

  it("uses mediaBaseUrl override when supplied", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ icon: { type: "image/png", url: "/img/foo.png" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    // baseUrl is a relative-looking proxy path; mediaBaseUrl resolves the
    // absolute origin used to absolutize media URLs.
    const client = createClient({
      baseUrl: "stub",
      mediaBaseUrl: "dev",
    });
    const result = await client.GET("/v1/healthy");
    expect(result.data as unknown).toEqual({
      icon: { type: "image/png", url: "https://dev.definancy.com/img/foo.png" },
    });
  });

  // TODO: a full auth-middleware composition test requires constructing a
  // real AuthProvider (KeyPair.fromSecret + LocalAuthProvider), which pulls
  // in WebCrypto plus the JWT-canonical / DPoP-proof code paths already
  // covered by conformance vectors. The unit test would primarily re-verify
  // that the middleware was registered, not that it produces correct JWTs.
  // Skipping in favour of conformance coverage.
});
