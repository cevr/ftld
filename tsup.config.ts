import { defineConfig } from "tsup";

export default defineConfig({
  entryPoints: ["lib/index.ts"],
  dts: true,
  format: ["cjs", "esm"],
  clean: true,
});
