import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const postcss = createRequire(import.meta.url)('postcss');

/** Component-owned flow and spacing are not application styling extension points. */
export function isOwnedLayoutProperty(property) {
  return /^(?:display|box-sizing|flex-direction|flex-wrap|align-items|align-content|justify-content|justify-items|gap|row-gap|column-gap|margin(?:-.+)?|padding(?:-.+)?)$/.test(property.toLowerCase());
}

/** Public token declarations remain ordinary; keyframes cannot contain important declarations. */
export function layoutOwnershipProblems(css, file = 'component') {
  const problems = [];
  postcss.parse(css, { from: file }).walkDecls(declaration => {
    if (!isOwnedLayoutProperty(declaration.prop) || declaration.important) return;
    for (let parent = declaration.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
    }
    problems.push(`${file}:${declaration.source.start.line}: ${declaration.prop} must be !important; expose variation through props or supported tokens`);
  });
  return problems;
}

export async function assertComponentLayoutOwnership() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/looma/src/components');
  const problems = [];
  for (const tag of await readdir(root)) {
    if (!tag.startsWith('ui-')) continue;
    const file = join(root, tag, `${tag}.html`);
    const source = await readFile(file, 'utf8');
    for (const [, css] of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) problems.push(...layoutOwnershipProblems(css, file));
  }
  if (problems.length) throw new Error(problems.join('\n'));
}
