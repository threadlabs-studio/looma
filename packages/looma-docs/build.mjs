import { cp, mkdir, readdir, rm } from "node:fs/promises";
const output = new URL("./docs/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of await readdir(new URL("./tooling/docs/", import.meta.url))) {
  if (!file.endsWith(".test.mjs")) await cp(new URL(`./tooling/docs/${file}`, import.meta.url), new URL(file, output), { recursive: true });
}
