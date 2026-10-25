import { themeCSS, validateRecipe } from './theme.mjs';

const identity = Symbol.for('looma.documentation.theme');
export const themeEvent = 'looma-documentation-theme';

/** Browser choices belong to one documentation base; repository writes stay explicit. */
export function createThemeSession(view, { base, baseline, systemCSS, historyLimit = 100 }) {
  const key = `looma:documentation-theme:v1:${base}`;
  let original = validateRecipe(baseline);
  let selected, draft, comparison;
  const past = [], future = [];
  let portableCSS = '';
  let storageAvailable = true;
  const style = view.document.createElement('style');
  style.dataset.loomaDocumentationTheme = '';
  view.document.head.append(style);
  const read = value => { try { return value ? validateRecipe(JSON.parse(value)) : undefined; } catch { return undefined; } };
  try { selected = read(view.localStorage.getItem(key)); } catch { storageAvailable = false; }
  const paint = () => {
    const displayed = comparison ?? draft ?? selected;
    portableCSS = displayed ? themeCSS(displayed, systemCSS) : '';
    view.document.documentElement.toggleAttribute('data-looma-documentation-theme', Boolean(displayed));
    style.textContent = displayed ? themeCSS(displayed, systemCSS, { scope: 'documentation' }) : '';
    view.dispatchEvent(new view.CustomEvent(themeEvent, { detail: { css: portableCSS } }));
  };
  const persist = () => {
    try { if (selected) view.localStorage.setItem(key, JSON.stringify(selected)); else view.localStorage.removeItem(key); storageAvailable = true; } catch { storageAvailable = false; }
    paint();
  };
  const remember = () => {
    past.push(structuredClone(selected));
    if (past.length > historyLimit) past.shift();
    future.length = 0;
  };
  const session = {
    get recipe() { return structuredClone(draft ?? selected ?? original); },
    get hasOverride() { return selected !== undefined; },
    get storageAvailable() { return storageAvailable; },
    get css() { return portableCSS; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    preview(recipe) { draft = validateRecipe(recipe); paint(); },
    commit() { if (draft) session.apply(draft); },
    cancel() { draft = undefined; paint(); },
    compare(recipe) { comparison = recipe === undefined ? undefined : validateRecipe(recipe); paint(); },
    undo() { if (!past.length) return; future.push(structuredClone(selected)); selected = past.pop(); draft = comparison = undefined; persist(); },
    redo() { if (!future.length) return; past.push(structuredClone(selected)); selected = future.pop(); draft = comparison = undefined; persist(); },
    apply(recipe) {
      const next = validateRecipe(recipe);
      if (JSON.stringify(next) !== JSON.stringify(selected)) remember();
      selected = next; draft = comparison = undefined; persist();
    },
    reset() { if (selected !== undefined) remember(); selected = draft = comparison = undefined; persist(); return structuredClone(original); },
    baseline(recipe) { original = validateRecipe(recipe); },
  };
  view.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    const next = read(event.newValue);
    if (event.newValue !== null && !next) return;
    selected = next; draft = comparison = undefined; past.length = future.length = 0; paint();
  });
  view.addEventListener('markupress-header-notice-dismiss', () => session.reset());
  paint();
  return session;
}

/** The early head script and component modules share one session across client navigation. */
export function documentationTheme(view) { return view[identity]; }

export function installDocumentationTheme(view, config) {
  if (view.parent !== view) return;
  return view[identity] ??= createThemeSession(view, config);
}
