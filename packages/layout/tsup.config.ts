import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/declarative-index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
});
