import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileRejection } from '../../packages/looma/src/components/ui-file-input/files.js';

const file = (name, type, size = 100) => ({ name, type, size });
test('file selection accepts extensions and MIME families, including case-insensitive extensions', () => {
  const options = { multiple: true, accept: 'image/*, .pdf' };
  assert.equal(fileRejection([file('portrait.png', 'image/png'), file('REPORT.PDF', '')], options), '');
  assert.match(fileRejection([file('program.exe', 'application/octet-stream')], options), /program.exe/);
  assert.equal(fileRejection([file('notes.txt', 'text/plain')], { accept: 'text/plain' }), '');
});
test('selection uses an optional per-file size bound and does not invent a default limit', () => {
  assert.equal(fileRejection([file('large.zip', 'application/zip', 10 ** 12)], {}), '');
  assert.equal(fileRejection([file('small.txt', 'text/plain', 100)], { maxFileSize: 100 }), '');
  assert.match(fileRejection([file('large.txt', 'text/plain', 101)], { maxFileSize: 100 }), /large.txt/);
  assert.equal(fileRejection([file('empty.txt', 'text/plain', 0)], { maxFileSize: 0 }), '');
});
test('single selection rejects a multi-file proposal without silently choosing one file', () => {
  assert.match(fileRejection([file('one.txt', 'text/plain'), file('two.txt', 'text/plain')], {}), /single/);
  assert.equal(fileRejection([], {}), '');
});
