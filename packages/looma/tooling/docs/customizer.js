import { componentRegistry } from '@nextwebwg/html-next/runtime';
import { startingPoints, startingPointFor, themeCSS, validateRecipe } from './theme.mjs';

/** The editor changes public theme values; the library owns every control's layout. */
export function connect(host) {
  const root = host.element;
  const document = root.ownerDocument;
  const view = document.defaultView;
  const message = root.querySelector('[data-message]');
  const file = root.querySelector('[data-recipe-file]');
  let recipe = validateRecipe(JSON.parse(root.dataset.recipe));
  let saved = structuredClone(recipe);
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
    for (const card of root.querySelectorAll('[data-example-card]')) card.dispatchEvent(new CustomEvent('looma-theme-preview', { detail: { css } }));
    updateControl(root.querySelector('[data-css]'), css);
  };
  const show = next => {
    recipe = validateRecipe(next);
    for (const control of root.querySelectorAll('[data-token]')) updateControl(control, recipe.values[control.dataset.token]);
    updateControl(root.querySelector('[data-preset]'), startingPointFor(recipe));
    changed = JSON.stringify(recipe) !== JSON.stringify(saved);
    paint();
  };
  const input = event => {
    const control = event.target.closest?.('[data-token]');
    if (!control) return;
    const value = event.detail?.value ?? control.value;
    const next = { schemaVersion: 1, values: { ...recipe.values, [control.dataset.token]: value } };
    try {
      recipe = validateRecipe(next); changed = true;
      updateControl(root.querySelector('[data-preset]'), startingPointFor(recipe));
      control.removeAttribute('aria-invalid');
      for (const sibling of root.querySelectorAll('[data-token]')) if (sibling !== control && sibling.dataset.token === control.dataset.token) updateControl(sibling, value);
      paint(); say('Unsaved preview. Download the theme or save it to your repository.');
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
          view.requestAnimationFrame(paint); break;
        }
        case 'css': {
          const response = await fetch(root.dataset.base + '_looma/theme-system.css', { signal: abort.signal });
          if (!response.ok) throw new Error('Could not load the shared theme recipe.');
          download(themeCSS(recipe, await response.text()), 'looma.theme.css', 'text/css'); say('Theme CSS downloaded.'); break;
        }
        case 'recipe': download(JSON.stringify(recipe, null, 2) + '\n', 'looma.theme.json', 'application/json'); say('Editable recipe downloaded.'); break;
        case 'import': file.click(); break;
        case 'reset': show(structuredClone(saved)); say('Returned to the saved theme.'); break;
        case 'save': {
          if (!capability) throw new Error('Repository saving is available only in the local documentation server.');
          const submitted = structuredClone(recipe);
          saving = true;
          say('Saving your theme and rebuilding the documentation…');
          const response = await fetch(root.dataset.base + '_looma/theme', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Looma-Capability': capability }, body: JSON.stringify({ recipe: submitted, revision }), signal: abort.signal });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? 'Could not save this theme.');
          revision = result.revision; saved = submitted;
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
    if (event.target.matches('[data-preset]')) { show(structuredClone(startingPoints[event.target.value])); say('Starting point applied to every preview card.'); }
    if (event.target === file && file.files[0]) {
      try { show(JSON.parse(await file.files[0].text())); say('Recipe imported as an unsaved preview.'); }
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
  paint();
  if (root.dataset.mode === 'local') {
    fetch(root.dataset.base + '_looma/session', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('Local theme saving is unavailable.');
      const session = await response.json(); if (!alive) return;
      capability = session.capability;
      if (!changed) { saved = validateRecipe(session.recipe); revision = session.revision; show(saved); }
      root.querySelector('[data-action="save"]').hidden = false;
    }).catch(error => { if (alive && error.name !== 'AbortError') say(error.message, true); });
  }
  return () => { alive = false; abort.abort(); root.removeEventListener('looma-example-remove', remove); root.removeEventListener('input', input); root.removeEventListener('change', change); root.removeEventListener('click', click); view.removeEventListener('message', ready); };
}
