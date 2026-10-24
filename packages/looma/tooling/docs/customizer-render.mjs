import { escapeHtml as escape } from './catalog.mjs';
import { componentPath, previewPath } from './render.mjs';
import { valueEditor } from './value-editors.mjs';
import { defaultRecipe, themeFields, startingPointLabels, startingPointFor, themeCSS, validateRecipe, themePalettes, materialPresets, refinementState } from './theme.mjs';

export function customizerResource(site, input = defaultRecipe()) {
  const recipe = validateRecipe(input);
  const cardFields = ['id', 'title', 'description', 'exampleTitle', 'src', 'resizable', 'category', 'tag', 'nativeRoot', 'href', 'packageName'];
  const examples = site.catalog.components.flatMap(component => component.examples.map(example => ({ id: example.id, title: component.title, description: component.description, exampleTitle: example.title, src: site.base + previewPath(example).slice(1), resizable: Boolean(example.resizable), category: component.group, tag: component.tag, packageName: component.package, nativeRoot: component.root ? `<${component.root}>` : '', href: site.base + componentPath(component).slice(1) })));
  const toCard = example => Object.fromEntries(cardFields.map(key => [key, example[key]]));
  const initial = ['ui-button', 'ui-input', 'ui-color-picker', 'ui-checkbox', 'ui-card', 'ui-switch', 'ui-text', 'ui-dialog', 'ui-popover'].map(tag => examples.find(example => example.tag === tag && (tag !== 'ui-button' || example.id.endsWith('/02-variant')) && (tag !== 'ui-text' || example.id.endsWith('/02-variants')) && (tag !== 'ui-card' || example.id.endsWith('/04-expressive-surface'))) ?? examples.find(example => example.tag === tag)).filter(Boolean).map(toCard);
  if (!initial.length && examples.length) initial.push(toCard(examples[0]));
  const renderField = field => {
    const value = recipe.values[field.id], editor = valueEditor(field, value);
    const common = `size="sm" data-token="${field.id}" label="${escape(field.label)}"`;
    let control;
    if (field.type === 'easing') {
      control = `<ui-input id="theme-${field.id}" size="sm" data-token="${field.id}" aria-label="${escape(field.label)}" value="${escape(value)}"></ui-input><div data-curve-for="${field.id}"${editor.kind === 'text' ? ' hidden' : ''}><ui-curve-editor ${common} data-editor-kind="curve" value="${escape(value)}"></ui-curve-editor></div>`;
    } else if (editor.kind === 'number' || editor.kind === 'slider') {
      const tag = editor.kind === 'slider' ? 'ui-slider' : 'ui-number-input';
      const numeric = `<${tag} id="theme-${field.id}" ${common} data-editor-kind="${editor.kind}" value="${escape(editor.value)}" unit="${editor.unit}" min="${editor.min}" max="${editor.max}" step="${editor.step}"></${tag}>`;
      control = editor.units ? `<ui-cluster wrap="nowrap" gap="xs">${numeric}<ui-select size="sm" style="--ui-select-inline-size: auto" data-unit-for="${field.id}" aria-label="${escape(field.label)} unit" value="${editor.unit}">${[...new Set([...editor.units, editor.unit])].map(unit => `<option value="${unit}">${unit}</option>`).join('')}</ui-select></ui-cluster>` : numeric;
    } else {
      control = `<ui-cluster wrap="nowrap" gap="xs">${field.type === 'colour' ? `<ui-color-picker size="sm" data-token="${field.id}" value="${escape(value)}" label="${escape(field.label)} colour picker"></ui-color-picker>` : ''}<ui-input id="theme-${field.id}" size="sm" data-token="${field.id}" value="${escape(value)}" aria-label="${escape(field.label)}"></ui-input></ui-cluster>`;
    }
    return `<ui-form-field><label slot="label" for="theme-${field.id}">${escape(field.label)}</label><span slot="help">${escape(field.description)}</span>${control}</ui-form-field>`;
  };
  const renderPreset = (family, location) => {
    const presets = family === 'material' ? materialPresets : themePalettes;
    const state = refinementState(recipe, family), label = family === 'material' ? 'Material' : 'Palette';
    return `<ui-form-field><label slot="label" for="${location}-${family}">${label} preset</label><ui-select id="${location}-${family}" data-refinement-preset="${family}" aria-label="${label} preset" value="${state.id}"><option value="custom" disabled>Your ${family}</option>${Object.entries(presets).map(([id, preset]) => `<option value="${id}">${escape(preset.label)}${state.id === id && state.customized ? ' · customized' : ''}</option>`).join('')}</ui-select></ui-form-field>`;
  };
  const paletteDetails = `<ui-cluster>${['light', 'dark'].map(mode => `<ui-card data-theme="${mode}" padding="sm"><ui-text variant="label">${mode === 'light' ? 'Light' : 'Dark'} range</ui-text><div class="palette-range" role="img" aria-label="${mode} canvas, content and action range"><span class="palette-canvas"></span><span class="palette-content"></span><span class="palette-action"></span></div><ui-text variant="caption">Fellowship office</ui-text></ui-card>`).join('')}</ui-cluster><p data-palette-adjustments role="status" aria-live="polite"></p><ui-disclosure summary="Resolved palette values"><p data-palette-adjustment-details></p></ui-disclosure>`;
  const supplements = {
    'Colour': `${renderPreset('palette', 'overview')}<ui-text variant="caption">Coordinated light and dark ranges.</ui-text><ui-button data-action="refine-palette">Refine palette</ui-button>`,
    'Material': `${renderPreset('material', 'overview')}<ui-text variant="caption">Material and light, shared everywhere.</ui-text><ui-button data-action="refine-material">Refine material & light</ui-button>`,
    'Size & spacing': `<ui-cluster><ui-button size="sm">Small</ui-button><ui-button>Medium</ui-button><ui-button size="lg">Large</ui-button></ui-cluster><ui-disclosure summary="How the scale grows"><ui-stack><p>Control size anchors one shared height. Size ratio separates small from large. Density and spacing curve change breathing room independently.</p>${themeFields.filter(item => ['scale-contrast','space-curve'].includes(item.id)).map(renderField).join('')}</ui-stack></ui-disclosure>`,
  };
  const families = [...new Set(themeFields.map(field => field.family))].filter(family => !['Colour', 'Material'].includes(family)).map(family => `<ui-disclosure summary="${family}"><ui-stack>${themeFields.filter(item => item.family === family && !['scale-contrast', 'space-curve'].includes(item.id)).map(renderField).join('')}${supplements[family] ?? ''}</ui-stack></ui-disclosure>`).join('');
  const refinement = (family, content) => `<section data-refinement-view="${family}" hidden tabindex="-1" aria-label="${family === 'material' ? 'Material and light refinement' : 'Palette refinement'}"><ui-stack gap="xl"><ui-cluster justify="between"><ui-button data-action="back">Back to customization</ui-button><ui-button data-action="restore-${family}">Restore ${family} preset</ui-button></ui-cluster><ui-text variant="heading" as="h2">${family === 'material' ? 'Refine material & light' : 'Refine your palette'}</ui-text><p>These are advanced refinements of the same persistent theme. Every change applies throughout your documentation.</p>${renderPreset(family, 'refinement')}${content}</ui-stack></section>`;
  const materialView = refinement('material', `<div class="refinement-layout"><ui-stack><ui-light-editor data-light-editor x="${recipe.values['light-x']}" y="${recipe.values['light-y']}" label="Theme light position"><ui-stack gap="s"><ui-cluster><ui-button preset="primary">Join briefing</ui-button><ui-button preset="standard">Read memo</ui-button></ui-cluster><ui-input label="Office search" placeholder="Search the Fellowship office"></ui-input></ui-stack></ui-light-editor><ui-card variant="elevated" treatment="expressive"><ui-text variant="eyebrow">Fellowship office</ui-text><ui-text variant="heading" as="h3">Second breakfast briefing</ui-text><ui-text>Sam has prepared the agenda. Frodo has the maps, and Sméagol is taking minutes.</ui-text><ui-cluster><ui-button preset="primary">Join briefing</ui-button><ui-button preset="quiet">Read agenda</ui-button></ui-cluster></ui-card><ui-card variant="elevated"><ui-text variant="label">Standard elevated surface</ui-text><ui-text>Subtle lift stays independent from expressive treatment.</ui-text></ui-card></ui-stack><ui-stack><ui-text variant="label">Surface response</ui-text>${themeFields.filter(field => ['finish','edge-light','glow'].includes(field.id)).map(renderField).join('')}<ui-text variant="label">Light source</ui-text>${themeFields.filter(field => ['light-spread','light-strength'].includes(field.id)).map(renderField).join('')}<ui-disclosure summary="Depth, glass and separation"><ui-stack>${themeFields.filter(field => ['outer-depth','inner-depth','glassiness','surface-separation','translucency'].includes(field.id)).map(renderField).join('')}</ui-stack></ui-disclosure></ui-stack></div>`);
  const paletteView = refinement('palette', `<div class="refinement-layout"><ui-stack>${paletteDetails}<ui-card><ui-text variant="eyebrow">Fellowship office</ui-text><ui-text variant="heading" as="h3">There and back by Friday</ui-text><ui-text>Choose a coordinated range, then refine action, paper and ink. Readable roles follow automatically in both modes.</ui-text><ui-cluster><ui-button preset="primary">Share route</ui-button><ui-button preset="standard">Save draft</ui-button></ui-cluster></ui-card></ui-stack><ui-stack>${themeFields.filter(field => field.family === 'Colour').map(renderField).join('')}</ui-stack></div>`);
  const options = site.catalog.groups.map(group => `<optgroup label="${escape(group.label)}">${examples.filter(example => example.category === group.id).map(example => `<option value="${escape(example.id)}" data-description="${escape(example.category + ' · ' + example.tag)}" data-example="${escape(JSON.stringify(example))}" data-search="${escape(`${example.title} ${example.tag} ${example.description} ${example.exampleTitle}`.toLocaleLowerCase())}">${escape(example.title)} · ${escape(example.exampleTitle)}</option>`).join('')}</optgroup>`).join('');
  const links = ['ui-stack','ui-grid','ui-cluster','ui-form-field','ui-input','ui-select','ui-color-picker','ui-button','ui-disclosure','ui-textarea','ui-number-input','ui-slider','ui-curve-editor','ui-card','ui-text','ui-light-editor','ui-combobox'].map(tag => `<link rel="component" href="@threadlabs/looma/components/${tag}/${tag}.html">`).join('\n');
  return `${links}\n<link rel="component" href="./card.html">\n<template component="looma-customizer" module="./customizer.js"><defs>
  <state name="cards" type="list" value="${escape(JSON.stringify(initial))}"><prop type="object">${cardFields.map(name => `<prop name="${name}" required type="${name === 'resizable' ? 'boolean' : 'string'}"></prop>`).join('')}</prop></state>
  </defs>
  <div data-looma-customizer data-recipe="${escape(JSON.stringify(recipe))}" data-base="${escape(site.base)}" data-mode="${site.config.local ? 'local' : 'public'}" data-revision="${escape(site.config.revision ?? '')}">
  <ui-stack gap="l"><ui-text>Choose a starting point, refine shared decisions, and see them on real documentation examples.</ui-text>
  <ui-text variant="caption" role="status" aria-live="polite" data-message>Changes are remembered across the documentation.</ui-text>
  ${materialView}${paletteView}
  <div class="customizer-layout" data-customizer-overview>
  <aside aria-label="Theme controls"><ui-stack><ui-form-field><label slot="label" for="theme-start">Starting point</label><ui-select id="theme-start" data-preset value="${startingPointFor(recipe)}"><option value="custom" disabled>Your theme</option>${Object.entries(startingPointLabels).map(([id,label]) => `<option value="${id}">${label}</option>`).join('')}</ui-select></ui-form-field>
  ${supplements.Colour}${supplements.Material}
  <ui-disclosure summary="Type, size & motion"><ui-stack>${families}</ui-stack></ui-disclosure>
  <ui-button data-action="reset" variant="ghost">Reset changes</ui-button>
  <ui-disclosure summary="Export & save"><ui-stack><ui-cluster><ui-button data-action="css" variant="solid">Download CSS</ui-button><ui-button data-action="recipe">Download recipe</ui-button><ui-button data-action="import">Import recipe</ui-button></ui-cluster>
  <input type="file" accept="application/json,.json" hidden data-recipe-file>
  <ui-button data-action="save" variant="solid" hidden>Save to repository</ui-button>
  <ui-disclosure summary="Use your theme"><p>Every export includes light and dark. Leave data-theme off the page to follow system preference, or set it to light or dark on the page or a section. <a href="${escape(site.base)}design-system/">Installation and mode guidance</a></p></ui-disclosure>
  <ui-disclosure summary="Theme CSS"><ui-textarea data-css readonly rows="12" aria-label="Generated theme CSS" value="${escape(themeCSS(recipe))}"></ui-textarea></ui-disclosure></ui-stack></ui-disclosure>
  </ui-stack></aside>
  <section class="examples"><ui-stack><ui-form-field><label slot="label" for="example-query">Filter previews</label><ui-input id="example-query" type="search" data-example-query placeholder="Name, tag or purpose"></ui-input></ui-form-field><ui-text variant="caption" role="status" aria-live="polite" data-example-count></ui-text><ui-disclosure summary="Add an example"><ui-stack><ui-combobox id="example-choice" data-add-example label="Choose a component example" placeholder="Search buttons, fields, dialogs…" disclosure clearable>${options}</ui-combobox><ui-button data-action="add" disabled>Add to preview</ui-button></ui-stack></ui-disclosure>
  <ui-grid columns="2" min="sm"><section $each="card of $cards" $key="$card.id"><looma-example-card ${cardFields.filter(name => name !== 'id').map(name => `from:${name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}="$card.${name}"`).join(' ')} from:identity="$card.id" loading="eager" removable></looma-example-card></section></ui-grid>
  <noscript>Enable JavaScript to edit the theme. The component reference and example previews remain available.</noscript>
  </ui-stack></section></div></ui-stack></div>
  <style>
    [data-customizer-overview][hidden], [data-refinement-view][hidden] { display: none !important; }
    .customizer-layout { display: grid !important; grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr); gap: var(--ui-space-6) !important; align-items: start !important; }
    aside { position: sticky; inset-block-start: 5rem; max-block-size: calc(100dvh - 6rem); overflow: auto; padding-inline-end: var(--ui-space-2) !important; }
    .examples { min-inline-size: 0; }
    .refinement-layout { display: grid !important; grid-template-columns: minmax(0, 1.2fr) minmax(16rem, 1fr); gap: var(--ui-space-6) !important; align-items: start !important; }
    [data-refinement-view] { scroll-margin-block-start: 5rem; }
    .palette-range { display: flex !important; min-block-size: var(--ui-control-size-sm); border: var(--ui-border-width) solid var(--ui-control-border); border-radius: var(--ui-radius-sm); overflow: hidden; }
    .palette-range > span { flex: 1; min-inline-size: var(--ui-space-5); }
    .palette-canvas { background: var(--ui-surface); }
    .palette-content { background: var(--ui-surface-raised); }
    .palette-action { background: var(--ui-accent); }
    @media (max-width: 64rem) { .customizer-layout, .refinement-layout { grid-template-columns: minmax(0, 1fr); } aside { position: static; max-block-size: none; } }
  </style></template>`;
}
