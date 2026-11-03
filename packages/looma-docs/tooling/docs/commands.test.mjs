import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { initializeDocumentation, readConfiguration } from './commands.mjs';

test('initialization creates explicit theme files and configuration without editing application sources', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-init-'));
  try {
    await writeFile(path.join(root, 'app.html'), '<p>Fellowship office</p>');
    const result = await initializeDocumentation({ root, title: 'The Fellowship' });
    assert.equal(result.applicationImport, './looma.theme.css');
    assert.equal((await readConfiguration(root)).config.title, 'The Fellowship');
    assert.match(await readFile(path.join(root, 'looma.theme.css'), 'utf8'), /pow\(1 \/ 7, var\(--_ui-theme-curve\)\)/);
    assert.equal(await readFile(path.join(root, 'app.html'), 'utf8'), '<p>Fellowship office</p>');
    await assert.rejects(initializeDocumentation({ root }), /already exists/);
    assert.equal((await readConfiguration(root)).config.title, 'The Fellowship');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('initialization does not replace an existing theme or leave a partial configuration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-init-'));
  try {
    await writeFile(path.join(root, 'looma.theme.css'), '/* existing application */');
    await assert.rejects(initializeDocumentation({ root }), /already exists/);
    await assert.rejects(readFile(path.join(root, 'looma.docs.json')), { code: 'ENOENT' });
    assert.equal(await readFile(path.join(root, 'looma.theme.css'), 'utf8'), '/* existing application */');
  } finally { await rm(root, { recursive: true, force: true }); }
});
