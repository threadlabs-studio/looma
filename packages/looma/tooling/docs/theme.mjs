import { googleFonts, googleFontStack, googleFontURL } from './fonts.mjs';
import { mixColour as mix, paletteSeeds, companionSurface, toLch, fromLch } from './palette.mjs';

const bounds = {
  'text-size': [14, 24], 'control-roominess': [2, 4], 'corner-roundness': [0, 32],
  'line-weight': [.5, 3], rhythm: [.75, 1.5], spacing: [.75, 1.5], 'scale-contrast': [1, 1.5],
  'space-curve': [.5, 2], 'text-weight': [400, 700], 'outer-depth': [0, 2], 'inner-depth': [0, 2],
  'response-time': [0, 600], 'neutral-border-contrast': [1, 4.5],
};

const brandChoices = { primary: 'Primary accent', secondary: 'Secondary accent', tertiary: 'Tertiary accent' };
const statusChoices = { derived: 'Semantic hue', related: 'Harmonize with primary', ...brandChoices };
const neutralChoices = { text: 'Derive from text', ...brandChoices, gray: 'Untinted gray' };
const relationshipChoices = { preserve: 'Preserve seed hues', neighboring: 'Neighboring hues', complementary: 'Complementary hues' };
const choicesFor = id => id === 'neutral-source' ? neutralChoices : id.endsWith('-source') ? statusChoices : id.endsWith('-accent') ? brandChoices : relationshipChoices;
const statusSeeds = { danger: '#c92d1e', success: '#007a33', warning: '#b27522', info: '#0066cc' };

/** The shared authoring schema; ids remain stable in saved recipes. */
export const themeFields = [
  ['Colour', 'action', 'Action', '--ui-accent', 'colour', '#5b55d6', 'Primary fill; readable labels and contextual action text are derived separately.'],
  ['Colour', 'secondary-action', 'Secondary accent', null, 'optional-colour', 'none', 'An optional supporting brand color for selected components. Primary actions keep the primary accent.'],
  ['Colour', 'tertiary-action', 'Tertiary accent', null, 'optional-colour', 'none', 'An optional third accent for categories, highlights and supporting content.'],
  ['Colour', 'neutral-source', 'Neutral relationship', null, 'choice', 'text', 'Derive restrained neutrals from text, an accent family or an untinted gray. Shared border contrast and readable labels stay governed.'],
  ['Colour', 'neutral-strength', 'Neutral fill strength', null, 'fraction', '0.25', 'How much neutral pigment appears in quiet filled controls. Borders remain shared with fields.'],
  ['Colour', 'neutral-border-contrast', 'Border contrast', null, 'ratio', '2', 'Minimum border-to-surface contrast for outlined buttons and form fields, independent of text readability. 2:1 is the default; raise it for stronger boundaries.'],
  ['Colour', 'status-chroma', 'Derived status saturation', null, 'fraction', '0.5', 'Coordinate derived status pigment, text and quiet tints with the primary accent. Brand mappings keep the chosen family intact.'],
  ['Colour', 'success-source', 'Success relationship', null, 'choice', 'derived', 'Choose a semantic hue, harmonize it with primary, or use a governed brand-accent family.'],
  ['Colour', 'danger-source', 'Error relationship', null, 'choice', 'derived', 'Choose a semantic hue, harmonize it with primary, or use a governed brand-accent family.'],
  ['Colour', 'warning-source', 'Warning relationship', null, 'choice', 'derived', 'Choose a semantic hue, harmonize it with primary, or use a governed brand-accent family.'],
  ['Colour', 'info-source', 'Info relationship', null, 'choice', 'derived', 'Choose a semantic hue, harmonize it with primary, or use a governed brand-accent family.'],
  ['Colour', 'selection-accent', 'Selection accent', null, 'choice', 'primary', 'Choose the accent for selected rows and choices.'],
  ['Colour', 'focus-accent', 'Focus accent', null, 'choice', 'primary', 'Choose the accent for keyboard focus rings.'],
  ['Colour', 'link-accent', 'Link accent', null, 'choice', 'primary', 'Choose the accent for inline Text links and editor links.'],
  ['Colour', 'canvas', 'Canvas', '--ui-surface', 'colour', '#f6f6f8', 'The ground behind surfaces.'],
  ['Colour', 'surface', 'Surface', '--ui-surface-raised', 'colour', '#ffffff', 'Fields, cards and floating surfaces.'],
  ['Colour', 'text', 'Text', '--ui-text', 'colour', '#1a1a1a', 'Readable content; supporting text follows this and Surface.'],
  ['Colour', 'warmth', 'Surface warmth', null, 'fraction', '0.5', '0% cool, 50% original, 100% warm paper and ink; your brand hue stays independent.'],
  ['Colour', 'color-intensity', 'Color intensity', null, 'fraction', '0.5', '0% quiet, 50% original, 100% vivid, coordinated across surfaces, actions and status colors.'],
  ['Colour', 'palette-relationship', 'Palette relationship', null, 'choice', 'preserve', 'Keep base hues, or relate quiet surfaces to the brand through neighboring or complementary hues.'],
  ['Type', 'body-font', 'Font', '--ui-font-sans', 'font', 'system-ui, sans-serif', 'The shared interface typeface.'],
  ['Type', 'display-font', 'Heading font', '--ui-font-display', 'font', 'system-ui, sans-serif', 'The heading typeface.'],
  ['Type', 'text-size', 'Base text size', '--ui-font-size', 'positive-length', '16px', 'Sets the document root in px. Type, spacing and layout use rem relationships and scale from this base once.'],
  ['Type', 'label-size', 'Field label size', '--ui-field-label-font-size', 'inherited-length', 'inherit', 'Follows body text unless you choose a separate size for field labels. Help text keeps its supporting size.'],
  ['Type', 'text-weight', 'Emphasis weight', '--ui-font-medium', 'weight', '500', 'Control-label emphasis; body and headings keep their roles.'],
  ['Size & spacing', 'control-roominess', 'Control roominess', '--ui-control-roominess', 'positive', '2.5', 'Shared control height as a multiple of base text size; buttons, fields and swatches stay aligned.'],
  ['Size & spacing', 'rhythm', 'Rhythm', '--ui-rhythm', 'positive', '1', 'Vertical breathing room: opens text lines and the gaps between stacked groups without spreading navigation or button rows.'],
  ['Size & spacing', 'spacing', 'Spacing', '--ui-spacing', 'positive', '1', 'Space between controls and around content. Changes gaps and padding independently of vertical rhythm.'],
  ['Size & spacing', 'scale-contrast', 'Size ratio', '--ui-scale-ratio', 'ratio', '1.2', 'The multiplier between small, medium and large controls. At 1 the sizes are equal; higher values separate them.'],
  ['Size & spacing', 'space-curve', 'Spacing curve', '--ui-space-curve', 'nonnegative', '1', 'Spacing growth: 1 is linear, 2 is quadratic. Independent of control sizes.'],
  ['Size & spacing', 'corner-roundness', 'Corner roundness', '--ui-radius-md', 'length', '8px', 'One corner family across controls and surfaces.'],
  ['Size & spacing', 'line-weight', 'Line weight', '--ui-border-width', 'length', '1px', 'Shared edge weight; focus stays independently visible.'],
  ['Material', 'outer-depth', 'Outer depth', '--ui-outer-depth', 'nonnegative', '0.6', 'How strongly controls and floating surfaces rise above the page.'],
  ['Material', 'inner-depth', 'Inner depth', '--ui-inner-depth', 'nonnegative', '0.3', 'How strongly fields and pressed controls sit into their surface.'],
  ['Material', 'glassiness', 'Frosting', '--ui-glassiness', 'fraction', '0', 'Blurs the scene through glass, from clear to frosted. Most transmission is in the rim; content stays nearly opaque.'],
  ['Material', 'surface-separation', 'Surface separation', '--ui-surface-separation', 'fraction', '0', 'One material offset, scaled by popup purpose and actual size: quiet tooltips through substantial dialogs.'],
  ['Material', 'translucency', 'Transparency', '--ui-overlay-translucency', 'fraction', '0', 'Reveals the scene through decorative rims. At maximum, the content plate also becomes slightly translucent.'],
  ['Material', 'edge-light', 'Edge light', '--ui-edge-light', 'fraction', '0', 'Light caught by surface edges, independent of depth.'],
  ['Material', 'finish', 'Finish', '--ui-finish', 'fraction', '0', 'Matte through polished: how strongly the material catches a reflection.'],
  ['Material', 'glow', 'Glow', '--ui-glow', 'fraction', '0', 'Reflected light beyond a surface, from a quiet halo to a vivid bloom at the upper end.'],
  ['Material', 'light-color', 'Light color', '--ui-light-color', 'colour', '#ffffff', 'The reflected environment, independent of object pigment. Neutral white by default; reflected hues remain readable.'],
  ['Material', 'light-x', 'Light horizontal position', '--ui-light-x', 'fraction', '0.5', 'The light source from left to right, relative to each surface.'],
  ['Material', 'light-y', 'Light vertical position', '--ui-light-y', 'fraction', '0', 'The light source from top to bottom, relative to each surface.'],
  ['Material', 'light-spread', 'Light spread', '--ui-light-spread', 'fraction', '0.5', 'A concentrated spot through broad illumination.'],
  ['Material', 'light-strength', 'Light strength', '--ui-light-strength', 'fraction', '0.65', 'Shared illumination; each material and component role determines its response.'],
  ['Motion', 'response-time', 'Response time', '--ui-motion-fast', 'time', '120ms', 'Shared feedback pace; floating transitions take proportionally longer.'],
  ['Motion', 'response-curve', 'Response curve', '--ui-motion-ease', 'easing', 'cubic-bezier(0.2,0,0.2,1)', 'How movement accelerates and settles.'],
].map(([family, id, label, property, type, defaultValue, description]) => Object.freeze({ family, id, label, property, type, defaultValue, description, ...(type === 'choice' ? { choices: choicesFor(id) } : {}), ...(bounds[id] ? { min: bounds[id][0], max: bounds[id][1] } : type === 'fraction' ? { min: 0, max: 1 } : {}) }));

const baseRecipe = () => ({ schemaVersion: 1, values: Object.fromEntries(themeFields.map(field => [field.id, field.defaultValue])) });
const starting = values => ({ schemaVersion: 1, values: { ...baseRecipe().values, ...values } });
const fontStarting = (values, body, display) => ({
  ...starting({ ...values, 'body-font': googleFontStack(body), 'display-font': googleFontStack(display) }),
  fonts: { 'body-font': body, 'display-font': display },
});
/** The documentation starts with Looma's coordinated identity; Minimal keeps the neutral baseline. */
export const defaultRecipe = () => ({ ...starting({ action: '#7658d6', canvas: '#fbf9f4', surface: '#fffdf8', text: '#2b2538', 'body-font': googleFontStack('Manrope'), 'display-font': googleFontStack('Manrope'), 'text-size': '17px', 'inner-depth': '0.7' }), fonts: { 'body-font': 'Manrope', 'display-font': 'Manrope' } });
export const startingPoints = {
  looma: defaultRecipe(),
  minimal: { ...starting({
    'neutral-source': 'gray', 'neutral-strength': '0.18', 'neutral-border-contrast': '2.2', 'status-chroma': '0.1',
    'corner-roundness': '6px', 'outer-depth': '0.2', 'inner-depth': '0', 'response-time': '100ms',
  }), presets: { status: 'restrained' } },
  gold: { ...fontStarting({
    action: '#ffb84d', 'secondary-action': '#704d7b', canvas: '#ffffff', surface: '#ffffff', text: '#171717',
    'neutral-source': 'primary', 'neutral-strength': '0.18', 'neutral-border-contrast': '2.1',
    'info-source': 'secondary', 'status-chroma': '0.25', 'selection-accent': 'secondary', 'link-accent': 'primary',
    'text-size': '17px', 'label-size': '16px', 'corner-roundness': '16px', finish: '0.55', 'light-x': '0',
  }, 'Lato', 'Fraunces'), presets: { status: 'semantic' } },
  bookish: { ...fontStarting({
    action: '#2e1228', 'secondary-action': '#fc5b69', 'tertiary-action': '#896853',
    canvas: '#f7f7f5', surface: '#fffefd', text: '#0d0c0c',
    'neutral-source': 'primary', 'neutral-strength': '0.18', 'neutral-border-contrast': '2.1',
    'info-source': 'primary', 'success-source': 'primary', 'status-chroma': '0.1',
    rhythm: '1.05', 'text-weight': '400', 'control-roominess': '2.625', 'scale-contrast': '1.18', 'corner-roundness': '6px',
    'outer-depth': '1', 'inner-depth': '1', glassiness: '0.8', 'surface-separation': '0.65', translucency: '0.18',
    'edge-light': '1', finish: '0.85', glow: '0.3', 'light-spread': '0.3', 'light-strength': '0.9',
    'response-time': '150ms', 'response-curve': 'ease',
  }, 'Open Sans', 'Newsreader'), presets: { status: 'restrained' } },
  wiki: starting({ rhythm: '0.95', 'text-weight': '400', 'space-curve': '0.8', action: '#4f46e5', canvas: '#ffffff', surface: '#ffffff', text: '#1a1a1a', 'control-roominess': '2.125', spacing: '0.95', 'scale-contrast': '1.15', 'corner-roundness': '6px', 'outer-depth': '0.35', 'inner-depth': '0', 'response-time': '110ms' }),
  editorial: { ...starting({
    action: '#182c24', 'secondary-action': '#9d4f38', 'tertiary-action': '#92743d',
    canvas: '#eee9dc', surface: '#fffdf5', text: '#182c24',
    'neutral-source': 'primary', 'neutral-strength': '0.12', 'neutral-border-contrast': '2.4',
    'success-source': 'primary', 'info-source': 'primary', 'warning-source': 'primary', 'danger-source': 'primary',
    'link-accent': 'secondary', 'focus-accent': 'secondary',
    rhythm: '1.3', 'text-size': '17px', 'label-size': '16px', spacing: '1.12', 'space-curve': '1.4', 'scale-contrast': '1.3',
    'body-font': 'Georgia, serif', 'display-font': 'Georgia, serif', 'text-weight': '400',
    'corner-roundness': '0px', 'outer-depth': '0', 'inner-depth': '0', 'line-weight': '2px',
    'response-time': '90ms', 'response-curve': 'linear',
  }), presets: { status: 'primary' } },
  night: { ...fontStarting({
    action: '#a7b8ff', 'secondary-action': '#68bfc2', 'tertiary-action': '#d0a56b',
    canvas: '#11141c', surface: '#202634', text: '#edf1fb',
    'neutral-source': 'primary', 'neutral-strength': '0.3', 'neutral-border-contrast': '2.2',
    'success-source': 'secondary', 'info-source': 'primary', 'warning-source': 'tertiary', 'status-chroma': '0.3',
    'selection-accent': 'secondary', 'link-accent': 'secondary',
    rhythm: '1.05', 'text-weight': '500', 'control-roominess': '2.375', spacing: '1.05', 'scale-contrast': '1.25',
    'corner-roundness': '12px', finish: '0.6', glow: '0.45', glassiness: '0.45', 'surface-separation': '0.25',
    'light-x': '0.25', 'light-spread': '0.65', 'outer-depth': '1.4', 'inner-depth': '0.45', translucency: '0.2', 'edge-light': '0.65',
    'response-time': '210ms', 'response-curve': 'cubic-bezier(0.2,0.8,0.2,1)',
  }, 'IBM Plex Sans', 'IBM Plex Mono'), presets: { status: 'semantic' } },
  garden: { ...fontStarting({
    action: '#256342', 'secondary-action': '#b9684b', 'tertiary-action': '#b9973e',
    canvas: '#f4edda', surface: '#fff8e7', text: '#173121',
    'neutral-source': 'primary', 'neutral-strength': '0.2', 'neutral-border-contrast': '2',
    'success-source': 'primary', 'info-source': 'primary', 'warning-source': 'tertiary', 'status-chroma': '0.2', 'focus-accent': 'secondary',
    rhythm: '1.2', 'text-weight': '400', 'space-curve': '1.15', 'control-roominess': '2.875', 'scale-contrast': '1.24', spacing: '1.05',
    'corner-roundness': '22px', finish: '0.15', 'light-spread': '1', 'outer-depth': '0.35', 'inner-depth': '0', 'edge-light': '0.2',
    'response-time': '180ms', 'response-curve': 'cubic-bezier(0.16,1,0.3,1)',
  }, 'Nunito Sans', 'Lora'), presets: { status: 'semantic' } },
};
export const startingPointLabels = { looma: 'Looma', minimal: 'Minimal', gold: 'Gold', bookish: 'Bookish', wiki: 'Wiki', editorial: 'Editorial', night: 'Night', garden: 'Garden' };
const paletteKeys = themeFields.filter(field => field.family === 'Colour').map(field => field.id);
// Palette choices move only the shared color seeds; size, material and motion stay independent.
export const themePalettes = Object.fromEntries([
  ['looma', 'Looma'], ['minimal', 'Indigo & mist'], ['gold', 'Gold'], ['bookish', 'Plum & paper'], ['wiki', 'Indigo & chalk'],
  ['editorial', 'Ink & parchment'], ['night', 'Midnight'], ['garden', 'Forest & cream'],
].map(([id, label]) => [id, { label, values: Object.fromEntries(paletteKeys.map(key => [key, startingPoints[id].values[key]])) }]));

const materialKeys = themeFields.filter(field => field.family === 'Material').map(field => field.id);
const materialDefaults = defaultRecipe().values;
const material = (label, overrides) => ({ label, values: Object.fromEntries(materialKeys.map(key => [key, overrides[key] ?? materialDefaults[key]])) });
export const materialPresets = {
  matte: material('Matte', { 'outer-depth': '0', 'inner-depth': '0' }),
  soft: material('Soft', { 'outer-depth': '0.6', 'inner-depth': '0.3', 'edge-light': '0.3', finish: '0.2', 'light-spread': '0.8' }),
  polished: material('Polished', { 'outer-depth': '1', 'inner-depth': '1', 'edge-light': '1', finish: '0.85', glow: '0.3', 'light-spread': '0.3', 'light-strength': '0.9' }),
  glass: material('Frosted glass', startingPoints.bookish.values),
};
const status = (label, source, chroma) => ({ label, values: {
  ...Object.fromEntries(Object.keys(statusSeeds).map(role => [role + '-source', source])), 'status-chroma': chroma,
} });
export const statusPresets = {
  semantic: status('Semantic colors', 'derived', '0.5'),
  restrained: status('Less color', 'derived', '0.1'),
  primary: status('Primary + icons', 'primary', '0.5'),
};
const refinementPresets = family => {
  switch (family) {
    case 'material': return materialPresets;
    case 'palette': return themePalettes;
    case 'status': return statusPresets;
  }
};

/** Preset provenance is optional recipe data, never a second source of theme values. */
export function refinementState(input, family) {
  const recipe = validateRecipe(input), presets = refinementPresets(family);
  if (!presets) throw new Error('Unknown refinement family.');
  const matches = preset => Object.entries(preset.values).every(([key, value]) => recipe.values[key] === value);
  const id = recipe.presets?.[family] ?? Object.keys(presets).find(id => matches(presets[id])) ?? 'custom';
  return { id, customized: id !== 'custom' && !matches(presets[id]) };
}

/** Apply or restore one family without changing the rest of the design system. */
export function applyRefinement(input, family, id) {
  const recipe = validateRecipe(input), preset = refinementPresets(family)?.[id];
  if (!preset) throw new Error('Unknown refinement preset.');
  return validateRecipe({ ...recipe, values: { ...recipe.values, ...preset.values }, presets: { ...recipe.presets, [family]: id } });
}

/** Identify a coordinated palette without coupling it to the rest of a recipe. */
export function paletteFor(input) {
  const { values } = validateRecipe(input);
  return Object.entries(themePalettes).find(([, palette]) => paletteKeys.every(key => values[key].toLowerCase() === palette.values[key].toLowerCase()))?.[0] ?? 'custom';
}

const scalar = /^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const length = /^(?:0|[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:px|rem|em|ex|ch|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cm|mm|Q|in|pt|pc))$/;
const font = /^(?:"[^"\\;{}<>@\x00-\x1f]+"|'[^'\\;{}<>@\x00-\x1f]+'|[\p{L}_-][\p{L}\p{N}_ -]*)(?:\s*,\s*(?:"[^"\\;{}<>@\x00-\x1f]+"|'[^'\\;{}<>@\x00-\x1f]+'|[\p{L}_-][\p{L}\p{N}_ -]*))*$/u;
const time = /^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/;
function easing(value) {
  if (/^(ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(value)) return true;
  const match = /^cubic-bezier\(\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*\)$/.exec(value);
  return Boolean(match && match.slice(1).every(n => Number.isFinite(Number(n))) && [1, 3].every(i => Number(match[i]) >= 0 && Number(match[i]) <= 1) && [2, 4].every(i => Number(match[i]) >= -1 && Number(match[i]) <= 2));
}

// Authoring bounds are shared by every entry path. Relative lengths keep their units;
// viewport/font-metric lengths are constrained at use time rather than guessed in JS.

const pixels = { px: 1, cm: 96 / 2.54, mm: 96 / 25.4, Q: 96 / 101.6, in: 96, pt: 96 / 72, pc: 16 };
function boundedNumber(field, value) {
  if (field.type === 'time') return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
  if (field.type.includes('length')) {
    if (value === '0') return 0;
    const unit = value.match(/[a-z]+$/i)?.[0];
    return Object.hasOwn(pixels, unit) ? parseFloat(value) * pixels[unit] : undefined;
  }
  return Number(value);
}

/** Validate the whole recipe before previewing or writing any output. */
export function validateRecipe(input) {
  if (!input || input.schemaVersion !== 1 || !input.values || typeof input.values !== 'object' || Array.isArray(input.values)) throw new Error('Unsupported theme recipe version or values.');
  const known = new Set(themeFields.map(field => field.id));
  for (const key of Object.keys(input.values)) if (!known.has(key)) throw new Error(`Unknown theme decision ${key}.`);
  const defaults = defaultRecipe();
  const values = { ...defaults.values, ...input.values };
  for (const field of themeFields) {
    const value = values[field.id];
    let valid = typeof value === 'string' && value.length > 0;
    if (valid) switch (field.type) {
      case 'choice': valid = Object.hasOwn(field.choices, value); break;
      case 'optional-colour': valid = value === field.defaultValue || /^#[\da-f]{6}$/i.test(value); break;
      case 'colour': valid = /^#[\da-f]{6}$/i.test(value); break;
      case 'font': valid = font.test(value); break;
      case 'length': valid = length.test(value) && Number.isFinite(parseFloat(value)); break;
      case 'inherited-length': valid = value === 'inherit' || (length.test(value) && Number.isFinite(parseFloat(value)) && parseFloat(value) > 0); break;
      case 'positive-length': valid = length.test(value) && Number.isFinite(parseFloat(value)) && parseFloat(value) > 0; break;
      case 'time': valid = time.test(value) && Number.isFinite(parseFloat(value)); break;
      case 'easing': valid = easing(value); break;
      default: {
        const number = Number(value); valid = scalar.test(value) && Number.isFinite(number);
        if (field.type === 'positive') valid &&= number > 0;
        if (field.type === 'ratio') valid &&= number >= 1;
        if (field.type === 'fraction') valid &&= number >= 0 && number <= 1;
        if (field.type === 'weight') valid &&= number >= 1 && number <= 1000;
      }
    }
    if (field.id === 'text-size' && valid && !value.endsWith('px')) throw new Error('Base text size: enter a px value for the document root.');
    if (!valid) throw new Error(`${field.label}: enter a valid ${field.type.replaceAll('-', ' ')} value.`);
    if (Object.hasOwn(bounds, field.id)) {
      const number = boundedNumber(field, value), [min, max] = bounds[field.id];
      if (number !== undefined && (number < min || number > max)) throw new Error(`${field.label}: choose a value between ${min} and ${max}${field.type.includes('length') ? 'px (or equivalent)' : field.type === 'time' ? 'ms' : ''}.`);
    }
  }
  if (input.presets !== undefined && (!input.presets || typeof input.presets !== 'object' || Array.isArray(input.presets) || Object.entries(input.presets).some(([family, id]) => !Object.hasOwn(refinementPresets(family) ?? {}, id)))) throw new Error('Unknown refinement preset.');
  if (input.fonts !== undefined && (!input.fonts || typeof input.fonts !== 'object' || Array.isArray(input.fonts) || Object.entries(input.fonts).some(([key, family]) => !['body-font', 'display-font'].includes(key) || !Object.hasOwn(googleFonts, family) || values[key] !== googleFontStack(family)))) throw new Error('Choose a Google font with its matching font stack.');
  const inheritedFonts = Object.fromEntries(Object.entries(defaults.fonts ?? {}).filter(([role]) => !Object.hasOwn(input.values, role)));
  const fonts = { ...inheritedFonts, ...input.fonts };
  if (input.origin !== undefined && !Object.hasOwn(startingPoints, input.origin)) throw new Error('Unknown theme origin.');
  return { schemaVersion: 1, values, ...(input.fonts === undefined && !Object.keys(fonts).length ? {} : { fonts }), ...(input.origin === undefined ? {} : { origin: input.origin }), ...(input.presets === undefined ? {} : { presets: { ...input.presets } }) };
}

/** Match presets by their complete semantic recipe, including locally saved themes. */
export function startingPointFor(input) {
  const recipe = JSON.stringify(validateRecipe(input).values);
  return Object.entries(startingPoints).find(([, value]) => JSON.stringify(value.values) === recipe)?.[0] ?? 'custom';
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const channelLuminance = channels => channels.map(n => { const s = n / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
const luminance = hex => channelLuminance(rgb(hex));
const alphaSurface = (fill, background, alpha) => {
  const a = rgb(fill), b = rgb(background);
  return '#' + a.map((n, i) => Math.round(n * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('');
};
const luminanceContrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
const contrast = (a, b) => luminanceContrast(luminance(a), luminance(b));
// Bound both material stops for opaque ink. The shade scales each sRGB channel
// down, so the darkest mixtures lie on its segment with the reflected light.
function materialLuminances(start, end) {
  const a = rgb(start), b = rgb(end);
  const at = t => channelLuminance(a.map((n, i) => n + (b[i] - n) * t));
  let low = 0, high = 1;
  for (let step = 0; step < 24; step++) {
    const left = (2 * low + high) / 3, right = (low + 2 * high) / 3;
    if (at(left) < at(right)) high = right; else low = left;
  }
  return [Math.min(at(0), at(1), at((low + high) / 2)), Math.max(at(0), at(1))];
}
function materialContrast(start, end, ink) {
  const [minimum, maximum] = materialLuminances(start, end);
  return ink < minimum ? luminanceContrast(minimum, ink) : ink > maximum ? luminanceContrast(maximum, ink) : 1;
}
function materialColours(fill, text, light, minimum = 4.55, minimumRange = 0) {
  const labels = (Array.isArray(text) ? text : [text]).map(label => typeof label === 'number' ? label : luminance(label));
  const [l, c, h] = toLch(fill), [lightness] = toLch(light);
  // Recede perceptually while retaining relative saturation and hue. Scaling
  // L and C together scales linear RGB, keeping every shade channel <= fill.
  const response = 1 - .75 * l;
  let depth = .05 * response;
  const shaded = amount => amount === 0 ? fill : fromLch([Math.max(0, l - amount), c * Math.max(0, l - amount) / (l || 1), h]);
  while (depth > 0 && labels.some(label => luminanceContrast(luminance(shaded(depth)), label) < minimum)) depth = Math.max(0, depth - .001);
  let shade = shaded(depth);
  // Lift chroma with lightness, plus a small pigment-dependent saturation boost,
  // so the broad reflection stays colored instead of becoming a white wash.
  const [, tintChroma, tintHue] = toLch(mix(light, fill, .18));
  const reflectedLightness = l + (lightness - l) * .32 * response;
  const reflectedChroma = c * Math.max(1, reflectedLightness / (l || 1)) * (1 + .06 * response);
  const target = fromLch([reflectedLightness, Math.max(reflectedChroma, tintChroma), tintHue]);
  let amount = 1;
  const readableReflection = amount => {
    const colour = mix(target, fill, amount);
    const [reflectedL, reflectedC] = toLch(colour);
    // Gamut mapping must not dilute saturation as the reflection brightens.
    // Back toward the pigment when needed, allowing for sRGB byte quantization.
    return reflectedC + .002 >= c * Math.max(1, reflectedL / (l || 1))
      && labels.every(label => materialContrast(colour, shade, label) >= minimum);
  };
  while (amount > 0 && !readableReflection(amount)) amount = Math.max(0, amount - .005);
  const reflection = mix(target, fill, amount);
  // Bright saturated pigments have little reflection headroom in sRGB. Keep
  // their material visible through a deeper chromatic shade rather than a
  // white wash, bounded by the label's contrast across the complete gradient.
  while (depth + .002 <= .12 && colourDistance(reflection, shade) < minimumRange * lightness) {
    const candidate = shaded(depth + .002);
    if (labels.some(label => materialContrast(reflection, candidate, label) < minimum)) break;
    depth += .002;
    shade = candidate;
  }
  // A tiny specular peak is allowed to brighten separately from the chromatic
  // body reflection. Keep the same quantization margin as every material stop.
  let glare = .55 * lightness;
  while (glare > 0 && labels.some(label => luminanceContrast(luminance(alphaSurface('#ffffff', reflection, glare)), label) < minimum)) glare = Math.max(0, glare - .005);
  return { reflection, shade, specular: alphaSurface('#ffffff', reflection, glare) };
}
const foreground = (fill, light, dark) => [light, dark, '#ffffff', '#000000'].sort((a, b) => contrast(fill, b) - contrast(fill, a))[0];

/** Find the nearest mixture with a known readable endpoint, including every supplied surface. */
function readableColour(seed, surfaces, minimum, endpoint) {
  if (surfaces.every(surface => contrast(seed, surface) >= minimum)) return seed;
  for (let step = 1; step <= 256; step++) {
    const next = mix(seed, endpoint, 1 - step / 256);
    if (surfaces.every(surface => contrast(next, surface) >= minimum)) return next;
  }
  return endpoint;
}

/** Resolve editable colour seeds into a coordinated set of readable semantic roles. */
// Perceptual distance in Cartesian Oklab, including chroma-only separation.
const colourDistance = (a, b) => {
  const [l1, c1, h1] = toLch(a), [l2, c2, h2] = toLch(b);
  return Math.sqrt((l1 - l2) ** 2 + (c1 - c2) ** 2 + 2 * c1 * c2 * (1 - Math.cos((h1 - h2) * Math.PI / 180)));
};
const surfaceOffset = (surface, ink, distance) => mix(ink, surface, Math.min(1, distance / Math.max(.001, colourDistance(surface, ink))));
const actionBoundary = (fill, surfaces, ink, amplitude) => {
  const distance = Math.min(...surfaces.map(surface => colourDistance(fill, surface)));
  const shortfall = Math.max(0, 1 - distance / amplitude);
  // Blend assistance in continuously. Searching for an exact distance along an
  // ink path can jump when that path initially reduces chroma separation.
  return mix(surfaceOffset(surfaces[1], ink, amplitude), fill, shortfall ** 2);
};

// Adjust semantic ink in lightness before sacrificing its hue or chroma. Mixing
// amber toward black also removes its color, making a readable warning look brown.
function readableTone(seed, surfaces, minimum, endpoint) {
  const [l, c, h] = toLch(seed), end = toLch(endpoint)[0];
  const backgrounds = surfaces.map(surface => typeof surface === 'number' ? surface : luminance(surface));
  for (let step = 0; step <= 256; step++) {
    const next = fromLch([l + (end - l) * step / 256, c, h]);
    if (backgrounds.every(background => luminanceContrast(luminance(next), background) >= minimum)) return next;
  }
  return endpoint;
}

// Preserve pigment rather than mixing it toward black/white. Deep solids need
// a larger lift than pale fills to make hover read with the same visual weight.
function interactionColour(fill, label, distance, direction = toLch(fill)[0] < .5 ? 1 : -1) {
  const [l, c, h] = toLch(fill);
  for (const sign of [direction, -direction]) {
    const next = fromLch([l + sign * distance, c, h]);
    if (contrast(next, label) >= 4.55) return next;
  }
  return readableTone(fill, [label], 4.55, foreground(label, '#ffffff', '#000000'));
}

// Calibrate translucent paint against its plate in Oklab. Raw percentages have
// very different perceptual weights for a dark plum, a bright gold and white ink.
function stateWash(pigment, plate, distance, dark) {
  const [l, c, h] = toLch(pigment), washL = dark ? .65 : .72;
  const wash = fromLch([washL, c * washL / Math.max(.001, l), h]);
  let low = 0, high = 1;
  for (let step = 0; step < 16; step++) {
    const alpha = (low + high) / 2;
    if (colourDistance(alphaSurface(wash, plate, alpha), plate) < distance) low = alpha; else high = alpha;
  }
  return wash + Math.round(high * 255).toString(16).padStart(2, '0');
}
const washSurface = (wash, surface) => alphaSurface(wash, surface, parseInt(wash.slice(7), 16) / 255);

const quietChromaScale = .74;
const paletteCache = new Map();
export function deriveTheme(input, { mode } = {}) {
  if (mode !== undefined && !['light', 'dark'].includes(mode)) throw new Error('Unknown theme color mode.');
  const { values } = validateRecipe(input);
  const tokens = Object.fromEntries(themeFields.filter(field => field.property).map(field => [field.property, values[field.id]]));
  for (const field of themeFields.filter(field => field.type.includes('length') && Object.hasOwn(bounds, field.id))) {
    if (boundedNumber(field, values[field.id]) === undefined) {
      const [min, max] = bounds[field.id]; tokens[field.property] = `clamp(${min}px, ${values[field.id]}, ${max}px)`;
    }
  }
  const cacheKey = JSON.stringify([mode, ...paletteKeys.map(key => values[key]), values['light-color'], values.translucency, values.finish, values['light-strength']]);
  if (paletteCache.has(cacheKey)) {
    const cached = paletteCache.get(cacheKey);
    return { tokens: { ...tokens, ...cached.tokens }, adjustments: cached.adjustments.map(item => ({ ...item })) };
  }
  const geometry = new Set(Object.keys(tokens));
  const seeds = paletteSeeds(values);
  const adjustments = [];
  const nativeInk = foreground(seeds.canvas, '#ffffff', '#000000');
  const ink = mode === 'light' ? '#000000' : mode === 'dark' ? '#ffffff' : nativeInk;
  const paper = ink === '#000000' ? '#ffffff' : '#000000';
  // Preserve the requested palette in its native mode. The companion keeps a restrained
  // tint of the same surface seeds; contrast resolution below governs all usable roles.
  const surface = seed => readableColour(nativeInk === ink ? seed : companionSurface(seed, mode ?? (ink === '#000000' ? 'light' : 'dark')), [ink], 7, paper);
  tokens['--ui-surface'] = surface(seeds.canvas);
  tokens['--ui-surface-raised'] = surface(seeds.surface);
  const dark = ink === '#ffffff';
  if (dark) {
    // Dark plates need a positive elevation step; independently flipping near-white
    // seeds otherwise collapses both canvas and content to almost the same black.
    const [canvasL, canvasC, canvasH] = toLch(tokens['--ui-surface']);
    tokens['--ui-surface'] = fromLch([Math.min(canvasL, .38), canvasC, canvasH]);
    const [raisedL, raisedC, raisedH] = toLch(tokens['--ui-surface-raised']);
    tokens['--ui-surface-raised'] = readableColour(fromLch([Math.max(raisedL, Math.min(canvasL, .38) + .08), raisedC, raisedH]), [ink], 7, paper);
    tokens['--ui-surface-sunken'] = fromLch([Math.max(0, Math.min(canvasL, .38) - .035), canvasC, canvasH]);
  } else tokens['--ui-surface-sunken'] = surface(mix(tokens['--ui-surface-raised'], tokens['--ui-surface'], .92));
  const surfaces = ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken'].map(name => tokens[name]);
  const accents = { primary: seeds.action, secondary: seeds['secondary-action'], tertiary: seeds['tertiary-action'] };
  const tones = { accent: accents.primary, 'accent-secondary': accents.secondary, 'accent-tertiary': accents.tertiary };
  const brandChroma = Math.min(.20, Math.max(.08, toLch(accents.primary)[1]));
  for (const role of Object.keys(statusSeeds)) {
    const source = values[role + '-source'];
    if (source === 'derived' || source === 'related') {
      let [l, c, h] = toLch(statusSeeds[role]);
      if (source === 'related') {
        const brandHue = toLch(accents.primary)[2];
        const delta = ((brandHue - h + 540) % 360) - 180;
        h += Math.max(-15, Math.min(15, delta));
      }
      // Preserve each semantic anchor's balance; brand pigment bounds its intensity.
      tones[role] = fromLch([l, Math.min(c, brandChroma * .7) * (.5 + Number(values['status-chroma'])) * (.6 + Number(values['color-intensity']) * .8), h]);
    } else tones[role] = accents[source];
  }
  for (const [tone, original] of Object.entries(tones)) {
    const fill = original;
    const onFill = foreground(fill, '#ffffff', '#000000');
    tokens[`--ui-${tone}`] = fill;
    tokens[`--ui-on-${tone}`] = onFill;
    tokens[`--ui-${tone}-on-strong`] = onFill;
    for (const [part, colour] of Object.entries(materialColours(fill, onFill, values['light-color'], 4.55, .1))) tokens[`--ui-${tone}-${part}`] = colour;
    const stateTarget = onFill === '#000000' ? '#ffffff' : '#000000';
    const [fillL, fillC, fillH] = toLch(fill);
    const hoverStep = .035 + .08 * Math.max(0, 1 - fillL / .5);
    tokens[`--ui-${tone}-hover`] = interactionColour(fill, onFill, hoverStep);
    const direction = onFill === '#000000' ? 1 : -1;
    const room = direction > 0 ? 1 - fillL : fillL;
    const activeL = Math.max(0, Math.min(1, fillL + direction * Math.max(.085, room * .26)));
    tokens[`--ui-${tone}-active`] = readableColour(fromLch([activeL, fillC * activeL / (fillL || 1), fillH]), [onFill], 4.55, stateTarget);
    // Move the whole painted plane by the same step. A fixed reflection hides
    // fill changes; multiplying its density exaggerates deep pigments' response.
    const shift = toLch(tokens[`--ui-${tone}-hover`])[0] - toLch(fill)[0];
    for (const part of ['reflection', 'shade']) {
      const [l, c, h] = toLch(tokens[`--ui-${tone}-${part}`]);
      tokens[`--ui-${tone}-hover-${part}`] = readableTone(fromLch([l + shift, c, h]), [onFill], 4.55, stateTarget);
    }
    const contextual = readableColour(fill, surfaces, 4.5, ink);
    const quiet = mix(contextual, tokens['--ui-surface-raised'], .20);
    const [quietL] = toLch(quiet);
    const [, pigmentC, pigmentH] = toLch(fill);
    const plateL = toLch(tokens['--ui-surface-raised'])[0];
    const warmLift = dark ? Math.max(0, 1 - Math.abs(pigmentH - 70) / 35) ** 2 : 0;
    const semantic = Object.hasOwn(statusSeeds, tone) && ['derived', 'related'].includes(values[tone + '-source']);
    const tintScale = semantic ? .25 + 1.5 * Number(values['status-chroma']) : 1;
    const quietC = Math.min(pigmentC, (dark ? .035 + .015 * warmLift : .02) * tintScale) * quietChromaScale;
    const softL = dark ? Math.max(quietL, plateL + .07) + .04 * warmLift : Math.max(.92, plateL - .04);
    tokens[`--ui-${tone}-soft`] = readableColour(fromLch([softL, quietC, pigmentH]), [ink], 4.5, paper);
  }
  const choiceFill = tokens['--ui-accent'], choiceInk = tokens['--ui-on-accent'];
  tokens['--ui-choice-hover-surface'] = interactionColour(choiceFill, choiceInk, .04);
  const choiceShift = toLch(tokens['--ui-choice-hover-surface'])[0] - toLch(choiceFill)[0];
  for (const part of ['reflection', 'shade']) {
    const [l, c, h] = toLch(tokens[`--ui-accent-${part}`]);
    tokens[`--ui-choice-hover-${part}`] = readableTone(fromLch([l + choiceShift, c, h]), [choiceInk], 4.55, foreground(choiceInk, '#ffffff', '#000000'));
  }
  const materialOpacity = Number(values.finish) * Number(values['light-strength']);
  const preliminaryMaterial = materialColours(tokens['--ui-surface-raised'], ink, values['light-color']);
  const washPlate = alphaSurface(mix(preliminaryMaterial.reflection, preliminaryMaterial.shade, .5), tokens['--ui-surface-raised'], materialOpacity);
  for (const tone of Object.keys(tones)) {
    const [l, c, h] = toLch(tokens[`--ui-${tone}`]);
    const quietPigment = fromLch([l, c * quietChromaScale, h]);
    tokens[`--ui-${tone}-wash`] = stateWash(quietPigment, washPlate, .04, dark);
    tokens[`--ui-${tone}-wash-hover`] = stateWash(quietPigment, washPlate, .065, dark);
    tokens[`--ui-${tone}-ghost-hover`] = stateWash(tokens[`--ui-${tone}`], tokens['--ui-surface'], .03, dark);
  }
  tokens['--ui-neutral-wash-hover'] = stateWash(ink, washPlate, .025, dark);
  tokens['--ui-neutral-ghost-hover'] = stateWash(ink, tokens['--ui-surface'], .03, dark);
  const washSurfaces = Object.entries(tokens).filter(([name]) => /-(wash|wash-hover|ghost-hover)$/.test(name))
    .flatMap(([, wash]) => [...surfaces, washPlate].map(surface => washSurface(wash, surface)));
  // Quiet fills are actual alpha composites. At an extreme light/dark flip,
  // reduce their shared tint before it would leave no readable contextual ink.
  const quietSurfaces = strength => [...surfaces, ...washSurfaces, ...surfaces.map(surface => alphaSurface(surface, ink, 1 - .1 * Number(values.translucency))), ...(dark ? [readableColour(mix(ink, tokens['--ui-surface-raised'], .22), [ink], 4.5, paper)] : []), ...Object.keys(tones).map(tone => tokens[`--ui-${tone}-soft`]), ...Object.keys(tones).flatMap(tone => surfaces.flatMap(background => [
    mix(tokens[`--ui-${tone}`], background, .12 * strength),
    ...[.05, .12, .18, .19].map(alpha => alphaSurface(tokens[`--ui-${tone}`], background, alpha * strength)),
  ]))];
  let tonalOpacity = 1;
  while (tonalOpacity > 0 && quietSurfaces(tonalOpacity).some(background => contrast(ink, background) < 4.5)) tonalOpacity = Math.max(0, tonalOpacity - .01);
  tokens['--ui-tonal-opacity'] = String(Number(tonalOpacity.toFixed(2)));
  const readingSurfaces = quietSurfaces(tonalOpacity);
  const borderMinimum = Math.min(4.5, Number(values['neutral-border-contrast']) * (dark ? 1.15 : 1));
  for (const tone of Object.keys(tones)) {
    const [l, c, h] = toLch(tokens[`--ui-${tone}`]);
    const semantic = Object.hasOwn(statusSeeds, tone) && ['derived', 'related'].includes(values[tone + '-source']);
    const foregroundSeed = fromLch([dark ? Math.max(l, .80) : semantic ? l : Math.min(l, .50), Math.min(c, semantic ? .12 : dark ? .16 : .18), h]);
    tokens[`--ui-${tone}-subtle-text`] = (semantic ? readableTone : readableColour)(foregroundSeed, readingSurfaces, 4.5, ink);
  }
  const textSeed = nativeInk === ink ? seeds.text : mix(seeds.text, ink, .08);
  tokens['--ui-text'] = readableColour(textSeed, readingSurfaces, 4.5, ink);
  tokens['--ui-text-secondary'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .72), readingSurfaces, 4.5, ink);
  tokens['--ui-text-muted'] = tokens['--ui-text-secondary'];
  // Colored action edges keep a boundary when their pigment approaches a surface.
  // Neutral controls use their own shared contrast decision below.
  const separation = Math.min(...surfaces.map(surface => colourDistance(tokens['--ui-accent'], surface)));
  const amplitude = .10 + .16 * separation / (separation + .20);
  for (const tone of Object.keys(tones)) for (const state of ['', '-hover', '-active']) {
    tokens[`--ui-${tone}${state}-border`] = actionBoundary(tokens[`--ui-${tone}${state}`], surfaces, ink, amplitude);
  }
  // Neutral pigment governs fills; a shared contrast floor governs every neutral
  // control boundary independently of how close the brand pigment is to its canvas.
  const neutralSource = values['neutral-source'];
  const [, neutralC, neutralH] = toLch(neutralSource === 'text' || neutralSource === 'gray' ? tokens['--ui-text'] : accents[neutralSource]);
  const neutral = fromLch([toLch(tokens['--ui-text'])[0], neutralSource === 'gray' ? 0 : Math.min(.04, neutralC), neutralH]);
  const fillAmount = .02 + Number(values['neutral-strength']) * .16;
  for (const [state, amount] of [['surface', fillAmount], ['active', fillAmount + .08]]) {
    const tinted = mix(neutral, tokens['--ui-surface-raised'], amount * (dark ? 2.25 : 1));
    const [l, c, h] = toLch(tinted);
    const fill = dark ? fromLch([Math.max(l, toLch(tokens['--ui-surface-raised'])[0] + amount * 1.5), c, h]) : tinted;
    tokens[`--ui-neutral-${state}`] = readableColour(fill, [tokens['--ui-text']], 4.5, paper);
  }
  tokens['--ui-neutral-hover'] = interactionColour(tokens['--ui-neutral-surface'], tokens['--ui-text'], .035, dark ? 1 : -1);
  const borderSurfaces = [...surfaces, tokens['--ui-neutral-surface']];
  const engagedSurfaces = [...surfaces, tokens['--ui-neutral-hover'], tokens['--ui-neutral-active']];
  tokens['--ui-control-border'] = readableColour(mix(neutral, tokens['--ui-surface-raised'], .14), borderSurfaces, borderMinimum, ink);
  tokens['--ui-control-border-hover'] = readableColour(tokens['--ui-control-border'], engagedSurfaces, Math.min(4.5, borderMinimum + .4), ink);
  tokens['--ui-border'] = mix(neutral, tokens['--ui-surface-raised'], .10);
  tokens['--ui-border-strong'] = mix(neutral, tokens['--ui-surface-raised'], .18);
  for (const [role, fill, labels] of [
    ['surface', tokens['--ui-surface-raised'], [tokens['--ui-text'], tokens['--ui-text-secondary'], ...Object.keys(tones).map(tone => tokens[`--ui-${tone}-subtle-text`])]],
    ['neutral', tokens['--ui-neutral-surface'], tokens['--ui-text']],
  ]) for (const [part, colour] of Object.entries(materialColours(fill, labels, values['light-color'], 4.55, role === 'neutral' ? .1 : 0))) tokens[`--ui-${role}-${part}`] = colour;
  const neutralShift = toLch(tokens['--ui-neutral-hover'])[0] - toLch(tokens['--ui-neutral-surface'])[0];
  for (const part of ['reflection', 'shade']) {
    const [l, c, h] = toLch(tokens[`--ui-neutral-${part}`]);
    tokens[`--ui-neutral-hover-${part}`] = readableTone(fromLch([l + neutralShift, c, h]), [tokens['--ui-text']], 4.55, paper);
  }
  // Borders surround the finished paint, including its translucent wash and
  // material gradient. Text readability has its own independent contrast floor.
  for (const tone of Object.keys(tones)) {
    const pigment = tokens[`--ui-${tone}`];
    const backgrounds = surfaces.flatMap(surface => {
      const reflection = alphaSurface(tokens['--ui-surface-reflection'], surface, materialOpacity);
      const shade = alphaSurface(tokens['--ui-surface-shade'], surface, materialOpacity);
      return [surface, ...materialLuminances(reflection, shade),
        ...['wash', 'wash-hover', 'ghost-hover'].flatMap(state => materialLuminances(washSurface(tokens[`--ui-${tone}-${state}`], reflection), washSurface(tokens[`--ui-${tone}-${state}`], shade))),
        ...[.08, .12].flatMap(alpha => materialLuminances(alphaSurface(pigment, reflection, alpha * tonalOpacity), alphaSurface(pigment, shade, alpha * tonalOpacity))),
        ...[.08, .12, .18].map(alpha => alphaSurface(pigment, surface, alpha * tonalOpacity))];
    });
    tokens[`--ui-${tone}-outline-border`] = readableTone(pigment, backgrounds, borderMinimum, ink);
    tokens[`--ui-${tone}-subtle-text`] = readableTone(tokens[`--ui-${tone}-subtle-text`], [...readingSurfaces, ...backgrounds], 4.5, ink);
    tokens[`--ui-${tone}-soft-border`] = alphaSurface(tokens[`--ui-${tone}-subtle-text`], tokens[`--ui-${tone}-soft`], .25);
  }
  // Existing validation/editor hooks must receive a contextual text role, never
  // a pressed fill. Preserve consumer overrides at their established boundaries.
  tokens['--ui-field-danger'] = tokens['--ui-danger-subtle-text'];
  for (const hook of ['code-keyword', 'link-color', 'toolbar-active-text', 'mention-color']) tokens[`--ui-editor-${hook}`] = tokens['--ui-accent-subtle-text'];
  // Knobs are painted foreground surfaces, not text. Bound them against the
  // continuous track luminance range, not just its colored endpoints (3:1).
  for (const [role, fill, track, trackFill] of [
    ['knob', tokens['--ui-text-secondary'], 'surface', tokens['--ui-surface-raised']],
    ['knob-on-accent', tokens['--ui-on-accent'], 'accent', tokens['--ui-accent']],
  ]) {
    const [low, high] = materialLuminances(tokens[`--ui-${track}-reflection`], tokens[`--ui-${track}-shade`]);
    const range = [Math.min(low, luminance(trackFill)), Math.max(high, luminance(trackFill), luminance(tokens[`--ui-${track}-specular`]))];
    for (const [part, colour] of Object.entries(materialColours(fill, range, values['light-color'], 3.05))) tokens[`--ui-${role}-${part}`] = colour;
  }
  const selection = values['selection-accent'] === 'primary' ? 'accent' : 'accent-' + values['selection-accent'];
  const link = values['link-accent'] === 'primary' ? 'accent' : 'accent-' + values['link-accent'];
  tokens['--ui-link-color'] = tokens[`--ui-${link}-subtle-text`];
  tokens['--ui-editor-link-color'] = tokens['--ui-link-color'];
  // Contextual pigment keeps even deep brand colors visible over a dark plate.
  const selectionPigment = tokens[`--ui-${selection}${dark ? '-subtle-text' : ''}`];
  tokens['--ui-selection-surface'] = readableColour(mix(selectionPigment, tokens['--ui-surface-raised'], dark ? .22 : .1), [ink], dark ? 7 : 4.5, paper);
  tokens['--ui-selection-text'] = readableColour(tokens[`--ui-${selection}-subtle-text`], [...surfaces, tokens['--ui-selection-surface']], dark ? 7 : 4.5, ink);
  tokens['--ui-selection-border'] = mix(selectionPigment, tokens['--ui-surface-raised'], dark ? .44 : .2);
  tokens['--ui-control-surface'] = tokens['--ui-surface-raised'];
  // A hint is quieter than body copy; resolve it against its field, not every tinted content surface.
  tokens['--ui-control-placeholder'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-control-surface'], .5), [tokens['--ui-control-surface']], 4.5, ink);
  tokens['--ui-disabled-text'] = mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .45);
  tokens['--ui-disabled-surface'] = tokens['--ui-surface-sunken'];
  tokens['--ui-disabled-border'] = mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .2);
  tokens['--ui-focus-ring'] = readableColour(accents[values['focus-accent']], readingSurfaces, 3, ink);
  tokens['--ui-focus-width'] = 'max(2px, calc(var(--ui-border-width) * 2))';
  tokens['color-scheme'] = ink === '#000000' ? 'light' : 'dark';
  for (const [id, property] of [['canvas', '--ui-surface'], ['surface', '--ui-surface-raised'], ['text', '--ui-text']]) {
    if (tokens[property].toLowerCase() !== values[id].toLowerCase()) adjustments.push({ id, requested: values[id], resolved: tokens[property], reason: 'Adjusted to keep the shared palette readable.' });
  }
  const colors = Object.fromEntries(Object.entries(tokens).filter(([key]) => !geometry.has(key) || /^#[\da-f]{6}$/i.test(tokens[key])));
  paletteCache.set(cacheKey, { tokens: colors, adjustments });
  if (paletteCache.size > 16) paletteCache.delete(paletteCache.keys().next().value);
  return { tokens, adjustments: adjustments.map(item => ({ ...item })) };
}

/** Shared public seeds; combine with theme-system.css for a standalone exported theme. */
export function themeCSS(input, systemCSS = '', { scope = 'portable' } = {}) {
  if (!['portable', 'documentation'].includes(scope)) throw new Error('Unknown theme scope.');
  // The early documentation stylesheet wins over the baseline loaded later without !important.
  const selector = scope === 'documentation'
    ? ':root[data-looma-documentation-theme], :root[data-looma-documentation-theme] [data-theme], :root[data-looma-documentation-theme] [data-contrast]'
    : ':root, [data-theme], [data-contrast]';
  const recipe = validateRecipe(input);
  const fontURL = googleFontURL(recipe.fonts);
  const imports = fontURL ? `@import url("${fontURL}");\n` : '';
  const light = deriveTheme(input, { mode: 'light' }).tokens;
  const dark = deriveTheme(input, { mode: 'dark' }).tokens;
  const palette = [], geometry = [];
  const relativeLengths = new Map(themeFields.filter(field => field.property && field.type.includes('length') && recipe.values[field.id].endsWith('rem')).map(field => [field.property, recipe.values[field.id]]));
  for (const [name, value] of Object.entries(light)) {
    if (name === 'color-scheme') continue;
    if (/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)) palette.push(`  ${name}: light-dark(${value}, ${dark[name]});`);
    else {
      const relative = relativeLengths.get(name);
      const resolved = name === '--ui-tonal-opacity' ? Math.min(Number(value), Number(dark[name])) : relative ? value.replace(relative, `calc(${parseFloat(relative)} * var(--_ui-root-font-unit, 1rem))`) : value;
      geometry.push(`  ${name}: ${resolved};`);
    }
  }
  const geometrySelector = scope === 'documentation' ? ':root[data-looma-documentation-theme]' : ':root';
  const chevron = color => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color.replace('#', '%23')}' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;
  const boundary = mode => scope === 'documentation'
    ? `:root[data-looma-documentation-theme][data-theme="${mode}"], :root[data-looma-documentation-theme] [data-theme="${mode}"]`
    : `[data-theme="${mode}"]`;
  const chevrons = `${geometrySelector} { --ui-select-chevron: ${chevron(light['--ui-text-secondary'])}; }\n@media (prefers-color-scheme: dark) { ${geometrySelector}:not([data-theme]) { --ui-select-chevron: ${chevron(dark['--ui-text-secondary'])}; } }\n${boundary('light')} { --ui-select-chevron: ${chevron(light['--ui-text-secondary'])}; }\n${boundary('dark')} { --ui-select-chevron: ${chevron(dark['--ui-text-secondary'])}; }`;

  // Resolve colors at their point of use, so a nearer mode boundary wins independently
  // of the selector specificity needed to restore an early documentation theme.
  // Keep the first comment stable: the local writer recognizes its generated files by this marker.
  return `/* Looma shared semantic theme. */\n/* Always includes light and dark.\n   Set data-theme="light" or "dark" on any element to fix that subtree's mode.\n   Leave the root attribute unset to follow the system; a switch can set/remove it. */\n${imports}${systemCSS}\n${geometrySelector} {\n${geometry.join('\n')}\n}\n${selector} {\n${palette.join('\n')}\n}\n${chevrons}\n:root:not([data-theme]) { color-scheme: light dark; }\n[data-theme="light"] { color-scheme: light; }\n[data-theme="dark"] { color-scheme: dark; }\n@media (prefers-reduced-motion: reduce) {\n  ${selector} { --ui-motion-fast: 0ms; --ui-motion-base: 0ms; --ui-motion-press: 0ms; --ui-press-scale: 1; }\n}\n@media (prefers-reduced-transparency: reduce), (forced-colors: active) {\n  ${selector} { --ui-finish: 0; --ui-glow: 0; }\n}\n`;
}
