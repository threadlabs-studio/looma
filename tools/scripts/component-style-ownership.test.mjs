import assert from 'node:assert/strict';
import test from 'node:test';
import { assertComponentLayoutOwnership, layoutOwnershipProblems } from './component-style-ownership.mjs';

test('ordinary consumer CSS cannot win against component-owned flow and spacing', async () => {
  await assertComponentLayoutOwnership();
});

test('ownership checks nested rules and shorthands, not just align-items', () => {
  const problems = layoutOwnershipProblems('@media (width > 20rem) { :host { align-items: center; padding: 1rem; margin-block-start: 2px; } }');
  assert.equal(problems.length, 3);
});

test('public tokens stay configurable and explicit important declarations satisfy ownership', () => {
  assert.deepEqual(layoutOwnershipProblems(':host { --ui-space-2: 1rem; align-items: center !important; gap: var(--ui-space-2) !important; }'), []);
});

test('keyframe declarations retain animation semantics', () => {
  assert.deepEqual(layoutOwnershipProblems('@keyframes move { to { margin-top: 0; } }'), []);
});
