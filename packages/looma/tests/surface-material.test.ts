import assert from 'node:assert/strict';
import test from 'node:test';
import { surfaceMaterialScale, updateSurfaceMaterial } from '../src/components/shared/surface-material.js';

test('popup purpose governs separation and rendered size refines it within that role', () => {
  const small = { width: 240, height: 160 };
  const large = { width: 640, height: 480 };
  const scale = (role: string, size = small) => surfaceMaterialScale(role, size.width, size.height);
  assert.ok(scale('tooltip', large) < scale('menu'));
  assert.ok(scale('menu', large) < scale('dialog'));
  assert.ok(scale('popover') < scale('dialog'));
  for (const role of ['tooltip', 'menu', 'popover', 'dialog', 'panel']) {
    assert.ok(scale(role, large) > scale(role));
    assert.ok(scale(role, { width: 100000, height: 100000 }) <= 1.5);
    assert.ok(Number.isFinite(scale(role, { width: 0, height: 0 })));
    assert.equal(scale(role, { width: NaN, height: Infinity }), scale(role, { width: 320, height: 240 }));
  }
  assert.throws(() => scale('unknown'), /role/);
});


test('material measurement ignores its own small rim changes but responds to substantial resizing', () => {
  let scale = '';
  let writes = 0;
  const element = {
    offsetWidth: 320, offsetHeight: 240,
    style: {
      getPropertyValue: () => scale,
      setProperty: (_name: string, value: string) => { scale = value; writes += 1; },
    },
  };
  updateSurfaceMaterial(element, 'dialog');
  assert.equal(scale, '1');
  element.offsetWidth += 2;
  element.offsetHeight += 2;
  updateSurfaceMaterial(element, 'dialog');
  assert.equal(writes, 1);
  element.offsetWidth = 640;
  element.offsetHeight = 480;
  updateSurfaceMaterial(element, 'dialog');
  assert.equal(scale, '1.35');
  assert.equal(writes, 2);
});
