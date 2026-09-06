import { afterEach, expect, it } from 'vitest';

const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame); };
afterEach(() => { document.body.innerHTML = ''; });

it('applies a default once despite native first-option selection and preserves later edits and clears', async () => {
  document.body.innerHTML = '<ui-select default-value="editor"><select><option value="viewer">Viewer</option><option value="editor">Editor</option></select></ui-select>';
  const field = document.querySelector('ui-select') as HTMLUISelectElement;
  const select = field.querySelector('select')!;
  await flush();
  expect(select.value).toBe('editor');
  select.value = 'viewer';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  field.invalid = true;
  await flush();
  expect(select.value).toBe('viewer');
  select.value = '';
  field.defaultValue = 'viewer';
  field.required = true;
  await flush();
  expect(select.selectedIndex).toBe(-1);
  field.remove(); document.body.append(field);
  field.invalid = false;
  await flush();
  expect(select.selectedIndex).toBe(-1);
});

it('preserves native ownership without a default and never reapplies a default after controlled ownership', async () => {
  document.body.innerHTML = '<ui-select><select><option value="viewer">Viewer</option><option value="editor" selected>Editor</option></select></ui-select>';
  const field = document.querySelector('ui-select') as HTMLUISelectElement;
  const select = field.querySelector('select')!;
  await flush();
  expect(select.value).toBe('editor');
  field.value = 'viewer';
  await flush(); expect(select.value).toBe('viewer');
  field.value = undefined;
  field.defaultValue = 'editor';
  field.invalid = true;
  await flush(); expect(select.value).toBe('viewer');
});
