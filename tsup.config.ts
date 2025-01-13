import { defineConfig } from "tsup";

export default defineConfig({
  outDir: "dist/cjs",
  entryPoints: ["src/index.ts"],
  dts: true,
  format: ["cjs"],
  clean: true,
});
