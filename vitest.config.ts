import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    alias: {
      ftld: path.join(__dirname, "./lib/dist/esm/index.js"),
    },
  },
});
