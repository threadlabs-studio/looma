import { afterEach, expect, it } from 'vitest';
import { userEvent } from '@vitest/browser/context';
afterEach(() => { document.body.innerHTML = ''; });
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame); };
it('keeps hover content reachable and preserves authored descriptions when detached', async () => {
  document.body.innerHTML = '<button id="help" aria-describedby="existing">Help</button><span id="existing">Existing</span><ui-tooltip for="help" show-delay="0" hide-delay="30">Description</ui-tooltip>';
  await flush();
  const trigger = document.querySelector('button')!;
  const tooltip = document.querySelector('ui-tooltip')!;
  expect(trigger.getAttribute('aria-describedby')).toBe(`existing ${tooltip.id}`);
  trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); await flush(); expect(tooltip.hidden).toBe(false);
  trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
  tooltip.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' })); await flush(); expect(tooltip.hidden).toBe(false);
  tooltip.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' })); await expect.poll(() => tooltip.hidden).toBe(true);
  trigger.focus(); await flush(); trigger.dispatchEvent(new PointerEvent('pointerleave')); await flush(); expect(tooltip.hidden).toBe(false);
  await userEvent.keyboard('{Escape}'); await flush(); expect(tooltip.hidden).toBe(true); expect(document.activeElement).toBe(trigger);
  tooltip.remove(); expect(trigger.getAttribute('aria-describedby')).toBe('existing');
});
it('ignores touch hover and supports tap pinning, repeat activation and outside dismissal', async () => {
  document.body.innerHTML = '<button id="help">Help</button><ui-tooltip for="help" toggle-on-click show-delay="0">Description</ui-tooltip>';
  await flush(); const trigger = document.querySelector('button')!; const tooltip = document.querySelector('ui-tooltip')!;
  trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' })); await flush(); expect(tooltip.hidden).toBe(true);
  trigger.click(); await flush(); expect(tooltip.hidden).toBe(false);
  trigger.click(); await flush(); expect(tooltip.hidden).toBe(true);
  trigger.click(); await flush(); document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); await flush(); expect(tooltip.hidden).toBe(true);
});
