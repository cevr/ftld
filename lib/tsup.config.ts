import { defineConfig } from "tsup";

export default defineConfig({
  entryPoints: ["src/index.ts"],
  dts: true,
  format: ["cjs", "esm"],
  clean: true,
});
