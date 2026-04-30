import type { Middleware } from "openapi-fetch";

/**
 * Recursively resolves relative `url` fields inside `media` objects
 * so consumers always receive absolute URLs.
 */
function resolveMediaUrls(obj: unknown, baseUrl: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveMediaUrls(item, baseUrl));
  }

  const record = obj as Record<string, unknown>;

  // Media object: has `type` and `url` fields
  if (typeof record.url === "string" && typeof record.type === "string") {
    const url = record.url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      record.url = new URL(url, baseUrl).href;
    }
  }

  for (const key of Object.keys(record)) {
    if (typeof record[key] === "object" && record[key] !== null) {
      record[key] = resolveMediaUrls(record[key], baseUrl);
    }
  }

  return record;
}

/**
 * openapi-fetch middleware that resolves relative media URLs in API responses
 * to absolute URLs using the configured base URL.
 */
export function createMediaMiddleware(baseUrl: string): Middleware {
  return {
    async onResponse({ response }) {
      if (!response.ok) return;

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) return;

      try {
        const body = await response.clone().json();
        const resolved = resolveMediaUrls(body, baseUrl);
        return new Response(JSON.stringify(resolved), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch {
        // Body wasn't JSON — return original
      }
    },
  };
}
