import axe from 'axe-core';
import '../../tokens/src/tokens.css';
import '../../tokens/src/theme-light.css';
import '../../tokens/src/theme-dark.css';
import '../../tokens/src/theme-high-contrast.css';
import './styles.css';
import { afterEach, expect, it } from 'vitest';

const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame); };
const luminance = (color: string) => {
  const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-contrast');
});

for (const [name, outer, inner, background, foreground] of [
  ['dark inside light', 'data-theme="light"', 'data-theme="dark"', 'rgb(26, 26, 26)', 'rgb(240, 240, 236)'],
  ['light inside dark', 'data-theme="dark"', 'data-theme="light"', 'rgb(255, 255, 255)', 'rgb(26, 26, 26)'],
  ['high contrast inside dark', 'data-theme="dark"', 'data-contrast="high"', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)'],
]) {
  it(`resolves semantic controls with readable contrast and axe coverage: ${name}`, async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-contrast', 'normal');
    document.body.innerHTML = `<main ${outer}><section id="nested" ${inner} style="background:var(--ui-surface-default);color:var(--ui-text-primary);padding:1rem">
      <ui-combobox label="Destination" default-query="Alpha" disclosure></ui-combobox>
      <button style="background:var(--ui-action-secondary-surface);color:var(--ui-action-secondary-text)">Continue</button>
    </section></main>`;
    const field = document.querySelector('ui-combobox') as HTMLUIComboboxElement;
    field.config = { options: [{ id: 'a', value: 'a', label: 'Alpha', description: 'Destination details' }] };
    await flush();
    const root = field.shadowRoot!;
    const control = root.querySelector('.field')!;
    const input = root.querySelector('input')!;
    expect(getComputedStyle(control).backgroundColor).toBe(background);
    expect(getComputedStyle(input).color).toBe(foreground);
    expect(contrast(getComputedStyle(input).color, getComputedStyle(control).backgroundColor)).toBeGreaterThanOrEqual(7);
    expect(contrast(getComputedStyle(control).borderTopColor, getComputedStyle(control).backgroundColor)).toBeGreaterThanOrEqual(3);
    const button = document.querySelector('#nested > button')!;
    expect(getComputedStyle(button).backgroundColor).toBe(background);
    expect(getComputedStyle(button).color).toBe(foreground);
    for (const [role, palette] of [
      ['--ui-control-focus', '--ui-focus-ring'],
      ['--ui-control-surface-disabled', '--ui-surface-muted'],
    ]) {
      const styles = getComputedStyle(field);
      expect(styles.getPropertyValue(role).trim()).toBe(styles.getPropertyValue(palette).trim());
    }
    root.querySelector<HTMLButtonElement>('button:last-child')!.click();
    await flush();
    const result = await axe.run(document.querySelector('#nested')!, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    expect(result.violations.map(violation => violation.id)).toEqual([]);
  });
}

it('keeps runtime button state authoritative over authored fallback attributes', async () => {
  document.body.innerHTML = `<ui-button id="changed" variant="destructive" disabled><button style="transition:none">Changed</button></ui-button>
    <ui-button id="default"><button style="transition:none">Default</button></ui-button>`;
  await flush();
  const changed = document.getElementById('changed') as HTMLUiButtonElement;
  const fromDefault = document.getElementById('default') as HTMLUiButtonElement;
  changed.variant = 'ghost';
  changed.disabled = false;
  fromDefault.variant = 'solid';
  await flush();
  const changedButton = changed.querySelector('button')!;
  const solidButton = fromDefault.querySelector('button')!;
  expect(changed.dataset.variant).toBe('ghost');
  expect(getComputedStyle(changedButton).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(changed).opacity).toBe('1');
  expect(getComputedStyle(solidButton).backgroundColor).not.toBe(getComputedStyle(changedButton).backgroundColor);
});

it('resets intent colors for high contrast nested inside dark', async () => {
  document.body.innerHTML = '<main data-theme="dark"><section data-contrast="high"><ui-button variant="destructive"><button>Delete</button></ui-button></section></main>';
  await flush();
  const button = document.querySelector('button')!;
  expect(contrast(getComputedStyle(button).color, getComputedStyle(button).backgroundColor)).toBeGreaterThanOrEqual(4.5);
});

it('keeps explicit semantic overrides at nested theme boundaries', async () => {
  document.body.innerHTML = '<main data-theme="dark" style="--ui-control-surface:rgb(12, 34, 56);--ui-control-border:rgb(78, 90, 12)"><ui-combobox label="Destination"></ui-combobox></main>';
  await flush();
  const control = document.querySelector('ui-combobox')!.shadowRoot!.querySelector('.field')!;
  expect(getComputedStyle(control).backgroundColor).toBe('rgb(12, 34, 56)');
  expect(getComputedStyle(control).borderTopColor).toBe('rgb(78, 90, 12)');
});
