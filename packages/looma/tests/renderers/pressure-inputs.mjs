import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Prepared output is valid only for the source, dependencies and built SDK that produced it. */
export async function pressureInputs() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const hash = createHash('sha256');
  const visit = async (file, name) => {
    const entries = await readdir(file, { withFileTypes: true }).catch(error => { if (error.code !== 'ENOTDIR') throw error; return null; });
    if (!entries) { hash.update(name); hash.update(await readFile(file)); return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isFile() || entry.isDirectory()) await visit(path.join(file, entry.name), `${name}/${entry.name}`);
    }
  };
  for (const file of ['src', 'tests', 'vitest.config.ts', 'vitest.browser.config.ts', 'build.mjs', 'package.json', '../../pnpm-lock.yaml']) await visit(path.join(root, file), file);
  if (process.env.LOOMA_HTMLNEXT_ROOT) {
    await visit(path.join(process.env.LOOMA_HTMLNEXT_ROOT, 'pnpm-lock.yaml'), 'sdk/pnpm-lock.yaml');
    for (const name of ['html-next', 'html-next-converter', 'html-next-unplugin']) {
      for (const file of ['src', 'dist', 'package.json']) await visit(path.join(process.env.LOOMA_HTMLNEXT_ROOT, 'packages', name, file), `sdk/${name}/${file}`);
    }
  }
  return hash.digest('hex');
}
