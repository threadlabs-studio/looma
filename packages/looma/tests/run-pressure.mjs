import './sdk-loader.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const prepared = process.argv.includes('--prepared');
const prepareOnly = process.argv.includes('--prepare-only');
process.argv = process.argv.filter(arg => !['--prepared', '--prepare-only'].includes(arg));
if (!prepared) {
  execFileSync('corepack', ['pnpm', 'run', 'build'], { stdio: 'inherit' });
  execFileSync('corepack', ['pnpm', 'exec', 'vitest', 'run', '--project', 'unit', 'tests/browser-coverage.test.ts'], { stdio: 'inherit' });
}
if (prepareOnly) {
  execFileSync(process.execPath, ['tests/renderers/prepare-pressure.ts'], { stdio: 'inherit' });
} else {
  if (prepared) process.env.LOOMA_PRESSURE_LIBRARIES = fileURLToPath(new URL('../.test-build/pressure.json', import.meta.url));
  await import('./run-browser.mjs');
}
