import { googleFontStack, systemFont, loadGoogleFonts } from './fonts.mjs';
import { documentationTheme, themeEvent } from './theme-session.mjs';
import { componentRegistry } from '@nextwebwg/html-next/runtime';
import { startingPoints, startingPointFor, themeCSS, validateRecipe, themeFields, themePalettes, materialPresets, applyRefinement, refinementState, deriveTheme, startingPointLabels, nearbyVariation } from './theme.mjs';

import { valueEditor, editorValue, convertValueUnit } from './value-editors.mjs';

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
  let selectedExample = '';
  let refinementTrigger;
  let previewFrame = 0, pending = false, comparing = false, candidate, gestureStart;
  const entryRecipe = structuredClone(recipe);
  const abort = new AbortController();
  const say = (text, error = false) => { message.textContent = text; message.setAttribute('role', error ? 'alert' : 'status'); };
  const sayApplied = text => say(theme?.storageAvailable ? text : 'Theme applies to this page. Browser storage is unavailable; download CSS or a recipe to keep it.');
  const fields = new Map(themeFields.map(field => [field.id, field]));
  const unitContext = () => ({ remPixels: parseFloat(view.getComputedStyle(document.documentElement).fontSize) });
  const editorFor = (field, value) => valueEditor(field, value, { remPixels: parseFloat(recipe.values['text-size']) });
  let boundsBase;
  const updateControl = (element, value) => {
    const field = fields.get(element.dataset.token);
    if (!field || !element.dataset.editorKind) { componentRegistry.update(element, { value }); return; }
    const editor = editorFor(field, value);
    if (element.dataset.editorKind === 'curve') {
      element.closest('[data-curve-for]').hidden = editor.kind !== 'curve';
      if (editor.kind === 'curve') componentRegistry.update(element, { value });
    } else componentRegistry.update(element, Object.fromEntries(['value', 'unit', 'min', 'max', 'step'].map(key => [key, editor[key]])));
  };
  const updateUnits = () => {
    for (const control of root.querySelectorAll('[data-unit-for]')) {
      const field = fields.get(control.dataset.unitFor), editor = editorFor(field, recipe.values[field.id]);
      if (![...control.options].some(option => option.value === editor.unit)) control.add(new view.Option(editor.unit, editor.unit));
      componentRegistry.update(control, { value: editor.unit });
    }
  };
  const updateSizes = () => {
    const samples = [...root.querySelectorAll('[data-size-sample]')].filter(sample => sample.getClientRects().length);
    if (!samples.length) return;
    const base = parseFloat(view.getComputedStyle(document.documentElement).fontSize);
    const rounded = value => Number(value.toFixed(2));
    for (const sample of samples) {
      const button = sample.querySelector('button');
      if (button) {
        const height = button.getBoundingClientRect().height;
        sample.querySelector('[data-size-readout]').textContent = ` · ${rounded(height / base)}rem (${rounded(height)}px)`;
      }
    }
  };
  const paint = () => {
    const css = theme?.css || themeCSS(recipe);
    if (boundsBase !== recipe.values['text-size']) {
      boundsBase = recipe.values['text-size'];
      for (const control of root.querySelectorAll('[data-token]')) {
        const field = fields.get(control.dataset.token);
        if (field?.type.includes('length') && field.id !== 'text-size') updateControl(control, recipe.values[field.id]);
      }
    }
    for (const family of ['material','palette']) {
      const state = refinementState(recipe, family), presets = family === 'material' ? materialPresets : themePalettes;
      for (const select of root.querySelectorAll(`[data-refinement-preset="${family}"]`)) {
        for (const option of select.options) if (presets[option.value]) option.textContent = presets[option.value].label + (state.id === option.value && state.customized ? ' · customized' : '');
        updateControl(select, state.id);
      }
      componentRegistry.update(root.querySelector(`[data-action="restore-${family}"]`), { disabled: state.id === 'custom' || !state.customized });
    }
    for (const control of root.querySelectorAll('[data-font-picker]')) componentRegistry.update(control, { value: recipe.fonts?.[control.dataset.fontPicker] ?? (recipe.values[control.dataset.fontPicker] === systemFont ? 'system' : 'custom') });
    componentRegistry.update(root.querySelector('[data-light-editor]'), { x: Number(recipe.values['light-x']), y: Number(recipe.values['light-y']) });
    const adjustments = ['light', 'dark'].flatMap(mode => deriveTheme(recipe, { mode }).adjustments.map(item => ({ ...item, mode })));
    const report = root.querySelector('[data-palette-adjustments]');
    report.textContent = adjustments.length ? 'Paired ranges are derived for readability. Your seed colors stay editable; resolved values are shown below.' : 'Both ranges preserve your seeds with readable text and essential outlines.';
    root.querySelector('[data-palette-adjustment-details]').textContent = adjustments.length ? adjustments.map(item => `${item.mode} ${fields.get(item.id).label.toLowerCase()} ${item.requested} → ${item.resolved}`).join('; ') + '. Seed colors remain editable.' : 'Both ranges preserve your seeds with readable text and essential outlines.';
    for (const card of root.querySelectorAll('[data-example-card]')) if (card.getClientRects().length) card.dispatchEvent(new CustomEvent('looma-theme-preview', { detail: { css } }));
    const cssControl = root.querySelector('[data-css]');
    if (cssControl.getClientRects().length) updateControl(cssControl, css);
    for (const action of ['undo','redo']) componentRegistry.update(root.querySelector(`[data-action="${action}"]`), { disabled: !theme?.[action === 'undo' ? 'canUndo' : 'canRedo'] });
    const origin = recipe.origin ?? startingPointFor(recipe);
    root.querySelector('[data-theme-origin]').textContent = startingPointLabels[origin] ? `${startingPointLabels[origin]}${startingPointFor(recipe) === origin ? '' : ' · customized'}` : 'Your theme';
    root.querySelector('[data-material-dependencies]').textContent = Number(recipe.values['light-strength']) === 0
      ? 'Light strength is zero: reflections, glow and bright edge catches are off. Depth shadows and the dark edge remain; depth still follows the source direction.'
      : Number(recipe.values.finish) === 0 ? 'This material is matte: light spread has no reflection to shape. Raise Finish or choose Polished to see it; depth and illuminated edges remain independent.'
      : 'Finish catches the light. Spread shapes its reflection; strength affects reflection, edge light and glow together.';
    const gaps = root.querySelector('[data-spacing-samples]');
    gaps.setAttribute('aria-label', `Spacing progression with curve ${recipe.values['space-curve']}`);
    updateSizes();
  };
  const show = (next, persist = true) => {
    recipe = validateRecipe(next);
    if (persist) theme?.apply(recipe);
    for (const control of root.querySelectorAll('[data-token]')) updateControl(control, recipe.values[control.dataset.token]);
    updateControl(root.querySelector('[data-preset]'), startingPointFor(recipe));
    updateUnits();
    changed = JSON.stringify(recipe) !== JSON.stringify(saved);
    paint();
  };
  const clearComparison = () => {
    if (!comparing && !candidate) return;
    comparing = false; candidate = undefined; theme?.compare();
    root.querySelector('[data-action="compare"]').setAttribute('aria-pressed', 'false');
    root.querySelector('[data-variation-confirm]').hidden = true;
  };
  const preview = next => {
    const validated = validateRecipe(next);
    if (JSON.stringify(validated.values) === JSON.stringify(recipe.values)) return;
    clearComparison();
    if (!pending) gestureStart = structuredClone(recipe);
    recipe = validated; pending = true;
    if (!previewFrame) previewFrame = view.requestAnimationFrame(() => {
      previewFrame = 0;
      theme?.preview(recipe);
      show(recipe, false);
    });
  };
  const flush = (commit = true) => {
    if (previewFrame) view.cancelAnimationFrame(previewFrame);
    previewFrame = 0;
    if (!pending) return;
    pending = false;
    const netChange = JSON.stringify(recipe.values) !== JSON.stringify(gestureStart.values);
    if (commit && netChange) theme?.apply(recipe); else theme?.cancel();
    show(theme?.recipe ?? (netChange && commit ? recipe : gestureStart), false);
    gestureStart = undefined;
  };
  const filterExamples = () => {
    const words = root.querySelector('[data-example-query]').value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of root.querySelectorAll('[data-customizer-overview] .examples [data-example-card]')) {
      const matches = words.every(word => card.textContent.toLocaleLowerCase().includes(word) || card.dataset.componentCard.includes(word));
      card.closest('section').hidden = !matches;
      if (matches) visible++;
    }
    root.querySelector('[data-example-count]').textContent = visible ? `${visible} example${visible === 1 ? '' : 's'} in preview` : 'No previews match. Clear the filter or add another example.';
    componentRegistry.update(root.querySelector('[data-action="add"]'), { disabled: !selectedExample || host.state.cards.some(item => item.id === selectedExample) });
  };
  const refinedRecipe = values => {
    const presets = { ...recipe.presets };
    for (const family of ['material', 'palette']) {
      const state = refinementState(recipe, family);
      if (!presets[family] && state.id !== 'custom') presets[family] = state.id;
    }
    const origin = recipe.origin ?? (startingPointFor(recipe) === 'custom' ? undefined : startingPointFor(recipe));
    const fonts = { ...recipe.fonts };
    for (const key of Object.keys(fonts)) if (values[key] !== googleFontStack(fonts[key])) delete fonts[key];
    return { ...recipe, fonts, ...(origin ? { origin } : {}), presets, values };
  };
  const input = event => {
    if (event.target.matches('[data-example-query]')) { filterExamples(); return; }
    if (event.target.matches('[data-light-editor]')) {
      try {
        preview(refinedRecipe({ ...recipe.values, 'light-x': String(event.detail.x), 'light-y': String(event.detail.y) }));
      } catch (error) { say(error.message, true); }
      return;
    }
    const control = event.target.closest?.('[data-token]');
    if (!control) return;
    const field = fields.get(control.dataset.token);
    const raw = event.detail?.value ?? control.value;
    const value = control.dataset.editorKind ? editorValue(field, raw) : String(raw);
    const next = refinedRecipe({ ...recipe.values, [control.dataset.token]: value });
    try {
      preview(next); changed = JSON.stringify(recipe) !== JSON.stringify(saved);
      updateControl(root.querySelector('[data-preset]'), startingPointFor(recipe));
      control.removeAttribute('aria-invalid');
      for (const sibling of root.querySelectorAll('[data-token]')) if (sibling.dataset.token === control.dataset.token) updateControl(sibling, value);
      updateUnits();
      say('Previewing your theme. Finish the edit to remember it.');
    } catch (error) { control.setAttribute('aria-invalid', 'true'); say(error.message, true); }
  };
  const download = (data, name, type) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const click = async event => {
    const button = event.target.closest?.('[data-action]');
    if (!button) { view.requestAnimationFrame(paint); return; }
    if (button.dataset.action === 'save' && saving) return;
    flush();
    if (!['compare', 'preview-variation', 'apply-variation', 'cancel-variation'].includes(button.dataset.action)) clearComparison();
    try {
      switch (button.dataset.action) {
        case 'undo': case 'redo':
          theme?.[button.dataset.action](); show(theme?.recipe ?? recipe, false); sayApplied('Previous theme decision restored.'); break;
        case 'compare':
          candidate = undefined; comparing = !comparing; theme?.compare(comparing ? entryRecipe : undefined);
          button.setAttribute('aria-pressed', String(comparing)); root.querySelector('[data-variation-confirm]').hidden = true;
          say(comparing ? 'Comparing with the theme when you entered. Your edits remain intact. Choose Compare again to return.' : 'Back to your edited theme.'); break;
        case 'preview-variation': {
          clearComparison();
          const locks = [...root.querySelectorAll('[data-family-lock]')].filter(control => control.querySelector('input')?.checked).map(control => control.dataset.familyLock);
          candidate = nearbyVariation(recipe, root.querySelector('[data-variation-choice]').value, locks);
          theme?.compare(candidate); root.querySelector('[data-variation-confirm]').hidden = false;
          const differences = themeFields.filter(field => recipe.values[field.id] !== candidate.values[field.id]);
          root.querySelector('[data-variation-description]').textContent = differences.length ? differences.map(field => `${field.label}: ${recipe.values[field.id]} → ${candidate.values[field.id]}`).join('; ') : 'No changes: the relevant families are locked or already at their bounds.';
          break;
        }
        case 'apply-variation': {
          const selected = candidate; clearComparison();
          if (selected) show(selected); sayApplied('Variation applied. Undo returns to your previous theme.'); break;
        }
        case 'cancel-variation': clearComparison(); paint(); say('Variation cancelled; your theme is unchanged.'); break;
        case 'light-top': case 'light-left': case 'light-center': {
          const positions = { 'light-top': [.5, 0], 'light-left': [.15, .15], 'light-center': [.5, .5] };
          const [x, y] = positions[button.dataset.action];
          show(refinedRecipe({ ...recipe.values, 'light-x': String(x), 'light-y': String(y) }));
          sayApplied('Light direction applied throughout your theme.'); break;
        }
        case 'refine-material': case 'refine-palette': {
          const family = button.dataset.action.slice(7);
          refinementTrigger = button;
          root.querySelector('[data-customizer-overview]').hidden = true;
          for (const section of root.querySelectorAll('[data-refinement-view]')) section.hidden = section.dataset.refinementView !== family;
          const section = root.querySelector(`[data-refinement-view="${family}"]`);
          paint(); section.focus(); section.scrollIntoView({ block: 'start' });
          break;
        }
        case 'back':
          for (const section of root.querySelectorAll('[data-refinement-view]')) section.hidden = true;
          root.querySelector('[data-customizer-overview]').hidden = false;
          paint(); refinementTrigger?.focus(); break;
        case 'restore-material': case 'restore-palette': {
          const family = button.dataset.action.slice(8), state = refinementState(recipe, family);
          if (state.id !== 'custom') { show(applyRefinement(recipe, family, state.id)); sayApplied(`${family === 'material' ? 'Material' : 'Palette'} preset restored; other theme decisions are unchanged.`); }
          break;
        }
        case 'add': {
          const option = [...root.querySelectorAll('[data-add-example] option')].find(option => option.value === selectedExample);
          if (!option) break;
          const selected = JSON.parse(option.dataset.example);
          const card = Object.fromEntries(['id','title','description','exampleTitle','src','resizable','category','tag','nativeRoot','href','packageName'].map(key => [key, selected[key]]));
          if (!host.state.cards.some(item => item.id === card.id)) host.state.cards = [...host.state.cards, card];
          say(`${card.title} · ${card.exampleTitle} added to preview.`);
          view.requestAnimationFrame(() => { paint(); filterExamples(); }); break;
        }
        case 'css': {
          const response = await fetch(root.dataset.base + '_looma/theme-system.css', { signal: abort.signal });
          if (!response.ok) throw new Error('Could not load the shared theme recipe.');
          download(themeCSS(recipe, await response.text()), 'looma.theme.css', 'text/css'); say('Theme CSS downloaded.'); break;
        }
        case 'recipe': download(JSON.stringify(recipe, null, 2) + '\n', 'looma.theme.json', 'application/json'); say('Editable recipe downloaded.'); break;
        case 'import': file.click(); break;
        case 'reset': show(theme?.reset() ?? structuredClone(saved), false); say(theme?.storageAvailable ? 'Browser customization reset to the saved theme.' : 'Changes reset for this page. Browser storage is unavailable, so a previous browser theme may return after reload.'); break;
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
    if (event.target.matches('[data-light-editor]') || event.target.closest?.('[data-token]')) {
      input(event); flush(); sayApplied('Theme remembered in this browser. Undo restores the previous decision.'); return;
    }
    flush(); clearComparison();
    if (event.target.matches('[data-unit-for]')) {
      const field = fields.get(event.target.dataset.unitFor);
      try {
        let current = recipe.values[field.id];
        try { current = convertValueUnit(current, event.target.value, unitContext()); }
        catch { current = convertValueUnit(view.getComputedStyle(document.documentElement).getPropertyValue(field.property).trim(), event.target.value, unitContext()); }
        show({ ...recipe, values: { ...recipe.values, [field.id]: current } });
        sayApplied(`${field.label} units updated and remembered in this browser.`);
      } catch (error) { updateUnits(); say(error.message, true); }
    }
    if (event.target.matches('[data-refinement-preset]')) {
      const family = event.target.dataset.refinementPreset;
      show(applyRefinement(recipe, family, event.target.value));
      sayApplied(`${family === 'material' ? 'Material' : 'Coordinated palette'} preset applied and remembered in both modes.`);
    }
    if (event.target.matches('[data-preset]')) { show({ ...structuredClone(startingPoints[event.target.value]), origin: event.target.value }); sayApplied('Starting point applied throughout the documentation and remembered in this browser.'); }
    if (event.target === file && file.files[0]) {
      try { show(JSON.parse(await file.files[0].text())); sayApplied('Recipe applied throughout the documentation and remembered in this browser.'); }
      catch (error) { say(error.message, true); }
      file.value = '';
    }
  };
  const blur = event => { const control = event.target; if (control.closest?.('[data-token]')) queueMicrotask(() => { if (alive && control.validity?.customError) say(control.validationMessage, true); }); };
  const synchronize = () => { if (!pending && theme && JSON.stringify(recipe) !== JSON.stringify(theme.recipe)) show(theme.recipe, false); };
  const cancel = event => { if (event.target.matches('[data-light-editor], [data-editor-kind="curve"]')) { flush(false); say('Drag cancelled; the previous value is restored.'); } };
  const keyboard = event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    event.preventDefault(); flush(); clearComparison(); theme?.[event.shiftKey ? 'redo' : 'undo'](); show(theme?.recipe ?? recipe, false);
  };
  const ready = event => {
    if (event.data?.type === 'looma-preview-ready' && [...root.querySelectorAll('iframe')].some(frame => frame.contentWindow === event.source)) paint();
  };
  const remove = event => { host.state.cards = host.state.cards.filter(card => card.id !== event.detail.id); view.requestAnimationFrame(filterExamples); };
  let fontRequest = 0;
  const selectFont = async event => {
    const control = event.target.closest?.('[data-font-picker]'); if (!control) return;
    flush(); clearComparison();
    const id = control.dataset.fontPicker, family = event.detail.value;
    const fonts = { ...recipe.fonts };
    if (family === 'system') delete fonts[id]; else fonts[id] = family;
    const next = { ...refinedRecipe({ ...recipe.values, [id]: family === 'system' ? systemFont : googleFontStack(family) }), fonts };
    const status = root.querySelector(`[data-font-status="${id}"]`), request = ++fontRequest;
    show(next); status.textContent = family === 'system' ? 'Using your operating system’s native font.' : `Loading ${family} from Google Fonts…`;
    try {
      await loadGoogleFonts(document, fonts);
      if (alive && request === fontRequest) for (const [field, selected] of Object.entries(fonts)) {
        root.querySelector(`[data-font-status="${field}"]`).textContent = `${selected} loaded. Included in downloaded and locally saved CSS.`;
      }
    } catch (error) {
      if (alive && request === fontRequest) for (const field of Object.keys(fonts)) root.querySelector(`[data-font-status="${field}"]`).textContent = error.message;
    }
  };
  const selectExample = event => {
    if (!event.target.matches('[data-add-example]')) return;
    selectedExample = event.detail.value ?? '';
    filterExamples();
  };
  root.addEventListener('toggle', updateSizes, true);
  root.addEventListener('looma-example-remove', remove);
  root.addEventListener('input', input);
  root.addEventListener('cancel', cancel);
  root.addEventListener('keydown', keyboard);
  root.addEventListener('value-change', selectExample);
  root.addEventListener('value-change', selectFont);
  root.addEventListener('blur', blur, true);
  root.addEventListener('change', change);
  root.addEventListener('click', click);
  view.addEventListener('message', ready);
  view.addEventListener('beforeunload', flush);
  view.addEventListener(themeEvent, synchronize);
  show(recipe, false); filterExamples();
  if (theme?.storageAvailable === false) sayApplied('');
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
  return () => { root.removeEventListener('toggle', updateSizes, true); flush(); clearComparison(); root.removeEventListener('cancel', cancel); root.removeEventListener('keydown', keyboard); alive = false; abort.abort(); root.removeEventListener('looma-example-remove', remove); root.removeEventListener('input', input); root.removeEventListener('value-change', selectExample); root.removeEventListener('value-change', selectFont); root.removeEventListener('blur', blur, true); root.removeEventListener('change', change); root.removeEventListener('click', click); view.removeEventListener('beforeunload', flush); view.removeEventListener('message', ready); view.removeEventListener(themeEvent, synchronize); };
}
