import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // `server-only` is a Next.js build guard with no runtime; stub it in tests.
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.ts"),
    },
  },
});
