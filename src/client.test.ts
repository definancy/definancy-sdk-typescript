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
  it("returns a facade with all 11 resource namespaces and the .raw escape hatch", () => {
    const client = createClient({ baseUrl: "stub" });

    // Resource namespaces (typed)
    expect(client.health).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.networks).toBeDefined();
    expect(client.assets).toBeDefined();
    expect(client.contracts).toBeDefined();
    expect(client.vaults).toBeDefined();
    expect(client.paymentAcceptances).toBeDefined();
    expect(client.documents).toBeDefined();
    expect(client.velocityLimits).toBeDefined();
    expect(client.qrCodes).toBeDefined();
    expect(client.experimental).toBeDefined();

    // Escape hatch — the raw openapi-fetch handle
    expect(typeof client.raw.GET).toBe("function");
    expect(typeof client.raw.POST).toBe("function");
    expect(typeof client.raw.PUT).toBe("function");
    expect(typeof client.raw.DELETE).toBe("function");
    expect(typeof client.raw.PATCH).toBe("function");

    // Response-metadata snapshots — undefined until first response
    expect(client.lastRequestId).toBeUndefined();
    expect(client.lastRateLimit).toBeUndefined();
  });

  it("accepts a custom baseUrl unchanged", () => {
    const client = createClient({ baseUrl: "https://custom.example.com" });
    expect(client).toBeDefined();
  });

  it("resolves a well-known environment to its full URL", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createClient({ baseUrl: "stub", fetch: fetchMock });

    await client.health.healthy();

    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const requestArg = call![0] as unknown as Request;
    expect(requestArg.url).toBe("https://stub.definancy.com/v1/healthy");
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
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ icon: { type: "image/png", url: "/img/foo.png" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const client = createClient({ baseUrl: "stub" });
    // /v1/healthy is a real generated path; the body shape isn't statically
    // validated, so we cast to inspect what the media middleware produced.
    const { data } = await client.raw.GET("/v1/healthy");
    expect(data as unknown).toEqual({
      icon: { type: "image/png", url: "https://stub.definancy.com/img/foo.png" },
    });
  });

  it("applies error middleware on responses (4xx becomes a thrown DefinancyError)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ code: "NOT-404", message: "x" }]), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const client = createClient({ baseUrl: "stub" });
    await expect(client.raw.GET("/v1/healthy")).rejects.toMatchObject({
      status: 404,
      code: "NOT-404",
    });
  });

  it("captures X-Request-Id into client.lastRequestId on success", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-request-id": "019dfb-test-12345",
        },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const client = createClient({ baseUrl: "stub" });
    expect(client.lastRequestId).toBeUndefined();

    await client.health.healthy();

    expect(client.lastRequestId).toBe("019dfb-test-12345");
  });

  it("captures x-ratelimit-* into client.lastRateLimit", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-ratelimit-limit": "40",
          "x-ratelimit-remaining": "39",
          "x-ratelimit-reset": "1",
        },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const client = createClient({ baseUrl: "stub" });
    expect(client.lastRateLimit).toBeUndefined();

    await client.health.healthy();

    expect(client.lastRateLimit).toEqual({
      limit: 40,
      remaining: 39,
      resetSeconds: 1,
    });
  });

  it("invokes user-supplied middleware in addition to built-ins", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
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
    await client.health.healthy();

    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onResponse).toHaveBeenCalledTimes(1);
  });

  it("applies multiple user-supplied middlewares", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "ok" }), {
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
    await client.health.healthy();

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

    const client = createClient({ baseUrl: "stub", mediaBaseUrl: "dev" });
    const { data } = await client.raw.GET("/v1/healthy");
    expect(data as unknown).toEqual({
      icon: { type: "image/png", url: "https://dev.definancy.com/img/foo.png" },
    });
  });
});
