import { themeCSS, validateRecipe } from './theme.mjs';

const identity = Symbol.for('looma.documentation.theme');
export const themeEvent = 'looma-documentation-theme';

/** Browser choices belong to one documentation base; repository writes stay explicit. */
export function createThemeSession(view, { base, baseline, systemCSS }) {
  const key = `looma:documentation-theme:v1:${base}`;
  let original = validateRecipe(baseline);
  let selected;
  let portableCSS = '';
  let storageAvailable = true;
  const style = view.document.createElement('style');
  style.dataset.loomaDocumentationTheme = '';
  view.document.head.append(style);
  const read = value => { try { return value ? validateRecipe(JSON.parse(value)) : undefined; } catch { return undefined; } };
  try { selected = read(view.localStorage.getItem(key)); } catch { storageAvailable = false; }
  const paint = () => {
    portableCSS = selected ? themeCSS(selected, systemCSS) : '';
    view.document.documentElement.toggleAttribute('data-looma-documentation-theme', Boolean(selected));
    style.textContent = selected ? themeCSS(selected, systemCSS, { scope: 'documentation' }) : '';
    view.dispatchEvent(new view.CustomEvent(themeEvent, { detail: { css: portableCSS } }));
  };
  const persist = () => {
    try { if (selected) view.localStorage.setItem(key, JSON.stringify(selected)); else view.localStorage.removeItem(key); storageAvailable = true; } catch { storageAvailable = false; }
    paint();
  };
  const session = {
    get recipe() { return structuredClone(selected ?? original); },
    get hasOverride() { return selected !== undefined; },
    get storageAvailable() { return storageAvailable; },
    get css() { return portableCSS; },
    apply(recipe) { selected = validateRecipe(recipe); persist(); },
    reset() { selected = undefined; persist(); return structuredClone(original); },
    baseline(recipe) { original = validateRecipe(recipe); },
  };
  view.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    const next = read(event.newValue);
    if (event.newValue !== null && !next) return;
    selected = next; paint();
  });
  paint();
  return session;
}

/** The early head script and component modules share one session across client navigation. */
export function documentationTheme(view) { return view[identity]; }

export function installDocumentationTheme(view, config) {
  if (view.parent !== view) return;
  return view[identity] ??= createThemeSession(view, config);
}
