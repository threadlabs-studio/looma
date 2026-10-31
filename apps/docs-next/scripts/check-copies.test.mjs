import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { frameworkExamples } from '../../../packages/looma/tooling/docs/framework-examples.mjs';
import { copiedPageMatches } from './check-copies.mjs';

const pipe = '# Status\n\n| Name | State |\n| --- | --- |\n| Release | `ready` |\n\n```sh\npnpm build\n```\n';
const named = '# Status\n\n::: table\n\n- Name: Release\n  State: `ready`\n\n:::\n\n```sh\npnpm build\n```\n';

test('legacy pipe tables and standard named tables preserve the same copied content', async () => {
  assert.equal(await copiedPageMatches(pipe, named, { semantic: true }), true);
});

test('semantic copy parity rejects changed prose and literal code', async () => {
  assert.equal(await copiedPageMatches(pipe, named.replace('Release', 'Preview'), { semantic: true }), false);
  assert.equal(await copiedPageMatches(pipe, named.replace('`ready`', '`pending`'), { semantic: true }), false);
  assert.equal(await copiedPageMatches(pipe, named.replace('pnpm build', 'pnpm deploy'), { semantic: true }), false);
});

test('ordinary copied pages retain normalized source equality', async () => {
  assert.equal(await copiedPageMatches(pipe, named), false);
  assert.equal(await copiedPageMatches('Same  content.\n', 'Same content.\n'), false);
});

test('Getting Started framework tabs match the shared example output', async () => {
  const [markup, guide] = await Promise.all([
    readFile(new URL('../../docs/model-example.html', import.meta.url), 'utf8'),
    readFile(new URL('../docs/getting-started.md', import.meta.url), 'utf8'),
  ]);
  const components = ['ui-stack', 'ui-button'].map(tag => ({ tag, package: '@threadlabs/looma' }));
  const examples = Object.values(frameworkExamples({ markup }, components));
  const fences = [...guide.split('## Install Looma')[0].matchAll(/```(\w+)\n([\s\S]*?)\n```/g)];
  assert.equal(fences.length, examples.length);
  for (const [index, example] of examples.entries()) {
    assert.equal(fences[index][1], example.language);
    assert.equal(fences[index][2], example.code);
  }
});
