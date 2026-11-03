import { readFile, writeFile } from 'node:fs/promises';
import { themeCSS } from '@threadlabs/looma-docs';

const recipe = JSON.parse(await readFile(new URL('./looma.theme.json', import.meta.url), 'utf8'));
const rules = await readFile(new URL(import.meta.resolve('@threadlabs/looma/theme-system.css')), 'utf8');
await writeFile(new URL('./looma.theme.css', import.meta.url), themeCSS(recipe, rules));
console.log('Generated looma.theme.css. Run pnpm dev to open Fellowship UI.');
