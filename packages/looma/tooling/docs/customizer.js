import { documentationTheme } from './theme-session.mjs';
import { componentRegistry } from '@nextwebwg/html-next/runtime';
import { startingPoints, startingPointFor, themeCSS, validateRecipe } from './theme.mjs';

/** The editor changes public theme values; the library owns every control's layout. */
export function connect(host) {
  const root = host.element;
  const document = root.ownerDocument;
  const view = document.defaultView;
  const message = root.querySelector('[data-message]');
  const file = root.querySelector('[data-recipe-file]');
  const theme = documentationTheme(view);
  let saved = validateRecipe(JSON.parse(root.dataset.recipe));
  let recipe = theme?.recipe ?? structuredClone(saved);
  let revision = root.dataset.revision;
  let capability;
  let changed = false;
  let saving = false;
  let alive = true;
  const abort = new AbortController();
  const say = (text, error = false) => { message.textContent = text; message.setAttribute('role', error ? 'alert' : 'status'); };
  const updateControl = (element, value) => componentRegistry.update(element, { value });
  const paint = () => {
    const css = themeCSS(recipe);
    for (const card of root.querySelectorAll('[data-example-card]')) card.dispatchEvent(new CustomEvent('looma-theme-preview', { detail: { css: theme?.css ?? css } }));
    updateControl(root.querySelector('[data-css]'), css);
  };
  const show = (next, persist = true) => {
    recipe = validateRecipe(next);
    if (persist) theme?.apply(recipe);
    for (const control of root.querySelectorAll('[data-token]')) updateControl(control, recipe.values[control.dataset.token]);
    updateControl(root.querySelector('[data-preset]'), startingPointFor(recipe));
    changed = JSON.stringify(recipe) !== JSON.stringify(saved);
    paint();
  };
  const filterExamples = () => {
    const words = root.querySelector('[data-example-query]').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const select = root.querySelector('[data-add-example]');
    const options = [...select.options];
    for (const option of options) option.hidden = !words.every(word => option.dataset.search.includes(word));
    for (const group of select.querySelectorAll('optgroup')) group.hidden = [...group.children].every(option => option.hidden);
    if (select.selectedOptions[0]?.hidden) select.value = options.find(option => !option.hidden)?.value ?? '';
    for (const card of root.querySelectorAll('[data-example-card]')) card.closest('section').hidden = !words.every(word => card.textContent.toLocaleLowerCase().includes(word) || card.dataset.componentCard.includes(word));
    const matches = options.filter(option => !option.hidden).length;
    root.querySelector('[data-example-count]').textContent = matches ? `${matches} matching examples` : 'No examples match. Try another name or purpose.';
    componentRegistry.update(root.querySelector('[data-action="add"]'), { disabled: matches === 0 });
  };
  const input = event => {
    if (event.target.matches('[data-example-query]')) { filterExamples(); return; }
    const control = event.target.closest?.('[data-token]');
    if (!control) return;
    const value = event.detail?.value ?? control.value;
    const next = { schemaVersion: 1, values: { ...recipe.values, [control.dataset.token]: value } };
    try {
      recipe = validateRecipe(next);
      theme?.apply(recipe); changed = true;
      updateControl(root.querySelector('[data-preset]'), startingPointFor(recipe));
      control.removeAttribute('aria-invalid');
      for (const sibling of root.querySelectorAll('[data-token]')) if (sibling !== control && sibling.dataset.token === control.dataset.token) updateControl(sibling, value);
      paint(); say('Theme remembered in this browser. Download it or save it to your repository.');
    } catch (error) { control.setAttribute('aria-invalid', 'true'); say(error.message, true); }
  };
  const download = (data, name, type) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const click = async event => {
    const button = event.target.closest?.('[data-action]');
    if (!button || (button.dataset.action === 'save' && saving)) return;
    try {
      switch (button.dataset.action) {
        case 'add': {
          const select = root.querySelector('[data-add-example]');
          const option = select.selectedOptions[0];
          const selected = JSON.parse(option.dataset.example);
          const card = Object.fromEntries(['id','title','description','exampleTitle','src','resizable','category','tag','nativeRoot','href','packageName'].map(key => [key, selected[key]]));
          if (!host.state.cards.some(item => item.id === card.id)) host.state.cards = [...host.state.cards, card];
          view.requestAnimationFrame(() => { paint(); filterExamples(); }); break;
        }
        case 'css': {
          const response = await fetch(root.dataset.base + '_looma/theme-system.css', { signal: abort.signal });
          if (!response.ok) throw new Error('Could not load the shared theme recipe.');
          download(themeCSS(recipe, await response.text()), 'looma.theme.css', 'text/css'); say('Theme CSS downloaded.'); break;
        }
        case 'recipe': download(JSON.stringify(recipe, null, 2) + '\n', 'looma.theme.json', 'application/json'); say('Editable recipe downloaded.'); break;
        case 'import': file.click(); break;
        case 'reset': show(theme?.reset() ?? structuredClone(saved), false); say('Browser customization reset to the saved theme.'); break;
        case 'save': {
          if (!capability) throw new Error('Repository saving is available only in the local documentation server.');
          const submitted = structuredClone(recipe);
          saving = true;
          say('Saving your theme and rebuilding the documentation…');
          const response = await fetch(root.dataset.base + '_looma/theme', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Looma-Capability': capability }, body: JSON.stringify({ recipe: submitted, revision }), signal: abort.signal });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? 'Could not save this theme.');
          revision = result.revision; saved = submitted; theme?.baseline(saved);
          changed = JSON.stringify(recipe) !== JSON.stringify(saved);
          if (changed) { say('Saved the submitted theme. Your newer edits are still an unsaved preview.'); break; }
          say('Saved to your repository. Reloading your design system…');
          view.location.reload(); break;
        }
      }
    } catch (error) { if (error.name !== 'AbortError' && alive) say(error.message, true); }
    finally { if (button.dataset.action === 'save') saving = false; }
  };
  const change = async event => {
    if (event.target.matches('[data-preset]')) { show(structuredClone(startingPoints[event.target.value])); say('Starting point applied throughout the documentation and remembered in this browser.'); }
    if (event.target === file && file.files[0]) {
      try { show(JSON.parse(await file.files[0].text())); say('Recipe applied throughout the documentation and remembered in this browser.'); }
      catch (error) { say(error.message, true); }
      file.value = '';
    }
  };
  const ready = event => {
    if (event.data?.type === 'looma-preview-ready' && [...root.querySelectorAll('iframe')].some(frame => frame.contentWindow === event.source)) paint();
  };
  const remove = event => { host.state.cards = host.state.cards.filter(card => card.id !== event.detail.id); };
  root.addEventListener('looma-example-remove', remove);
  root.addEventListener('input', input);
  root.addEventListener('change', change);
  root.addEventListener('click', click);
  view.addEventListener('message', ready);
  show(recipe, false); filterExamples();
  if (root.dataset.mode === 'local') {
    fetch(root.dataset.base + '_looma/session', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('Local theme saving is unavailable.');
      const local = await response.json(); if (!alive) return;
      capability = local.capability;
      saved = validateRecipe(local.recipe); revision = local.revision; theme?.baseline(saved);
      if (!changed && !theme?.hasOverride) show(saved, false);
      root.querySelector('[data-action="save"]').hidden = false;
    }).catch(error => { if (alive && error.name !== 'AbortError') say(error.message, true); });
  }
  return () => { alive = false; abort.abort(); root.removeEventListener('looma-example-remove', remove); root.removeEventListener('input', input); root.removeEventListener('change', change); root.removeEventListener('click', click); view.removeEventListener('message', ready); };
}
