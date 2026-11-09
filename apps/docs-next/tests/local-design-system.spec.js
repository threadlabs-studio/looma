import { chooseStartingPoint, openEditor, openOverview } from './choose-option.js';
import { test, expect } from '@playwright/test';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serveLocalDocumentation } from '../../../packages/looma-docs/tooling/docs/local-server.mjs';
import { createThemeStore } from '../../../packages/looma-docs/tooling/docs/store.mjs';
import { buildDocumentation } from '../../../packages/looma-docs/tooling/docs/site.mjs';
import { readCatalog } from '../../../packages/looma-docs/tooling/docs/catalog.mjs';
import { previewProjectDocumentation } from '../../../packages/looma-docs/tooling/docs/commands.mjs';

test('local saving preserves newer edits with inline previews', async ({ page }) => {
  test.setTimeout(60_000);
  const root = await mkdtemp(path.join(tmpdir(), 'looma-browser-writer-'));
  let releaseSave;
  const pending = new Promise(resolve => { releaseSave = resolve; });
  let saves = 0;
  let upstream, server;
  try {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'looma-local-save-fixture', private: true, type: 'module' }));
    await symlink(fileURLToPath(new URL('../../../packages/looma-docs/node_modules/', import.meta.url)), path.join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    const config = { base: '/looma/', local: true, outDir: '.looma/site' };
    const catalog = await readCatalog();
    catalog.components = catalog.components.filter(component => ['ui-button', 'ui-cluster'].includes(component.tag));
    await buildDocumentation({ root, config, catalog });
    upstream = await previewProjectDocumentation({ root, config, port: 0 });
    server = await serveLocalDocumentation({ upstream: upstream.url, base: config.base, store: await createThemeStore({ root }), onSaved: async () => { if (++saves === 1) await pending; } });
    await page.goto(server.url + 'customize/');
    await expect(page.locator('[data-looma-customizer]')).toHaveAttribute('data-mode', 'local');
    await chooseStartingPoint(page, 'night');
    await openEditor(page, 'export');
    await expect(page.locator('[data-action="save"]')).toBeVisible();
    const submitted = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/_looma/theme'));
    await page.locator('[data-action="save"]').click();
    await submitted;
    await chooseStartingPoint(page, 'garden');
    releaseSave();
    await expect(page.locator('[data-message]')).toContainText('newer edits');
    await expect(page.locator('[data-preset] input[role=combobox]')).toHaveValue('Garden');
    expect(JSON.parse(await readFile(path.join(root, 'looma.theme.json'), 'utf8')).values.canvas).toBe('#11141c');
    await expect(page.locator('iframe')).toHaveCount(0);
    await openOverview(page);
    await expect(page.locator('[data-theme-sampler] [data-preview]')).toBeVisible();
  } finally { releaseSave(); await server?.close(); await upstream?.close(); await rm(root, { recursive: true, force: true }); }
});
