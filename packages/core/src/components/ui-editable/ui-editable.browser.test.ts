import { userEvent } from '@vitest/browser/context';
import { afterEach, expect, it, vi } from 'vitest';

const flush = async () => { for (let index = 0; index < 3; index += 1) await new Promise(requestAnimationFrame); };

afterEach(() => { document.body.innerHTML = ''; });

it('swaps an explicit presentation trigger for its editor and light-dismisses', async () => {
  document.body.innerHTML = `
    <ui-editable aria-label="Tags editor">
      <div slot="preview"><a href="#research">Research</a><button data-ui-editable-trigger>+ Tag</button></div>
      <div slot="edit"><input aria-label="Edit tags"></div>
    </ui-editable>
    <button id="outside">Outside</button>
  `;
  const editable = document.querySelector('ui-editable') as HTMLElement & { edit?: boolean };
  const changes = vi.fn();
  editable.addEventListener('edit-change', changes);
  await flush();

  expect(editable.hasAttribute('data-edit')).toBe(false);
  expect(editable.shadowRoot?.querySelector<HTMLElement>('[part="edit"]')?.hidden).toBe(true);

  await userEvent.click(editable.querySelector('[data-ui-editable-trigger]')!);
  await flush();
  expect(editable.hasAttribute('data-edit')).toBe(true);
  expect(document.activeElement).toBe(editable.querySelector('input'));
  expect(changes).toHaveBeenCalledTimes(1);

  document.getElementById('outside')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await flush();
  expect(editable.hasAttribute('data-edit')).toBe(false);
  expect(changes).toHaveBeenCalledTimes(2);
});

it('supports keyboard activation and escape without hijacking preview links', async () => {
  document.body.innerHTML = `
    <ui-editable>
      <div slot="preview"><a href="#research">Research</a><span data-ui-editable-trigger tabindex="0">Edit tags</span></div>
      <div slot="edit"><input aria-label="Edit tags"></div>
    </ui-editable>
  `;
  const editable = document.querySelector('ui-editable')!;
  const link = editable.querySelector('a')!;
  link.click();
  await flush();
  expect(editable.hasAttribute('data-edit')).toBe(false);

  const trigger = editable.querySelector<HTMLElement>('[data-ui-editable-trigger]')!;
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  await flush();
  expect(editable.hasAttribute('data-edit')).toBe(true);
  await userEvent.keyboard('{Escape}');
  await flush();
  expect(editable.hasAttribute('data-edit')).toBe(false);
  expect(document.activeElement).toBe(trigger);
});
