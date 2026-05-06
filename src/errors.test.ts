import type { MiddlewareCallbackParams } from "openapi-fetch";
import { describe, expect, it } from "vitest";
import { DefinancyError } from "./errors.js";
import { errorMiddleware } from "./middleware/error.js";
import type { ErrorList } from "./types.js";

/**
 * Build a fake MiddlewareCallbackParams object suitable for invoking
 * errorMiddleware.onResponse directly. The middleware only reads
 * `response`, so the rest of the fields can be cheap stand-ins.
 */
function fakeParams(response: Response): MiddlewareCallbackParams & { response: Response } {
  return {
    response,
    request: new Request("https://example.invalid/"),
    schemaPath: "/v1/test",
    params: {},
    id: "test-request",
    // The middleware doesn't actually read `options`, but the type wants it.
    // Cast to satisfy TS without dragging in the full MergedOptions surface.
    options: {} as MiddlewareCallbackParams["options"],
  };
}

describe("DefinancyError", () => {
  it("is a subclass of Error", () => {
    const err = new DefinancyError(404, []);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DefinancyError);
  });

  it("sets name to 'DefinancyError' (not 'Error')", () => {
    const err = new DefinancyError(404, []);
    expect(err.name).toBe("DefinancyError");
  });

  it("carries the status field", () => {
    const err = new DefinancyError(404, []);
    expect(err.status).toBe(404);
  });

  it("carries the errors field as the original list", () => {
    const errors: ErrorList = [{ code: "VLT-404", message: "Vault not found" }];
    const err = new DefinancyError(404, errors);
    expect(err.errors).toBe(errors);
  });

  it("derives message from the primary error", () => {
    const err = new DefinancyError(404, [
      { code: "VLT-404", message: "Vault not found" },
    ]);
    expect(err.message).toBe("VLT-404: Vault not found");
  });

  it("falls back to 'HTTP <status>' when errors list is empty", () => {
    const err = new DefinancyError(500, []);
    expect(err.message).toBe("HTTP 500");
  });

  it("code accessor returns the first error's code", () => {
    const err = new DefinancyError(404, [
      { code: "VLT-404", message: "Vault not found" },
      { code: "OTHER", message: "second" },
    ]);
    expect(err.code).toBe("VLT-404");
  });

  it("code accessor returns 'UNKNOWN' when errors list is empty", () => {
    const err = new DefinancyError(500, []);
    expect(err.code).toBe("UNKNOWN");
  });

  it("hasCode matches any error in the list", () => {
    const err = new DefinancyError(404, [
      { code: "A", message: "a" },
      { code: "B", message: "b" },
    ]);
    expect(err.hasCode("A")).toBe(true);
    expect(err.hasCode("B")).toBe(true);
    expect(err.hasCode("C")).toBe(false);
  });

  it("status helpers reflect the right HTTP code", () => {
    expect(new DefinancyError(400, []).isValidation()).toBe(true);
    expect(new DefinancyError(401, []).isUnauthorized()).toBe(true);
    expect(new DefinancyError(403, []).isForbidden()).toBe(true);
    expect(new DefinancyError(404, []).isNotFound()).toBe(true);
    expect(new DefinancyError(409, []).isConflict()).toBe(true);

    // Negative cases
    expect(new DefinancyError(404, []).isUnauthorized()).toBe(false);
    expect(new DefinancyError(200, []).isNotFound()).toBe(false);
  });
});

describe("errorMiddleware", () => {
  // The middleware is exposed as a Middleware object with onResponse — call
  // it directly rather than spinning up the full openapi-fetch pipeline.
  const onResponse = errorMiddleware.onResponse!;

  it("is a no-op for a 2xx response", async () => {
    const ok = new Response(JSON.stringify({ hello: "world" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    // Should resolve without throwing and return undefined (no replacement).
    const result = await onResponse(fakeParams(ok));
    expect(result).toBeUndefined();
  });

  it("throws DefinancyError with the parsed errors list for a 4xx JSON body", async () => {
    const errors: ErrorList = [{ code: "VLT-404", message: "Vault not found" }];
    const bad = new Response(JSON.stringify(errors), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
    await expect(onResponse(fakeParams(bad))).rejects.toBeInstanceOf(DefinancyError);

    // Re-throw and inspect.
    try {
      await onResponse(fakeParams(bad));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DefinancyError);
      const de = e as DefinancyError;
      expect(de.status).toBe(404);
      expect(de.errors).toEqual(errors);
      expect(de.code).toBe("VLT-404");
    }
  });

  it("throws DefinancyError with empty errors when body is non-JSON", async () => {
    const bad = new Response("not json at all", { status: 500 });
    try {
      await onResponse(fakeParams(bad));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DefinancyError);
      const de = e as DefinancyError;
      expect(de.status).toBe(500);
      expect(de.errors).toEqual([]);
      expect(de.message).toBe("HTTP 500");
    }
  });

  it("throws DefinancyError with empty errors when JSON body is not an array", async () => {
    // The middleware only treats array bodies as ErrorList; an object body
    // becomes an empty list (defensive parsing).
    const bad = new Response(JSON.stringify({ wrong: "shape" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
    try {
      await onResponse(fakeParams(bad));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(DefinancyError);
      const de = e as DefinancyError;
      expect(de.status).toBe(422);
      expect(de.errors).toEqual([]);
    }
  });
});
