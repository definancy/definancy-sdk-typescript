import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Conformance runner lives at conformance/runner.ts and is invoked
    // separately via `npm run conformance` — exclude it from unit-test runs.
    exclude: ["node_modules/**", "dist/**", "conformance/**"],
  },
});
