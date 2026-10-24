import { test, expect } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serveLocalDocumentation } from '../../../packages/looma/tooling/docs/local-server.mjs';
import { createThemeStore } from '../../../packages/looma/tooling/docs/store.mjs';

test('local saving preserves newer edits and directly opened examples remain isolated', async ({ page }, info) => {
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
    await page.getByRole('button', { name: 'Export & save', exact: true }).click();
    await expect(page.locator('[data-action="save"]')).toBeVisible();
    await page.locator('[data-preset]').selectOption('night');
    const submitted = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/_looma/theme'));
    await page.locator('[data-action="save"]').click();
    await submitted;
    await page.locator('[data-preset]').selectOption('garden');
    releaseSave();
    await expect(page.locator('[data-message]')).toContainText('newer edits');
    await expect(page.locator('[data-preset]')).toHaveValue('garden');
    expect(JSON.parse(await readFile(path.join(root, 'looma.theme.json'), 'utf8')).values.canvas).toBe('#11141c');
    const frame = await page.locator('iframe').first().getAttribute('src');
    await page.goto(new URL(frame, server.url).href);
    expect(await page.evaluate(() => self.origin)).toBe('null');
    expect(await page.evaluate(async url => { try { await fetch(url); return 'readable'; } catch { return 'blocked'; } }, server.url + '_looma/session')).toBe('blocked');
  } finally { releaseSave(); await server.close(); await rm(root, { recursive: true, force: true }); }
});
