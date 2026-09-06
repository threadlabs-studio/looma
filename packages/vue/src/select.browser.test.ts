import { afterEach, expect, it } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import { Select } from './index';

const apps: App[] = [];
const flush = async () => { await nextTick(); for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); };
afterEach(() => { apps.splice(0).forEach(app => app.unmount()); document.body.innerHTML = ''; });

it.each([undefined, ''])('distinguishes omitted and empty Vue defaults (%j) without overwriting native ownership', async initial => {
  const value = ref<string>(); const invalid = ref(false); const defaultValue = ref(initial);
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Select, { defaultValue: defaultValue.value, invalid: invalid.value }, {
    default: () => h('select', value.value === undefined ? {} : { value: value.value }, [h('option', { value: 'viewer' }, 'Viewer'), h('option', { value: 'editor' }, 'Editor')]),
  }) });
  apps.push(app); app.mount(host); await flush();
  const select = host.querySelector('select')!;
  await expect.poll(() => select.getAttribute('aria-invalid')).toBe('false');
  expect(select.selectedIndex).toBe(initial === undefined ? 0 : -1);
  value.value = 'editor'; invalid.value = true; await flush(); expect(select.value).toBe('editor');
  value.value = ''; defaultValue.value = 'viewer'; invalid.value = false;
  await flush(); expect(select.selectedIndex).toBe(-1);
});

it('initializes the default once then preserves Vue native selection updates and clears', async () => {
  const value = ref<string>();
  const invalid = ref(false);
  const defaultValue = ref('editor');
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Select, { defaultValue: defaultValue.value, invalid: invalid.value }, {
    default: () => h('select', value.value === undefined ? {} : { value: value.value }, [h('option', { value: 'viewer' }, 'Viewer'), h('option', { value: 'editor' }, 'Editor')]),
  }) });
  apps.push(app); app.mount(host); await flush();
  const select = host.querySelector('select')!;
  await expect.poll(() => select.getAttribute('aria-invalid')).toBe('false');
  expect(select.value).toBe('editor');
  // Start without a native owner, then hand selection to reactive Vue state.
  invalid.value = true; await flush();
  expect(select.value).toBe('editor');
  value.value = ''; invalid.value = true; await flush();
  expect(select.selectedIndex).toBe(-1);
  defaultValue.value = 'viewer'; invalid.value = false; await flush();
  expect(select.selectedIndex).toBe(-1);
  value.value = 'viewer'; await flush();
  expect(select.value).toBe('viewer');
});

it('gives the controlled host value precedence over the default and reacts to changes', async () => {
  const value = ref('viewer');
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Select, { value: value.value, defaultValue: 'editor' }, {
    default: () => h('select', {}, [h('option', { value: 'viewer' }, 'Viewer'), h('option', { value: 'editor' }, 'Editor')]),
  }) });
  apps.push(app); app.mount(host); await flush();
  const select = host.querySelector('select')!;
  await expect.poll(() => select.getAttribute('aria-invalid')).toBe('false');
  expect(select.value).toBe('viewer');
  value.value = 'editor'; await flush(); expect(select.value).toBe('editor');
  value.value = ''; await flush(); expect(select.selectedIndex).toBe(-1);
});
