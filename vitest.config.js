import fs from "node:fs";
import path from "node:path";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.js",
      remoteBindings: false,
      miniflare: {
        compatibilityDate: "2026-08-22",
        bindings: {
          TEST_STATIC_HEADERS: fs.readFileSync(path.join(import.meta.dirname, "public", "_headers"), "utf8"),
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.js"],
  },
});
