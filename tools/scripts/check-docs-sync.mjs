import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateComponentApiMetadata } from "./component-api-generator.mjs";
import { generateVueComponentTypes } from "./generate-vue-component-types.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const generatedOutputs = [
  {
    path: path.join(repoRoot, "generated/component-api.json"),
    generate: async () => `${JSON.stringify(await generateComponentApiMetadata(), null, 2)}\n`,
  },
  {
    path: path.join(repoRoot, "packages/vue/src/generated-component-types.ts"),
    generate: generateVueComponentTypes,
  },
];

export async function assertGeneratedOutputIsCurrent(output) {
  const generated = await output.generate();
  let existing;
  try {
    existing = await readFile(output.path, "utf8");
  } catch {
    throw new Error(`Missing ${path.relative(repoRoot, output.path)}. Run "pnpm generate:api".`);
  }
  if (existing !== generated) {
    throw new Error(
      `Generated public API output is stale: ${path.relative(repoRoot, output.path)}.\nRun "pnpm generate:api" and commit updated generated outputs.`
    );
  }
}

export async function checkDocsSync() {
  for (const output of generatedOutputs) await assertGeneratedOutputIsCurrent(output);
}

async function main() {
  try {
    await checkDocsSync();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write("Docs and generated public API outputs are in sync.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
