import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compileMarkdown } from 'markupress';

const source = await readFile(new URL('../docs/index.md', import.meta.url), 'utf8');

test('home renders its live showcase beside the story and gives its first action the theme accent', async () => {
  const { resource } = await compileMarkdown(source, {
    file: new URL('../docs/index.md', import.meta.url).pathname,
    pageName: 'homepage-test',
  });
  assert.match(resource, /class="hero-image"><div data-hero-media="">\s*<looma-home-demo>/);
  assert.match(resource, /<ui-button[^>]*tone="accent"[^>]*>Start building/);
  assert.match(resource, /<ui-button[^>]*tone="neutral"[^>]*>Make it yours/);
  assert.match(resource, /class="features"/);
  assert.doesNotMatch(resource, /data-type="mention"/);
});
