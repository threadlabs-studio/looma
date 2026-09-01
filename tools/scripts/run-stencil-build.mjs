import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ANSI = /\u001b\[[0-9;]*m/g;
const ALLOWED_MAIN_WARNING =
  'package.json "main" property is set to "dist/index.cjs". It\'s recommended to set the "main" property to: dist/index.cjs.js';

export function findUnhandledStencilWarnings(output) {
  const plain = output.replace(ANSI, "").replace(/\s+/g, " ");
  const warningCount = (plain.match(/\[ WARN \]/g) ?? []).length;
  if (warningCount === 0) {
    return [];
  }
  if (warningCount === 1 && plain.includes(ALLOWED_MAIN_WARNING)) {
    return [];
  }
  return [`Stencil emitted ${warningCount} unhandled warning(s).`];
}

export async function cleanStencilOutput(packageDirectory = process.cwd()) {
  await rm(path.join(packageDirectory, "dist"), { recursive: true, force: true });
}

async function main() {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli) {
    throw new Error("npm_execpath is unavailable; run this command through pnpm");
  }

  await cleanStencilOutput();

  const child = spawn(process.execPath, [pnpmCli, "exec", "stencil", "build"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
    process.stderr.write(chunk);
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
    return;
  }

  const unhandled = findUnhandledStencilWarnings(output);
  if (unhandled.length > 0) {
    throw new Error(unhandled.join("\n"));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
