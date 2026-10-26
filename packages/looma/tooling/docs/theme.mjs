import { googleFonts, googleFontStack, googleFontURL } from './fonts.mjs';
import { mixColour as mix, paletteSeeds, companionSurface, toLch, fromLch } from './palette.mjs';

const bounds = {
  'text-size': [14, 24], 'control-roominess': [2, 4], 'corner-roundness': [0, 32],
  'line-weight': [.5, 3], rhythm: [.75, 1.5], spacing: [.75, 1.5], 'scale-contrast': [1, 1.5],
  'space-curve': [.5, 2], 'text-weight': [400, 700], 'outer-depth': [0, 2], 'inner-depth': [0, 2],
  'response-time': [0, 600],
};

/** The shared authoring schema; ids remain stable in saved recipes. */
export const themeFields = [
  ['Colour', 'action', 'Action', '--ui-accent', 'colour', '#5b55d6', 'Primary fill; readable labels and contextual action text are derived separately.'],
  ['Colour', 'canvas', 'Canvas', '--ui-surface', 'colour', '#f6f6f8', 'The ground behind surfaces.'],
  ['Colour', 'surface', 'Surface', '--ui-surface-raised', 'colour', '#ffffff', 'Fields, cards and floating surfaces.'],
  ['Colour', 'text', 'Text', '--ui-text', 'colour', '#1a1a1a', 'Readable content; supporting text follows this and Surface.'],
  ['Colour', 'warmth', 'Surface warmth', null, 'fraction', '0.5', '0% cool, 50% original, 100% warm paper and ink; your brand hue stays independent.'],
  ['Colour', 'color-intensity', 'Color intensity', null, 'fraction', '0.5', '0% quiet, 50% original, 100% vivid, coordinated across surfaces, actions and status colors.'],
  ['Colour', 'palette-relationship', 'Palette relationship', null, 'choice', 'preserve', 'Keep base hues, or relate quiet surfaces to the brand through neighboring or complementary hues.'],
  ['Type', 'body-font', 'Font', '--ui-font-sans', 'font', 'system-ui, sans-serif', 'The shared interface typeface.'],
  ['Type', 'display-font', 'Heading font', '--ui-font-display', 'font', 'system-ui, sans-serif', 'The heading typeface.'],
  ['Type', 'text-size', 'Base text size', '--ui-font-size', 'positive-length', '16px', 'Sets the document root in px. Type, spacing and layout use rem relationships and scale from this base once.'],
  ['Type', 'text-weight', 'Emphasis weight', '--ui-font-medium', 'weight', '500', 'Control-label emphasis; body and headings keep their roles.'],
  ['Size & spacing', 'control-roominess', 'Control roominess', '--ui-control-roominess', 'positive', '2.5', 'Shared control height as a multiple of base text size; buttons, fields and swatches stay aligned.'],
  ['Size & spacing', 'rhythm', 'Rhythm', '--ui-rhythm', 'positive', '1', 'More or less breathing room between lines and groups. Spacing fine-tunes gaps independently.'],
  ['Size & spacing', 'spacing', 'Spacing', '--ui-spacing', 'positive', '1', 'More or less breathing room throughout the interface.'],
  ['Size & spacing', 'scale-contrast', 'Size ratio', '--ui-scale-ratio', 'ratio', '1.2', 'The multiplier between small, medium and large controls. At 1 the sizes are equal; higher values separate them.'],
  ['Size & spacing', 'space-curve', 'Spacing curve', '--ui-space-curve', 'nonnegative', '1', 'Spacing growth: 1 is linear, 2 is quadratic. Independent of control sizes.'],
  ['Size & spacing', 'corner-roundness', 'Corner roundness', '--ui-radius-md', 'length', '8px', 'One corner family across controls and surfaces.'],
  ['Size & spacing', 'line-weight', 'Line weight', '--ui-border-width', 'length', '1px', 'Shared edge weight; focus stays independently visible.'],
  ['Material', 'outer-depth', 'Outer depth', '--ui-outer-depth', 'nonnegative', '0.6', 'How strongly controls and floating surfaces rise above the page.'],
  ['Material', 'inner-depth', 'Inner depth', '--ui-inner-depth', 'nonnegative', '0.3', 'How strongly fields and pressed controls sit into their surface.'],
  ['Material', 'glassiness', 'Frosting', '--ui-glassiness', 'fraction', '0', 'Backdrop blur on decorative glass, from none to frosted. Content remains opaque.'],
  ['Material', 'surface-separation', 'Surface separation', '--ui-surface-separation', 'fraction', '0', 'One material offset, scaled by popup purpose and actual size: quiet tooltips through substantial dialogs.'],
  ['Material', 'translucency', 'Transparency', '--ui-overlay-translucency', 'fraction', '0', 'How much of the scene comes through decorative glass rims, from opaque to clear. Content remains opaque.'],
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
].map(([family, id, label, property, type, defaultValue, description]) => Object.freeze({ family, id, label, property, type, defaultValue, description, ...(type === 'choice' ? { choices: { preserve: 'Preserve seed hues', neighboring: 'Neighboring hues', complementary: 'Complementary hues' } } : {}), ...(bounds[id] ? { min: bounds[id][0], max: bounds[id][1] } : type === 'fraction' ? { min: 0, max: 1 } : {}) }));

const baseRecipe = () => ({ schemaVersion: 1, values: Object.fromEntries(themeFields.map(field => [field.id, field.defaultValue])) });
const starting = values => ({ schemaVersion: 1, values: { ...baseRecipe().values, ...values } });
/** The documentation starts with Looma's coordinated identity; Clear keeps the neutral baseline. */
export const defaultRecipe = () => ({ ...starting({ action: '#7658d6', canvas: '#fbf9f4', surface: '#fffdf8', text: '#2b2538', 'body-font': googleFontStack('Manrope'), 'display-font': googleFontStack('Manrope'), 'text-size': '17px' }), fonts: { 'body-font': 'Manrope', 'display-font': 'Manrope' } });
export const startingPoints = {
  looma: defaultRecipe(),
  clear: baseRecipe(),
  gold: { ...starting({ action: '#ffb84d', canvas: '#ffffff', surface: '#ffffff', text: '#171717', 'body-font': googleFontStack('Lato'), 'display-font': googleFontStack('Fraunces'), 'text-size': '17px', 'corner-roundness': '16px', finish: '0.55', 'light-x': '0' }), fonts: { 'body-font': 'Lato', 'display-font': 'Fraunces' } },
  bookish: starting({ rhythm: '1.05', action: '#2e1228', canvas: '#f7f7f5', surface: '#fffefd', text: '#0d0c0c', 'body-font': 'Arial, sans-serif', 'display-font': 'Georgia, serif', 'text-weight': '400', 'control-roominess': '2.625', 'scale-contrast': '1.18', 'outer-depth': '1', 'inner-depth': '1', glassiness: '0.8', 'surface-separation': '0.65', translucency: '0.18', 'edge-light': '1', finish: '0.85', glow: '0.3', 'light-spread': '0.3', 'light-strength': '0.9', 'response-time': '150ms', 'response-curve': 'ease' }),
  wiki: starting({ rhythm: '0.95', 'text-weight': '400', 'space-curve': '0.8', action: '#4f46e5', canvas: '#ffffff', surface: '#ffffff', text: '#1a1a1a', 'control-roominess': '2.125', spacing: '0.95', 'scale-contrast': '1.15', 'corner-roundness': '6px', 'outer-depth': '0.35', 'inner-depth': '0', 'response-time': '110ms' }),
  editorial: starting({ rhythm: '1.3', 'text-size': '17px', spacing: '1.12', 'space-curve': '1.4', 'scale-contrast': '1.3', action: '#182c24', canvas: '#eee9dc', surface: '#fffdf5', text: '#182c24', 'corner-roundness': '0px', 'outer-depth': '0', 'inner-depth': '0', 'body-font': 'Georgia, serif', 'display-font': 'Georgia, serif', 'text-weight': '400', 'line-weight': '2px', 'response-time': '90ms', 'response-curve': 'linear' }),
  night: starting({ rhythm: '1.05', 'display-font': 'ui-monospace, monospace', 'text-weight': '500', 'control-roominess': '2.375', spacing: '1.05', 'scale-contrast': '1.25', 'space-curve': '1', finish: '0.6', glow: '0.45', glassiness: '0.45', 'surface-separation': '0.25', 'light-x': '0.25', 'light-spread': '0.65', action: '#a7b8ff', canvas: '#11141c', surface: '#202634', text: '#edf1fb', 'corner-roundness': '12px', 'outer-depth': '1.4', 'inner-depth': '0.45', translucency: '0.2', 'edge-light': '0.65', 'response-time': '210ms', 'response-curve': 'cubic-bezier(0.2,0.8,0.2,1)' }),
  garden: starting({ rhythm: '1.2', 'body-font': 'ui-rounded, system-ui, sans-serif', 'display-font': 'Georgia, serif', 'text-weight': '400', 'space-curve': '1.15', finish: '0.15', 'light-spread': '1', action: '#256342', canvas: '#f4edda', surface: '#fff8e7', text: '#173121', 'corner-roundness': '22px', 'outer-depth': '0.35', 'inner-depth': '0', 'edge-light': '0.2', 'control-roominess': '2.875', 'scale-contrast': '1.24', spacing: '1.05', 'response-time': '180ms', 'response-curve': 'cubic-bezier(0.16,1,0.3,1)' }),
};
export const startingPointLabels = { looma: 'Looma', clear: 'Clear', gold: 'Gold', bookish: 'Bookish', wiki: 'Wiki', editorial: 'Editorial', night: 'Night', garden: 'Garden' };
const paletteKeys = themeFields.filter(field => field.family === 'Colour').map(field => field.id);
// Palette choices move only the shared color seeds; size, material and motion stay independent.
export const themePalettes = Object.fromEntries([
  ['looma', 'Looma'], ['clear', 'Indigo & mist'], ['gold', 'Gold'], ['bookish', 'Plum & paper'], ['wiki', 'Indigo & chalk'],
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
const refinementPresets = family => family === 'material' ? materialPresets : family === 'palette' ? themePalettes : undefined;

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
      case 'colour': valid = /^#[\da-f]{6}$/i.test(value); break;
      case 'font': valid = font.test(value); break;
      case 'length': valid = length.test(value) && Number.isFinite(parseFloat(value)); break;
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
function materialColours(fill, text, light, minimum = 4.55) {
  const labels = (Array.isArray(text) ? text : [text]).map(label => typeof label === 'number' ? label : luminance(label));
  const [l, c, h] = toLch(fill), [lightness] = toLch(light);
  // Recede perceptually while retaining relative saturation and hue. Scaling
  // L and C together scales linear RGB, keeping every shade channel <= fill.
  let depth = .05;
  const shaded = amount => amount === 0 ? fill : fromLch([Math.max(0, l - amount), c * Math.max(0, l - amount) / (l || 1), h]);
  while (depth > 0 && labels.some(label => luminanceContrast(luminance(shaded(depth)), label) < minimum)) depth = Math.max(0, depth - .001);
  const shade = shaded(depth);
  // Environment influences reflected hue, not the pigment's saturation. Neutral
  // light lifts lightness without the broad white mixture that washes colour out.
  const [, tintChroma, tintHue] = toLch(mix(light, fill, .18));
  const target = fromLch([l + (lightness - l) * .16, Math.max(c * .95, tintChroma), tintHue]);
  let amount = 1;
  while (amount > 0 && labels.some(label => materialContrast(mix(target, fill, amount), shade, label) < minimum)) amount = Math.max(0, amount - .005);
  const reflection = mix(target, fill, amount);
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
  const cacheKey = JSON.stringify([mode, ...paletteKeys.map(key => values[key]), values['light-color']]);
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
  tokens['--ui-surface-sunken'] = surface(mix(tokens['--ui-surface-raised'], tokens['--ui-surface'], .92));
  const surfaces = ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken'].map(name => tokens[name]);
  const tones = { accent: seeds.action, danger: '#c92d1e', success: '#007a33', warning: '#ba5b0b', info: '#0066cc' };
  for (const [tone, original] of Object.entries(tones)) {
    const [l, c, h] = toLch(original);
    const seed = tone === 'accent' ? original : fromLch([l, c * (.6 + Number(values['color-intensity']) * .8), h]);
    const fill = seed;
    const onFill = foreground(fill, '#ffffff', '#000000');
    tokens[`--ui-${tone}`] = fill;
    tokens[`--ui-on-${tone}`] = onFill;
    tokens[`--ui-${tone}-on-strong`] = onFill;
    for (const [part, colour] of Object.entries(materialColours(fill, onFill, values['light-color']))) tokens[`--ui-${tone}-${part}`] = colour;
    const stateTarget = onFill === '#000000' ? '#ffffff' : '#000000';
    tokens[`--ui-${tone}-hover`] = mix(fill, stateTarget, .86);
    tokens[`--ui-${tone}-active`] = mix(fill, stateTarget, .74);
    tokens[`--ui-${tone}-soft`] = mix(fill, tokens['--ui-surface-raised'], .08);
  }
  // Quiet fills are actual alpha composites. At an extreme light/dark flip,
  // reduce their shared tint before it would leave no readable contextual ink.
  const quietSurfaces = strength => [...surfaces, ...Object.keys(tones).flatMap(tone => surfaces.flatMap(background => [
    mix(tokens[`--ui-${tone}`], background, .12 * strength),
    ...[.05, .12, .18].map(alpha => alphaSurface(tokens[`--ui-${tone}`], background, alpha * strength)),
  ]))];
  let tonalOpacity = 1;
  while (tonalOpacity > 0 && quietSurfaces(tonalOpacity).some(background => contrast(ink, background) < 4.5)) tonalOpacity = Math.max(0, tonalOpacity - .01);
  tokens['--ui-tonal-opacity'] = String(Number(tonalOpacity.toFixed(2)));
  const readingSurfaces = quietSurfaces(tonalOpacity);
  for (const tone of Object.keys(tones)) {
    tokens[`--ui-${tone}-subtle-text`] = readableColour(tokens[`--ui-${tone}`], readingSurfaces, 4.5, ink);
  }
  // Existing validation/editor hooks must receive a contextual text role, never
  // a pressed fill. Preserve consumer overrides at their established boundaries.
  tokens['--ui-field-danger'] = tokens['--ui-danger-subtle-text'];
  for (const hook of ['code-keyword', 'link-color', 'toolbar-active-text', 'mention-color']) tokens[`--ui-editor-${hook}`] = tokens['--ui-accent-subtle-text'];
  const textSeed = nativeInk === ink ? seeds.text : mix(seeds.text, ink, .08);
  tokens['--ui-text'] = readableColour(textSeed, readingSurfaces, 4.5, ink);
  tokens['--ui-text-secondary'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .72), readingSurfaces, 4.5, ink);
  tokens['--ui-text-muted'] = tokens['--ui-text-secondary'];
  // One continuous action-family range: primary pigment determines the neutral
  // companion and their boundaries. These are design calibration values, not an
  // empirical attention score. A floor preserves near-surface action boundaries.
  const separation = Math.min(...surfaces.map(surface => colourDistance(tokens['--ui-accent'], surface)));
  const amplitude = .10 + .16 * separation / (separation + .20);
  for (const tone of Object.keys(tones)) for (const state of ['', '-hover', '-active']) {
    tokens[`--ui-${tone}${state}-border`] = actionBoundary(tokens[`--ui-${tone}${state}`], surfaces, ink, amplitude);
  }
  // Keep secondary contours quieter than the weakest resolved primary edge,
  // including warm surfaces where an assisted edge can approach its backdrop.
  const familyRange = Math.min(amplitude, ...['', '-hover', '-active'].flatMap(state => surfaces.map(surface =>
    colourDistance(tokens[`--ui-accent${state}-border`], surface),
  )));
  for (const [state, fillScale, edgeScale] of [['surface', .25, .45], ['hover', .35, .55], ['active', .45, .65]]) {
    tokens[`--ui-neutral-${state}`] = readableColour(surfaceOffset(tokens['--ui-surface-raised'], tokens['--ui-text'], familyRange * fillScale), [tokens['--ui-text']], 4.5, paper);
    tokens[`--ui-neutral-${state === 'surface' ? '' : state + '-'}border`] = surfaceOffset(tokens['--ui-surface-raised'], tokens['--ui-text'], familyRange * edgeScale);
  }
  // Enclosure lines describe regions; native field affordances retain their
  // independently resolved control border below.
  tokens['--ui-border'] = surfaceOffset(tokens['--ui-surface-raised'], tokens['--ui-text'], familyRange * .20);
  tokens['--ui-border-strong'] = surfaceOffset(tokens['--ui-surface-raised'], tokens['--ui-text'], familyRange * .35);
  for (const [role, fill, labels] of [
    ['surface', tokens['--ui-surface-raised'], [tokens['--ui-text'], tokens['--ui-text-secondary'], ...Object.keys(tones).map(tone => tokens[`--ui-${tone}-subtle-text`])]],
    ['neutral', tokens['--ui-neutral-surface'], tokens['--ui-text']],
  ]) for (const [part, colour] of Object.entries(materialColours(fill, labels, values['light-color']))) tokens[`--ui-${role}-${part}`] = colour;
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
  tokens['--ui-selection-surface'] = mix(tokens['--ui-accent'], tokens['--ui-surface-raised'], .1);
  tokens['--ui-selection-text'] = tokens['--ui-accent-subtle-text'];
  tokens['--ui-selection-border'] = mix(tokens['--ui-accent'], tokens['--ui-surface-raised'], .2);
  tokens['--ui-control-surface'] = tokens['--ui-surface-raised'];
  // A hint is quieter than body copy; resolve it against its field, not every tinted content surface.
  tokens['--ui-control-placeholder'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-control-surface'], .5), [tokens['--ui-control-surface']], 4.5, ink);
  tokens['--ui-control-border'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .43), readingSurfaces, 3, ink);
  tokens['--ui-control-border-hover'] = tokens['--ui-control-border'];
  tokens['--ui-disabled-text'] = mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .45);
  tokens['--ui-disabled-surface'] = tokens['--ui-surface-sunken'];
  tokens['--ui-disabled-border'] = mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .2);
  tokens['--ui-focus-ring'] = readableColour(tokens['--ui-accent'], readingSurfaces, 3, ink);
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
    if (/^#[\da-f]{6}$/i.test(value)) palette.push(`  ${name}: light-dark(${value}, ${dark[name]});`);
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
