import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "index.ts",
    declarative: "src/declarative.ts",
    "declarative-generated": "src/declarative-generated.ts",
    loader: "src/loader.ts",
    valibot: "src/field/valibot.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outDir: "dist",
});
