import { googleFontStack, systemFont, loadGoogleFonts } from './fonts.mjs';
import { documentationTheme, themeEvent } from './theme-session.mjs';
import { componentRegistry } from '@nextwebwg/html-next/runtime';
import { startingPoints, startingPointFor, startingPointLabels, themeCSS, validateRecipe, themeFields, themePalettes, materialPresets, statusPresets, applyRefinement, refinementState, deriveTheme } from './theme.mjs';

import { valueEditor, editorValue, convertValueUnit } from './value-editors.mjs';

/** The editor changes public theme values; the library owns every control's layout. */
export function connect(host) {
  const root = host.element;
  const document = root.ownerDocument;
  const view = document.defaultView;
  const message = root.querySelector('[data-message]');
  const file = root.querySelector('[data-recipe-file]');
  const theme = documentationTheme(view);
  const motionPreference = view.matchMedia('(prefers-reduced-motion: reduce)');
  let saved = validateRecipe(JSON.parse(root.dataset.recipe));
  let recipe = theme?.recipe ?? structuredClone(saved);
  let revision = root.dataset.revision;
  let capability;
  let changed = false;
  let saving = false;
  let alive = true;
  let selectedExample = '';
  const catalogExamples = [...root.querySelectorAll('[data-add-example] option[data-example]')].map(option => JSON.parse(option.dataset.example));
  const removedExamples = new Set();
  let previewQuery = '', previewLimit = 9;
  let refinementTrigger, overviewScroll = 0, motionAnimation, motionSignature;
  let previewFrame = 0, pending = false, gestureStart;
  const abort = new AbortController();
  const say = (text, error = false) => { message.textContent = text; message.setAttribute('role', error ? 'alert' : 'status'); };
  const sayApplied = text => say(theme?.storageAvailable ? text : 'Theme applies to this page. Browser storage is unavailable; download CSS or a recipe to keep it.');
  const fields = new Map(themeFields.map(field => [field.id, field]));
  const unitContext = () => ({ remPixels: parseFloat(view.getComputedStyle(document.documentElement).fontSize) });
  const editorFor = (field, value) => valueEditor(field, value, { remPixels: parseFloat(recipe.values['text-size']) });
  let boundsBase, lastLabelSize;
  const optionalColors = new Map();
  const updateControl = (element, value) => {
    if (element.matches('[data-choice]')) element.dataset.selectedValue = value;
    const field = fields.get(element.dataset.token);
    if (field?.type === 'optional-colour' && value === field.defaultValue) return;
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
  const header = document.querySelector('[data-component~="markupress-header"]');
  const previews = [...root.querySelectorAll('[data-editor-preview], .palette-preview')];
  let layoutFrame = 0;
  const updatePreviewLayout = () => {
    const chrome = header?.getBoundingClientRect().height ?? 0;
    root.style.setProperty('--_editor-chrome-height', `${chrome}px`);
    for (const preview of previews) preview.toggleAttribute('data-page-flow', preview.offsetHeight > (view.innerHeight - chrome) / 2);
  };
  // Layout writes must run outside ResizeObserver delivery, including when a preview appears.
  const schedulePreviewLayout = () => {
    if (!layoutFrame) layoutFrame = view.requestAnimationFrame(() => {
      layoutFrame = 0;
      updatePreviewLayout();
    });
  };
  const replayMotion = () => {
    const element = root.querySelector('[data-motion-object]');
    const duration = parseFloat(convertValueUnit(recipe.values['response-time'], 'ms', unitContext()));
    motionAnimation?.cancel();
    const available = Math.max(0, element.parentElement.clientWidth - element.offsetWidth - 2 * parseFloat(view.getComputedStyle(element.parentElement).paddingInlineStart));
    const start = available * .3, end = available * .7;
    element.style.transform = `translateX(${start}px)`;
    if (motionPreference.matches) return;
    motionAnimation = element.animate([{ transform: `translateX(${start}px)` }, { transform: `translateX(${end}px)` }], { duration: Math.max(0, duration) * 3, easing: recipe.values['response-curve'], iterations: 2, direction: 'alternate', fill: 'none' });
  };
  const paint = () => {
    const values = recipe.values;
    for (const field of themeFields.filter(field => field.type === 'optional-colour')) {
      const value = values[field.id], custom = value !== field.defaultValue;
      if (custom) optionalColors.set(field.id, value);
      const picker = root.querySelector(`[data-optional-color="${field.id}"]`);
      picker.hidden = !custom;
      componentRegistry.update(root.querySelector(`[data-color-source="${field.id}"]`), { value: custom ? 'custom' : 'default' });
    }
    for (const sample of root.querySelectorAll('[data-extra-accent]')) sample.hidden = values[sample.dataset.extraAccent] === 'none';
    for (const readout of root.querySelectorAll('[data-palette-roles]')) {
      const { tokens } = deriveTheme(recipe, { mode: readout.dataset.paletteRoles });
      readout.textContent = `Shared border ${tokens['--ui-control-border']} · minimum ${values['neutral-border-contrast']}:1. `;
    }
    const followsBody = values['label-size'] === 'inherit';
    if (!followsBody) lastLabelSize = values['label-size'];
    const labelSize = root.querySelector('[data-label-size-value]');
    labelSize.hidden = followsBody;
    const labelValue = followsBody ? lastLabelSize ?? values['text-size'] : values['label-size'];
    componentRegistry.update(labelSize, { value: labelValue, unit: labelValue.match(/[a-z]+$/i)?.[0] ?? 'px' });
    componentRegistry.update(root.querySelector('[data-label-size-source]'), { value: followsBody ? 'inherit' : 'custom' });
    root.querySelector('[data-theme-summary]').textContent = startingPointLabels[recipe.origin ?? startingPointFor(recipe)] ?? 'Your theme';
    const summaries = {
      palette: `${themePalettes[refinementState(recipe, 'palette').id]?.label ?? 'Custom colors'} · Light & dark`,
      material: `${materialPresets[refinementState(recipe, 'material').id]?.label ?? 'Custom material'}`,
      typography: `${recipe.fonts?.['body-font'] ?? values['body-font'].split(',')[0]} · ${values['text-size']}`,
      layout: `${Number(values.rhythm) * Number(values.spacing) < .95 ? 'Compact' : Number(values.rhythm) * Number(values.spacing) > 1.2 ? 'Relaxed' : 'Comfortable'} · ${parseFloat(values['corner-roundness']) === 0 ? 'Square' : 'Rounded'} corners`,
      motion: `${values['response-time']} · ${values['response-curve'].startsWith('cubic-bezier') ? 'Custom curve' : values['response-curve']}`,
    };
    for (const [family, text] of Object.entries(summaries)) root.querySelector(`[data-summary="${family}"]`).textContent = text;
    root.querySelector('[data-motion-readout]').textContent = `${values['response-time']} feedback · ${parseFloat(convertValueUnit(values['response-time'], 'ms', unitContext())) * 3}ms travel`;
    componentRegistry.update(root.querySelector('[data-action="replay-motion"]'), { disabled: motionPreference.matches });
    root.querySelector('[data-motion-preference]').textContent = motionPreference.matches ? 'Reduced motion is on. The study stays still.' : 'Travel is three times the feedback duration, like a larger surface transition.';

    const css = theme?.css || themeCSS(recipe);
    if (boundsBase !== recipe.values['text-size']) {
      boundsBase = recipe.values['text-size'];
      for (const control of root.querySelectorAll('[data-token]')) {
        const field = fields.get(control.dataset.token);
        if (field?.type.includes('length') && field.id !== 'text-size') updateControl(control, recipe.values[field.id]);
      }
    }
    for (const family of ['material','palette','status']) {
      const state = refinementState(recipe, family), presets = { material: materialPresets, palette: themePalettes, status: statusPresets }[family];
      for (const select of root.querySelectorAll(`[data-refinement-preset="${family}"]`)) {
        for (const option of select.querySelectorAll('option')) if (presets[option.value]) {
          const label = presets[option.value].label + (state.id === option.value && state.customized ? ' · customized' : '');
          if (option.textContent !== label) option.textContent = label;
        }
        updateControl(select, state.id);
        const origin = startingPoints[recipe.origin ?? startingPointFor(recipe)];
        const muted = Boolean(origin && Object.keys(Object.values(presets)[0].values).every(key => origin.values[key] === recipe.values[key]));
        componentRegistry.update(select, { muted });
      }
      componentRegistry.update(root.querySelector(`[data-action="restore-${family}"]`), { disabled: state.id === 'custom' || !state.customized });
    }
    for (const control of root.querySelectorAll('[data-font-picker]')) {
      control.querySelector('option[value=custom]').textContent = recipe.values[control.dataset.fontPicker].split(',')[0].replaceAll('"', '').trim();
      componentRegistry.update(control, { value: control.dataset.fontPicker === 'display-font' && recipe.values['display-font'] === recipe.values['body-font'] ? 'inherit' : recipe.fonts?.[control.dataset.fontPicker] ?? (recipe.values[control.dataset.fontPicker] === systemFont ? 'system' : 'custom') });
    }
    componentRegistry.update(root.querySelector('[data-light-editor]'), { x: Number(recipe.values['light-x']), y: Number(recipe.values['light-y']) });
    root.querySelector('[data-glass-hint]').hidden = !(Number(recipe.values.glassiness) > 0 && Number(recipe.values.translucency) === 0);
    const adjustments = ['light', 'dark'].flatMap(mode => deriveTheme(recipe, { mode }).adjustments.map(item => ({ ...item, mode })));
    const report = root.querySelector('[data-palette-adjustments]');
    report.textContent = adjustments.length ? 'Paired ranges are derived for readability. Your base colors stay editable; resolved values are shown below.' : 'Both ranges preserve your base colors with readable text and essential outlines.';
    root.querySelector('[data-palette-adjustment-details]').textContent = adjustments.length ? adjustments.map(item => `${item.mode} ${fields.get(item.id).label.toLowerCase()} ${item.requested} → ${item.resolved}`).join('; ') + '. Base colors remain editable.' : 'Both ranges preserve your base colors with readable text and essential outlines.';
    const cssControl = root.querySelector('[data-css]');
    if (cssControl.getClientRects().length) updateControl(cssControl, css);
    for (const action of ['undo','redo']) componentRegistry.update(root.querySelector(`[data-action="${action}"]`), { disabled: !theme?.[action === 'undo' ? 'canUndo' : 'canRedo'] });
    for (const button of root.querySelectorAll('[data-relationship]')) button.setAttribute('aria-pressed', String(button.dataset.relationship === recipe.values['palette-relationship']));
    for (const sample of root.querySelectorAll('[data-relationship-preview]')) {
      if (!sample.getClientRects().length) continue;
      const tokens = deriveTheme({ ...recipe, values: { ...recipe.values, 'palette-relationship': sample.dataset.relationshipPreview } }, { mode: 'light' }).tokens;
      for (const [role, token] of [['canvas','--ui-surface'],['content','--ui-surface-raised'],['action','--ui-accent']]) sample.style.setProperty('--_palette-' + role, tokens[token]);
    }
    for (const indicator of root.querySelectorAll('[data-relationship-selected]')) indicator.hidden = indicator.dataset.relationshipSelected !== recipe.values['palette-relationship'];
    root.querySelector('[data-material-dependencies]').textContent = Number(recipe.values['light-strength']) === 0
      ? 'Light strength is zero: reflections, glow and bright edge catches are off. Depth shadows and the dark edge remain; depth still follows the source direction.'
      : Number(recipe.values.finish) === 0 ? 'This material is matte: light spread has no reflection to shape. Raise Finish or choose Polished to see it; depth and illuminated edges remain independent.'
      : 'Finish catches the light. Spread shapes its reflection; strength affects reflection, edge light and glow together.';
    const gaps = root.querySelector('[data-spacing-samples]');
    gaps.setAttribute('aria-label', `Spacing progression with curve ${recipe.values['space-curve']}`);
    updateSizes();
    updatePreviewLayout();
    const nextMotion = `${values['response-time']}/${values['response-curve']}`;
    if (!root.querySelector('[data-refinement-view="motion"]').hidden && motionSignature !== nextMotion) {
      motionSignature = nextMotion; replayMotion();
    }
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
  const preview = next => {
    const validated = validateRecipe(next);
    if (JSON.stringify(validated.values) === JSON.stringify(recipe.values)) return;
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
    const query = root.querySelector('[data-example-query]').value.toLocaleLowerCase().trim();
    if (query !== previewQuery) { previewQuery = query; previewLimit = 9; }
    const words = query.split(/\s+/).filter(Boolean), seen = new Set(), identities = new Set(), matches = [];
    const include = (example, chosen = false) => {
      const text = [example.title, example.tag, example.description, example.exampleTitle, example.category].join(' ').toLocaleLowerCase();
      if (removedExamples.has(example.id) || identities.has(example.id) || (!chosen && seen.has(example.tag)) || !words.every(word => text.includes(word))) return;
      identities.add(example.id); seen.add(example.tag); matches.push(example);
    };
    host.state.cards.forEach(example => include(example, true));
    catalogExamples.forEach(example => include(example));
    host.state.previews = matches.slice(0, previewLimit);
    const visible = Math.min(matches.length, previewLimit);
    root.querySelector('[data-example-count]').textContent = visible ? `Showing ${visible} of ${matches.length} preview${matches.length === 1 ? '' : 's'}` : 'No components match. Try another name, tag or purpose.';
    root.querySelector('[data-action="more-examples"]').hidden = visible >= matches.length;
    view.requestAnimationFrame(paint);
    componentRegistry.update(root.querySelector('[data-action="add"]'), { disabled: !selectedExample || host.state.cards.some(item => item.id === selectedExample) });
  };
  const refinedRecipe = values => {
    if (recipe.values['display-font'] === recipe.values['body-font'] && values['display-font'] === recipe.values['display-font']) values = { ...values, 'display-font': values['body-font'] };
    const presets = { ...recipe.presets };
    for (const family of ['material', 'palette', 'status']) {
      const state = refinementState(recipe, family);
      if (!presets[family] && state.id !== 'custom') presets[family] = state.id;
    }
    const origin = recipe.origin ?? (startingPointFor(recipe) === 'custom' ? undefined : startingPointFor(recipe));
    const fonts = { ...recipe.fonts };
    for (const key of Object.keys(fonts)) if (values[key] !== googleFontStack(fonts[key])) delete fonts[key];
    return { ...recipe, fonts, ...(origin ? { origin } : {}), presets, values };
  };
  const input = event => {
    if (event.target.matches('[data-label-size-value]')) {
      try { preview(refinedRecipe({ ...recipe.values, 'label-size': String(event.detail?.value ?? event.target.value) })); }
      catch (error) { say(error.message, true); }
      return;
    }
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
  const renderView = () => {
    const family = view.location.hash.slice(1);
    const section = [...root.querySelectorAll('[data-refinement-view]')].find(element => element.dataset.refinementView === family);
    const overview = root.querySelector('[data-customizer-overview]');
    if (section) refinementTrigger = root.querySelector(`[data-action="refine-${family}"]`);
    for (const element of root.querySelectorAll('[data-refinement-view]')) element.hidden = element !== section;
    overview.hidden = Boolean(section);
    motionAnimation?.cancel();
    if (family === 'motion') motionSignature = undefined;
    paint();
    if (section) { section.focus(); section.scrollIntoView({ block: 'start' }); }
    else { refinementTrigger?.focus({ preventScroll: true }); view.scrollTo({ top: overviewScroll, behavior: 'instant' }); }
  };
  const navigate = family => {
    flush();
    view.history.pushState(null, '', view.location.pathname + view.location.search + (family ? '#' + family : ''));
    renderView();
  };
  const click = async event => {
    const button = event.target.closest?.('[data-action]');
    if (!button) { view.requestAnimationFrame(paint); return; }
    if (button.dataset.action === 'save' && saving) return;
    if (button.matches('a')) event.preventDefault();
    flush();
    try {
      switch (button.dataset.action) {
        case 'replay-motion': replayMotion(); break;
        case 'undo': case 'redo':
          theme?.[button.dataset.action](); show(theme?.recipe ?? recipe, false); sayApplied('Previous theme decision restored.'); break;
        case 'refine-material': case 'refine-palette': case 'refine-typography': case 'refine-layout': case 'refine-motion': case 'refine-themes': case 'refine-export': case 'refine-components': {
          const family = button.dataset.action.slice(7);
          refinementTrigger = button; overviewScroll = view.scrollY;
          navigate(family);
          break;
        }
        case 'back': navigate(''); break;
        case 'use-glass': show(applyRefinement(recipe, 'material', 'glass')); sayApplied('Frosted glass applied. Your colors and type are unchanged.'); break;
        case 'restore-material': case 'restore-palette': case 'restore-status': {
          const family = button.dataset.action.slice(8), state = refinementState(recipe, family);
          if (state.id !== 'custom') { show(applyRefinement(recipe, family, state.id)); sayApplied(`${{ material: 'Material', palette: 'Palette', status: 'Status color' }[family]} preset restored; other theme decisions are unchanged.`); }
          break;
        }
        case 'add': {
          const option = [...root.querySelectorAll('[data-add-example] option')].find(option => option.value === selectedExample);
          if (!option) break;
          const selected = JSON.parse(option.dataset.example);
          const card = Object.fromEntries(['id','title','description','exampleTitle','resizable','category','tag','nativeRoot','href','packageName'].map(key => [key, selected[key]]));
          removedExamples.delete(card.id);
          if (!host.state.cards.some(item => item.id === card.id)) host.state.cards = [card, ...host.state.cards];
          updateControl(root.querySelector('[data-example-query]'), ''); previewQuery = '';
          previewLimit = Math.max(previewLimit, host.state.cards.length);
          say(`${card.title} · ${card.exampleTitle} added to preview.`);
          view.requestAnimationFrame(() => { paint(); filterExamples(); }); break;
        }
        case 'more-examples': previewLimit += 9; filterExamples(); break;
        case 'css': {
          const response = await fetch(root.dataset.base + '_looma/theme-system.css', { signal: abort.signal });
          if (!response.ok) throw new Error('Could not load the shared theme recipe.');
          download(themeCSS(recipe, await response.text()), 'looma.theme.css', 'text/css'); say('Theme CSS downloaded.'); break;
        }
        case 'recipe': download(JSON.stringify(recipe, null, 2) + '\n', 'looma.theme.json', 'application/json'); say('Editable recipe downloaded.'); break;
        case 'import': file.click(); break;
        case 'reset': {
          const origin = recipe.origin ?? startingPointFor(recipe);
          show(startingPoints[origin] ? { ...structuredClone(startingPoints[origin]), origin } : structuredClone(saved));
          sayApplied('Restored this theme’s starting values. Undo brings your changes back.'); break;
        }
        case 'palette-relationship': show(refinedRecipe({ ...recipe.values, 'palette-relationship': button.dataset.relationship })); sayApplied('Color relationship applied to both modes.'); break;
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
    const value = event.detail?.value ?? event.target.value;
    if (event.target.matches('[data-light-editor], [data-label-size-value]') || event.target.closest?.('[data-token]')) {
      input(event); flush(); sayApplied('Theme remembered in this browser. Undo restores the previous decision.'); return;
    }
    flush();
    if (event.target.matches('[data-color-source]')) {
      const field = fields.get(event.target.dataset.colorSource);
      const fallback = recipe.values.action;
      show(refinedRecipe({ ...recipe.values, [field.id]: value === 'default' ? field.defaultValue : optionalColors.get(field.id) ?? fallback }));
      sayApplied(`${field.label} updated and remembered in this browser.`);
      return;
    }
    if (event.target.matches('[data-label-size-source]')) {
      show(refinedRecipe({ ...recipe.values, 'label-size': value === 'inherit' ? 'inherit' : lastLabelSize ?? recipe.values['text-size'] }));
      sayApplied('Field label size updated and remembered in this browser.');
      return;
    }
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
      show(applyRefinement(recipe, family, value));
      sayApplied(`${{ material: 'Material', palette: 'Coordinated palette', status: 'Status color relationship' }[family]} preset applied and remembered in both modes.`);
    }
    if (event.target.matches('[data-preset]')) { show({ ...structuredClone(startingPoints[value]), origin: value }); sayApplied('Starting point applied throughout the documentation and remembered in this browser.'); }
    if (event.target === file && file.files[0]) {
      try { show(JSON.parse(await file.files[0].text())); sayApplied('Recipe applied throughout the documentation and remembered in this browser.'); }
      catch (error) { say(error.message, true); }
      file.value = '';
    }
  };
  const choose = event => {
    if (!event.target.matches('[data-choice]') || event.detail.kind !== 'selection') return;
    event.target.dataset.selectedValue = event.detail.value;
    change(event);
  };
  const blur = event => { const control = event.target; if (control.closest?.('[data-token]')) queueMicrotask(() => { if (alive && control.validity?.customError) say(control.validationMessage, true); }); };
  const synchronize = () => { if (!pending && theme && JSON.stringify(recipe) !== JSON.stringify(theme.recipe)) show(theme.recipe, false); };
  const cancel = event => { if (event.target.matches('[data-light-editor], [data-editor-kind="curve"]')) { flush(false); say('Drag cancelled; the previous value is restored.'); } };
  const keyboard = event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    event.preventDefault(); flush(); theme?.[event.shiftKey ? 'redo' : 'undo'](); show(theme?.recipe ?? recipe, false);
  };
  const remove = event => {
    const example = catalogExamples.find(card => card.id === event.detail.id);
    const chosen = host.state.cards.some(card => card.id === event.detail.id);
    host.state.cards = host.state.cards.filter(card => card.id !== event.detail.id);
    const siblingRemains = host.state.cards.some(card => card.tag === example?.tag);
    for (const card of catalogExamples) if (card.tag === example?.tag && (!siblingRemains || card.id === event.detail.id)) removedExamples.add(card.id);
    if (chosen) previewLimit = Math.max(9, previewLimit - 1);
    view.requestAnimationFrame(filterExamples);
  };
  let fontRequest = 0;
  const selectFont = async event => {
    const control = event.target.closest?.('[data-font-picker]'); if (!control) return;
    flush();
    const id = control.dataset.fontPicker, family = event.detail.value;
    const fonts = { ...recipe.fonts };
    if (family === 'system' || family === 'inherit') delete fonts[id]; else fonts[id] = family;
    const value = family === 'inherit' ? recipe.values['body-font'] : family === 'system' ? systemFont : googleFontStack(family);
    const linked = recipe.values['display-font'] === recipe.values['body-font'];
    if (id === 'body-font' && linked) delete fonts['display-font'];
    const next = { ...refinedRecipe({ ...recipe.values, [id]: value }), fonts };
    if (id === 'display-font' && family === 'inherit' && fonts['body-font']) next.fonts['display-font'] = fonts['body-font'];
    const status = root.querySelector(`[data-font-status="${id}"]`), request = ++fontRequest;
    show(next); status.textContent = family === 'inherit' ? 'Headings use the main font.' : family === 'system' ? 'Using your operating system’s native font.' : `Loading ${family} from Google Fonts…`;
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
  const motionPreferenceChanged = () => { motionAnimation?.cancel(); paint(); };
  const previewObserver = new view.ResizeObserver(schedulePreviewLayout);
  for (const element of [...previews, ...(header ? [header] : [])]) previewObserver.observe(element);
  view.addEventListener('resize', schedulePreviewLayout);
  motionPreference.addEventListener('change', motionPreferenceChanged);
  root.addEventListener('toggle', updateSizes, true);
  root.addEventListener('looma-example-remove', remove);
  root.addEventListener('input', input);
  root.addEventListener('cancel', cancel);
  root.addEventListener('keydown', keyboard);
  root.addEventListener('value-change', choose);
  root.addEventListener('value-change', selectExample);
  root.addEventListener('value-change', selectFont);
  root.addEventListener('blur', blur, true);
  root.addEventListener('change', change);
  root.addEventListener('click', click);
  view.addEventListener('popstate', renderView);
  view.addEventListener('hashchange', renderView);
  view.addEventListener('beforeunload', flush);
  view.addEventListener(themeEvent, synchronize);
  show(recipe, false); filterExamples();
  if (view.location.hash) renderView();
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
  return () => { previewObserver.disconnect(); if (layoutFrame) view.cancelAnimationFrame(layoutFrame); view.removeEventListener('resize', schedulePreviewLayout); motionPreference.removeEventListener('change', motionPreferenceChanged); root.removeEventListener('toggle', updateSizes, true); motionAnimation?.cancel(); flush(); root.removeEventListener('cancel', cancel); root.removeEventListener('keydown', keyboard); alive = false; abort.abort(); root.removeEventListener('looma-example-remove', remove); root.removeEventListener('input', input); root.removeEventListener('value-change', choose); root.removeEventListener('value-change', selectExample); root.removeEventListener('value-change', selectFont); root.removeEventListener('blur', blur, true); root.removeEventListener('change', change); root.removeEventListener('click', click); view.removeEventListener('beforeunload', flush); view.removeEventListener('popstate', renderView); view.removeEventListener('hashchange', renderView); view.removeEventListener(themeEvent, synchronize); };
}
