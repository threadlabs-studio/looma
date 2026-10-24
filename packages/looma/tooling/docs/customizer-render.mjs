import { escapeHtml as escape } from './catalog.mjs';
import { componentPath, previewPath } from './render.mjs';
import { defaultRecipe, themeFields, startingPointLabels, startingPointFor, themeCSS, validateRecipe } from './theme.mjs';

export function customizerResource(site, input = defaultRecipe()) {
  const recipe = validateRecipe(input);
  const cardFields = ['id', 'title', 'description', 'exampleTitle', 'src', 'resizable', 'category', 'tag', 'nativeRoot', 'href', 'packageName'];
  const examples = site.catalog.components.flatMap(component => component.examples.map(example => ({ id: example.id, title: component.title, description: component.description, exampleTitle: example.title, src: site.base + previewPath(example).slice(1), resizable: Boolean(example.resizable), category: component.group, tag: component.tag, packageName: component.package, nativeRoot: component.root ? `<${component.root}>` : '', href: site.base + componentPath(component).slice(1) })));
  const toCard = example => Object.fromEntries(cardFields.map(key => [key, example[key]]));
  const initial = ['ui-button', 'ui-input', 'ui-color-picker', 'ui-checkbox', 'ui-card', 'ui-switch'].map(tag => examples.find(example => example.tag === tag && (tag !== 'ui-button' || example.id.endsWith('/02-variant'))) ?? examples.find(example => example.tag === tag)).filter(Boolean).map(toCard);
  if (!initial.length && examples.length) initial.push(toCard(examples[0]));
  const field = field => `<ui-form-field><label slot="label" for="theme-${field.id}">${escape(field.label)}</label><span slot="help">${escape(field.description)}</span><ui-cluster wrap="nowrap" gap="xs">${field.type === 'colour' ? `<ui-color-picker size="sm" data-token="${field.id}" value="${escape(recipe.values[field.id])}" label="${escape(field.label)} colour picker"></ui-color-picker>` : ''}<ui-input id="theme-${field.id}" size="sm" data-token="${field.id}" value="${escape(recipe.values[field.id])}" aria-label="${escape(field.label)}" type="${['positive','ratio','nonnegative','fraction','weight'].includes(field.type) ? 'number' : 'text'}"${['positive','ratio','nonnegative','fraction','weight'].includes(field.type) ? ' step="any"' : ''}></ui-input></ui-cluster></ui-form-field>`;
  const families = [...new Set(themeFields.map(field => field.family))].map(family => `<ui-disclosure summary="${family}"${family === 'Colour' ? ' open' : ''}><ui-stack>${themeFields.filter(item => item.family === family && !['scale-contrast', 'space-curve'].includes(item.id)).map(field).join('')}${family === 'Size & spacing' ? `<ui-cluster><ui-button size="sm">Small</ui-button><ui-button>Medium</ui-button><ui-button size="lg">Large</ui-button></ui-cluster><ui-disclosure summary="How the scale grows"><ui-stack><p>Control size anchors one shared height. Size ratio separates small from large. Density and spacing curve change breathing room independently.</p>${themeFields.filter(item => ['scale-contrast','space-curve'].includes(item.id)).map(field).join('')}</ui-stack></ui-disclosure>` : ''}</ui-stack></ui-disclosure>`).join('');
  const options = site.catalog.groups.map(group => `<optgroup label="${escape(group.label)}">${examples.filter(example => example.category === group.id).map(example => `<option value="${escape(example.id)}" data-example="${escape(JSON.stringify(example))}" data-search="${escape(`${example.title} ${example.tag} ${example.description} ${example.exampleTitle}`.toLocaleLowerCase())}">${escape(example.title)} · ${escape(example.exampleTitle)}</option>`).join('')}</optgroup>`).join('');
  const links = ['ui-stack','ui-grid','ui-cluster','ui-form-field','ui-input','ui-select','ui-color-picker','ui-button','ui-disclosure','ui-textarea'].map(tag => `<link rel="component" href="@threadlabs/looma/components/${tag}/${tag}.html">`).join('\n');
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
    @media (max-width: 64rem) { .customizer-layout { grid-template-columns: minmax(0, 1fr); } aside { position: static; max-block-size: none; } }
  </style></template>`;
}
