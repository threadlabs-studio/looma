import { chooseStartingPoint, openEditor, openOverview } from './choose-option.js';
import { test, expect } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serveLocalDocumentation } from '../../../packages/looma/tooling/docs/local-server.mjs';
import { createThemeStore } from '../../../packages/looma/tooling/docs/store.mjs';

test('local saving preserves newer edits with inline previews', async ({ page }, info) => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-browser-writer-'));
  let releaseSave;
  const pending = new Promise(resolve => { releaseSave = resolve; });
  let saves = 0;
  const server = await serveLocalDocumentation({ upstream: info.config.metadata.markupress, base: '/looma/', store: await createThemeStore({ root }), onSaved: async () => { if (++saves === 1) await pending; } });
  try {
    await page.route('**/customize/', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('data-mode="public"', 'data-mode="local"') });
    });
    await page.goto(server.url + 'customize/');
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
  } finally { releaseSave(); await server.close(); await rm(root, { recursive: true, force: true }); }
});
