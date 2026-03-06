import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateComponentApiMetadata } from "./component-api-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const outputPath = path.join(repoRoot, "generated/component-api.json");

async function main() {
  const generated = `${JSON.stringify(await generateComponentApiMetadata(), null, 2)}\n`;

  let existing;
  try {
    existing = await readFile(outputPath, "utf8");
  } catch (error) {
    process.stderr.write(
      `Missing ${path.relative(repoRoot, outputPath)}. Run "pnpm generate:api".\n`
    );
    process.exitCode = 1;
    return;
  }

  if (existing !== generated) {
    process.stderr.write(
      [
        "Generated component API metadata is stale.",
        "Run \"pnpm generate:api\" and commit updated generated outputs."
      ].join("\n")
    );
    process.stderr.write("\n");
    process.exitCode = 1;
    return;
  }

  process.stdout.write("Docs/API metadata is in sync.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
