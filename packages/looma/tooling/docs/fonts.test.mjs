import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGoogleFonts } from './fonts.mjs';

test('replacing a pending shared font stylesheet settles its previous wait', async () => {
  let current;
  const document = {
    head: { querySelector: () => current, append: link => { current = link; } },
    createElement: () => ({ dataset: {}, remove() { if (current === this) current = undefined; } }),
    fonts: { load: async () => [{}] },
  };
  const previous = loadGoogleFonts(document, { 'body-font': 'Inter' });
  const latest = loadGoogleFonts(document, { 'body-font': 'Inter', 'display-font': 'Lora' });
  await previous;
  current.onload();
  await latest;
  const pending = loadGoogleFonts(document, { 'body-font': 'Roboto' });
  await loadGoogleFonts(document, {});
  await pending;
  assert.equal(current, undefined);
});
