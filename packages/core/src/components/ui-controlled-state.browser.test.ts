import { afterEach, describe, expect, it } from 'vitest';

const flush = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

afterEach(() => {
  document.body.innerHTML = '';
});

const booleanCases = [
  { tag: 'ui-dialog', defaults: { defaultOpen: true }, isOpen: (element: HTMLElement) => element.hasAttribute('data-open') },
  { tag: 'ui-menu', defaults: { defaultOpen: true }, isOpen: (element: HTMLElement) => element.hasAttribute('data-open') },
  { tag: 'ui-popover', defaults: { defaultOpen: true }, isOpen: (element: HTMLElement) => element.hasAttribute('data-open') },
  { tag: 'ui-disclosure', defaults: { defaultOpen: true }, isOpen: (element: HTMLElement) => element.querySelector('section')?.hidden === false },
  { tag: 'ui-tooltip', defaults: { defaultOpen: true }, isOpen: (element: HTMLElement) => !element.hidden },
  { tag: 'ui-checkbox', defaults: { defaultChecked: true }, isOpen: (element: HTMLElement) => element.getAttribute('aria-checked') === 'true' },
  { tag: 'ui-switch', defaults: { defaultChecked: true }, isOpen: (element: HTMLElement) => element.getAttribute('aria-checked') === 'true' },
  { tag: 'ui-radio', defaults: { defaultChecked: true }, isOpen: (element: HTMLElement) => element.getAttribute('aria-checked') === 'true' },
] as const;

describe('controlled state defaults', () => {
  it.each(booleanCases)('$tag keeps controlled false when its default is true and updates only when its owner does', async ({ tag, defaults, isOpen }) => {
    const element = document.createElement(tag) as HTMLElement & Record<string, boolean>;
    const stateProp = tag === 'ui-checkbox' || tag === 'ui-switch' || tag === 'ui-radio' ? 'checked' : 'open';
    Object.assign(element, defaults, { [stateProp]: false });
    if (tag === 'ui-disclosure') element.innerHTML = '<button>Toggle</button><section>Details</section>';
    if (tag === 'ui-radio') element.innerHTML = '<input type="radio">';
    if (tag === 'ui-checkbox') element.innerHTML = '<input type="checkbox">';
    document.body.append(element);
    await flush();

    expect(isOpen(element)).toBe(false);
    element[stateProp] = true;
    await flush();
    expect(isOpen(element)).toBe(true);
  });

  it('keeps a controlled empty tab value empty when defaultValue is provided', async () => {
    const tabs = document.createElement('ui-tabs') as HTMLElement & { value: string; defaultValue: string };
    tabs.value = '';
    tabs.defaultValue = 'first';
    tabs.innerHTML = '<button id="first" role="tab" aria-controls="first-panel">First</button><section id="first-panel">First panel</section>';
    document.body.append(tabs);
    await flush();

    expect(tabs.querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('false');
    expect(tabs.querySelector('section')?.hidden).toBe(true);
  });
});

describe('controlled state requests', () => {
  it('does not close a controlled disclosure until its owner accepts the request', async () => {
    const disclosure = document.createElement('ui-disclosure') as HTMLElement & { open: boolean };
    disclosure.open = true;
    disclosure.innerHTML = '<button>Toggle</button><section>Details</section>';
    document.body.append(disclosure);
    await flush();

    disclosure.querySelector('button')!.click();
    await flush();
    expect(disclosure.querySelector('section')?.hidden).toBe(false);

    disclosure.open = false;
    await flush();
    expect(disclosure.querySelector('section')?.hidden).toBe(true);
  });

  it('does not select a controlled tab until its owner accepts the request', async () => {
    const tabs = document.createElement('ui-tabs') as HTMLElement & { value: string };
    tabs.value = 'first';
    tabs.innerHTML = '<button id="first" role="tab" aria-controls="first-panel">First</button><button id="second" role="tab" aria-controls="second-panel">Second</button><section id="first-panel">First panel</section><section id="second-panel">Second panel</section>';
    document.body.append(tabs);
    await flush();

    tabs.querySelector<HTMLElement>('#second')!.click();
    await flush();
    expect(tabs.querySelector('#first')?.getAttribute('aria-selected')).toBe('true');
    expect(tabs.querySelector('#second')?.getAttribute('aria-selected')).toBe('false');

    tabs.value = 'second';
    await flush();
    expect(tabs.querySelector('#second')?.getAttribute('aria-selected')).toBe('true');
  });
});
