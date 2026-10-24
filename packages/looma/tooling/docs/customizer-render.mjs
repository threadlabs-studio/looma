import { escapeHtml as escape } from './catalog.mjs';
import { componentPath, previewPath } from './render.mjs';
import { valueEditor } from './value-editors.mjs';
import { defaultRecipe, themeFields, startingPointLabels, startingPointFor, themeCSS, validateRecipe, themePalettes, paletteFor } from './theme.mjs';

export function customizerResource(site, input = defaultRecipe()) {
  const recipe = validateRecipe(input);
  const cardFields = ['id', 'title', 'description', 'exampleTitle', 'src', 'resizable', 'category', 'tag', 'nativeRoot', 'href', 'packageName'];
  const examples = site.catalog.components.flatMap(component => component.examples.map(example => ({ id: example.id, title: component.title, description: component.description, exampleTitle: example.title, src: site.base + previewPath(example).slice(1), resizable: Boolean(example.resizable), category: component.group, tag: component.tag, packageName: component.package, nativeRoot: component.root ? `<${component.root}>` : '', href: site.base + componentPath(component).slice(1) })));
  const toCard = example => Object.fromEntries(cardFields.map(key => [key, example[key]]));
  const initial = ['ui-button', 'ui-input', 'ui-color-picker', 'ui-checkbox', 'ui-card', 'ui-switch', 'ui-text', 'ui-dialog', 'ui-popover'].map(tag => examples.find(example => example.tag === tag && (tag !== 'ui-button' || example.id.endsWith('/02-variant')) && (tag !== 'ui-text' || example.id.endsWith('/02-variants')) && (tag !== 'ui-card' || example.id.endsWith('/04-glass'))) ?? examples.find(example => example.tag === tag)).filter(Boolean).map(toCard);
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
  const supplements = {
    'Colour': `<ui-form-field><label slot="label" for="theme-palette">Coordinated palette</label><span slot="help">Choose related action, paper and ink colors together. Size, material and motion stay yours. Both light and dark ranges are generated.</span><ui-select id="theme-palette" size="sm" data-palette value="${paletteFor(recipe)}"><option value="custom" disabled>Your palette</option>${Object.entries(themePalettes).map(([id, palette]) => `<option value="${id}">${escape(palette.label)}</option>`).join('')}</ui-select></ui-form-field><ui-cluster>${['light', 'dark'].map(mode => `<ui-card data-theme="${mode}" padding="sm"><ui-text variant="label">${mode === 'light' ? 'Light' : 'Dark'} range</ui-text><div class="palette-range" role="img" aria-label="${mode} canvas, content and action range"><span class="palette-canvas"></span><span class="palette-content"></span><span class="palette-action"></span></div><ui-text variant="caption">Fellowship office</ui-text></ui-card>`).join('')}</ui-cluster><p data-palette-adjustments role="status" aria-live="polite"></p><ui-disclosure summary="Resolved palette values"><p data-palette-adjustment-details></p></ui-disclosure><ui-disclosure summary="Palette seeds"><ui-stack>${themeFields.filter(item => item.family === 'Colour').map(renderField).join('')}</ui-stack></ui-disclosure>`,
    'Material': `<ui-disclosure summary="Material details"><ui-stack><p>Glassiness and surface separation coordinate the material. These controls preserve older recipes and offer finer adjustments.</p>${themeFields.filter(item => ['translucency', 'edge-light'].includes(item.id)).map(renderField).join('')}</ui-stack></ui-disclosure>`,
    'Size & spacing': `<ui-cluster><ui-button size="sm">Small</ui-button><ui-button>Medium</ui-button><ui-button size="lg">Large</ui-button></ui-cluster><ui-disclosure summary="How the scale grows"><ui-stack><p>Control size anchors one shared height. Size ratio separates small from large. Density and spacing curve change breathing room independently.</p>${themeFields.filter(item => ['scale-contrast','space-curve'].includes(item.id)).map(renderField).join('')}</ui-stack></ui-disclosure>`,
  };
  const families = [...new Set(themeFields.map(field => field.family))].map(family => `<ui-disclosure summary="${family}"${family === 'Colour' ? ' open' : ''}><ui-stack>${themeFields.filter(item => item.family === family && !['scale-contrast', 'space-curve', 'translucency', 'edge-light'].includes(item.id) && family !== 'Colour').map(renderField).join('')}${supplements[family] ?? ''}</ui-stack></ui-disclosure>`).join('');
  const options = site.catalog.groups.map(group => `<optgroup label="${escape(group.label)}">${examples.filter(example => example.category === group.id).map(example => `<option value="${escape(example.id)}" data-example="${escape(JSON.stringify(example))}" data-search="${escape(`${example.title} ${example.tag} ${example.description} ${example.exampleTitle}`.toLocaleLowerCase())}">${escape(example.title)} · ${escape(example.exampleTitle)}</option>`).join('')}</optgroup>`).join('');
  const links = ['ui-stack','ui-grid','ui-cluster','ui-form-field','ui-input','ui-select','ui-color-picker','ui-button','ui-disclosure','ui-textarea','ui-number-input','ui-slider','ui-curve-editor','ui-card','ui-text'].map(tag => `<link rel="component" href="@threadlabs/looma/components/${tag}/${tag}.html">`).join('\n');
  return `${links}\n<link rel="component" href="./card.html">\n<template component="looma-customizer" module="./customizer.js"><defs>
  <state name="cards" type="list" value="${escape(JSON.stringify(initial))}"><prop type="object">${cardFields.map(name => `<prop name="${name}" required type="${name === 'resizable' ? 'boolean' : 'string'}"></prop>`).join('')}</prop></state>
  </defs>
  <div data-looma-customizer data-recipe="${escape(JSON.stringify(recipe))}" data-base="${escape(site.base)}" data-mode="${site.config.local ? 'local' : 'public'}" data-revision="${escape(site.config.revision ?? '')}">
  <ui-stack gap="xl"><p>Shape your design system through shared decisions. These are the actual examples from the component documentation. Changes apply throughout your documentation and are remembered in this browser until reset. Save to repository writes the theme to your project; downloads let you use it elsewhere.</p>
  <div class="customizer-layout">
  <aside><ui-stack><ui-form-field><label slot="label" for="theme-start">Starting point</label><ui-select id="theme-start" data-preset value="${startingPointFor(recipe)}"><option value="custom" disabled>Your theme</option>${Object.entries(startingPointLabels).map(([id,label]) => `<option value="${id}">${label}</option>`).join('')}</ui-select></ui-form-field>
  ${families}
  <ui-cluster><ui-button data-action="css" variant="solid">Download CSS</ui-button><ui-button data-action="recipe">Download recipe</ui-button><ui-button data-action="import">Import recipe</ui-button><ui-button data-action="reset" variant="ghost">Reset changes</ui-button></ui-cluster>
  <input type="file" accept="application/json,.json" hidden data-recipe-file>
  <ui-button data-action="save" variant="solid" hidden>Save to repository</ui-button>
  <ui-disclosure summary="Use your theme"><p>Every export includes light and dark. Leave data-theme off the page to follow system preference, or set it to light or dark on the page or a section. <a href="${escape(site.base)}design-system/">Installation and mode guidance</a></p></ui-disclosure>
  <p role="status" aria-live="polite" data-message>Your theme is remembered in this browser. Repository files change only when you save.</p>
  <ui-disclosure summary="Theme CSS"><ui-textarea data-css readonly rows="12" aria-label="Generated theme CSS" value="${escape(themeCSS(recipe))}"></ui-textarea></ui-disclosure>
  </ui-stack></aside>
  <section class="examples"><ui-stack><ui-form-field><label slot="label" for="example-query">Find components and examples</label><ui-input id="example-query" type="search" data-example-query placeholder="Name, tag or purpose"></ui-input></ui-form-field><p role="status" aria-live="polite" data-example-count></p><ui-form-field><label slot="label" for="example-choice">Add a documentation example</label><ui-select id="example-choice" data-add-example>${options}</ui-select></ui-form-field><ui-button data-action="add">Add example card</ui-button>
  <ui-grid columns="2" min="sm"><section $each="card of $cards" $key="$card.id"><looma-example-card ${cardFields.filter(name => name !== 'id').map(name => `from:${name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}="$card.${name}"`).join(' ')} from:identity="$card.id" loading="eager" removable></looma-example-card></section></ui-grid>
  <noscript>Enable JavaScript to edit the theme. The component reference and example previews remain available.</noscript>
  </ui-stack></section></div></ui-stack></div>
  <style>
    .customizer-layout { display: grid !important; grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr); gap: var(--ui-space-6) !important; align-items: start !important; }
    aside { position: sticky; inset-block-start: 5rem; max-block-size: calc(100dvh - 6rem); overflow: auto; padding-inline-end: var(--ui-space-2) !important; }
    .examples { min-inline-size: 0; }
    .palette-range { display: flex !important; min-block-size: var(--ui-control-size-sm); border: var(--ui-border-width) solid var(--ui-control-border); border-radius: var(--ui-radius-sm); overflow: hidden; }
    .palette-range > span { flex: 1; min-inline-size: var(--ui-space-5); }
    .palette-canvas { background: var(--ui-surface); }
    .palette-content { background: var(--ui-surface-raised); }
    .palette-action { background: var(--ui-accent); }
    @media (max-width: 64rem) { .customizer-layout { grid-template-columns: minmax(0, 1fr); } aside { position: static; max-block-size: none; } }
  </style></template>`;
}
