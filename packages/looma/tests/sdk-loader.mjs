import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Candidate SDK qualification uses the checkout's built public exports, including child SSR processes.
if (process.env.LOOMA_HTMLNEXT_ROOT) {
  const root = path.resolve(process.env.LOOMA_HTMLNEXT_ROOT, 'packages');
  const packages = ['html-next', 'html-next-converter', 'html-next-unplugin', 'htmlkit'].map(directory => {
    const folder = path.join(root, directory);
    const manifest = JSON.parse(readFileSync(path.join(folder, 'package.json'), 'utf8'));
    return { name: manifest.name, folder, exports: manifest.exports };
  });
  registerHooks({ resolve(specifier, context, next) {
    for (const pkg of packages) {
      const key = specifier === pkg.name ? '.' : specifier.startsWith(pkg.name + '/') ? '.' + specifier.slice(pkg.name.length) : undefined;
      const entry = key && pkg.exports[key];
      const target = typeof entry === 'string' ? entry : context.conditions.includes('import') ? entry?.import ?? entry?.default : entry?.require ?? entry?.default;
      if (target) return { url: pathToFileURL(path.join(pkg.folder, target)).href, shortCircuit: true };
    }
    return next(specifier, context);
  } });
  const flag = '--import=' + pathToFileURL(fileURLToPath(import.meta.url)).href;
  if (!process.env.NODE_OPTIONS?.includes(flag)) process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, flag].filter(Boolean).join(' ');
}
