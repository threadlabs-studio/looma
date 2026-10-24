const bounds = {
  'text-size': [14, 24], 'control-size': [32, 64], 'corner-roundness': [0, 32],
  'line-weight': [.5, 3], density: [.75, 1.5], 'scale-contrast': [1, 1.5],
  'space-curve': [.5, 2], 'text-weight': [400, 700], 'outer-depth': [0, 2], 'inner-depth': [0, 2],
  'response-time': [0, 600],
};

/** The shared authoring schema; ids remain stable in saved recipes. */
export const themeFields = [
  ['Colour', 'action', 'Action', '--ui-accent', 'colour', '#5b55d6', 'Primary commands and selected controls.'],
  ['Colour', 'canvas', 'Canvas', '--ui-surface', 'colour', '#f6f6f8', 'The ground behind surfaces.'],
  ['Colour', 'surface', 'Surface', '--ui-surface-raised', 'colour', '#ffffff', 'Fields, cards and floating surfaces.'],
  ['Colour', 'text', 'Text', '--ui-text', 'colour', '#1a1a1a', 'Readable content; supporting text follows this and Surface.'],
  ['Type', 'body-font', 'Body font', '--ui-font-sans', 'font', 'system-ui, sans-serif', 'The shared interface typeface.'],
  ['Type', 'display-font', 'Display font', '--ui-font-display', 'font', 'system-ui, sans-serif', 'The heading typeface.'],
  ['Type', 'text-size', 'Text size', '--ui-font-size', 'positive-length', '16px', 'Base type and choice-mark size. Accepts native CSS lengths, such as 1rem.'],
  ['Type', 'text-weight', 'Emphasis weight', '--ui-font-medium', 'weight', '500', 'Control-label emphasis; body and headings keep their roles.'],
  ['Size & spacing', 'control-size', 'Control size', '--ui-control-size', 'positive-length', '40px', 'One shared height for buttons, fields and swatches.'],
  ['Size & spacing', 'density', 'Density', '--ui-density', 'positive', '1', 'More or less breathing room throughout the interface.'],
  ['Size & spacing', 'scale-contrast', 'Size ratio', '--ui-scale-ratio', 'ratio', '1.2', 'The multiplier between small, medium and large controls.'],
  ['Size & spacing', 'space-curve', 'Spacing curve', '--ui-space-curve', 'nonnegative', '1', 'Spacing growth: 1 is linear, 2 is quadratic. Independent of control sizes.'],
  ['Size & spacing', 'corner-roundness', 'Corner roundness', '--ui-radius-md', 'length', '8px', 'One corner family across controls and surfaces.'],
  ['Size & spacing', 'line-weight', 'Line weight', '--ui-border-width', 'length', '1px', 'Shared edge weight; focus stays independently visible.'],
  ['Material', 'outer-depth', 'Outer depth', '--ui-outer-depth', 'nonnegative', '0.6', 'How strongly controls and floating surfaces rise above the page.'],
  ['Material', 'inner-depth', 'Inner depth', '--ui-inner-depth', 'nonnegative', '0.3', 'How strongly fields and pressed controls sit into their surface.'],
  ['Material', 'glassiness', 'Glassiness', '--ui-glassiness', 'fraction', '0', 'Frosted blur, richer background colour and light-catching glass edges. Content stays readable.'],
  ['Material', 'surface-separation', 'Surface separation', '--ui-surface-separation', 'fraction', '0', 'One material offset, scaled by popup purpose and actual size: quiet tooltips through substantial dialogs.'],
  ['Material', 'translucency', 'Overlay translucency', '--ui-overlay-translucency', 'fraction', '0', 'How much background comes through floating surfaces.'],
  ['Material', 'edge-light', 'Edge light', '--ui-edge-light', 'fraction', '0', 'Light caught by surface edges, independent of depth.'],
  ['Motion', 'response-time', 'Response time', '--ui-motion-fast', 'time', '120ms', 'Shared feedback pace; floating transitions take proportionally longer.'],
  ['Motion', 'response-curve', 'Response curve', '--ui-motion-ease', 'easing', 'cubic-bezier(0.2,0,0.2,1)', 'How movement accelerates and settles.'],
].map(([family, id, label, property, type, defaultValue, description]) => Object.freeze({ family, id, label, property, type, defaultValue, description, ...(bounds[id] ? { min: bounds[id][0], max: bounds[id][1] } : type === 'fraction' ? { min: 0, max: 1 } : {}) }));

export const defaultRecipe = () => ({ schemaVersion: 1, values: Object.fromEntries(themeFields.map(field => [field.id, field.defaultValue])) });
const starting = values => ({ schemaVersion: 1, values: { ...defaultRecipe().values, ...values } });
export const startingPoints = {
  clear: defaultRecipe(),
  bookish: starting({ action: '#2e1228', canvas: '#f7f7f5', surface: '#fffefd', text: '#0d0c0c', 'body-font': 'Arial, sans-serif', 'display-font': 'Georgia, serif', 'text-weight': '400', 'control-size': '42px', 'scale-contrast': '1.18', 'outer-depth': '1', 'inner-depth': '1', glassiness: '0.8', 'surface-separation': '0.65', translucency: '0.18', 'edge-light': '1', 'response-time': '150ms', 'response-curve': 'ease' }),
  wiki: starting({ action: '#4f46e5', canvas: '#ffffff', surface: '#ffffff', text: '#1a1a1a', 'control-size': '34px', density: '0.85', 'scale-contrast': '1.15', 'corner-roundness': '6px', 'outer-depth': '0.35', 'inner-depth': '0', 'response-time': '110ms' }),
  editorial: starting({ action: '#182c24', canvas: '#eee9dc', surface: '#fffdf5', text: '#182c24', 'corner-roundness': '0px', 'outer-depth': '0', 'inner-depth': '0', 'body-font': 'Georgia, serif', 'display-font': 'Georgia, serif', 'text-weight': '400', 'line-weight': '2px', 'response-time': '90ms', 'response-curve': 'linear' }),
  night: starting({ action: '#a7b8ff', canvas: '#11141c', surface: '#202634', text: '#edf1fb', 'corner-roundness': '12px', 'outer-depth': '1.4', 'inner-depth': '0.45', translucency: '0.2', 'edge-light': '0.65', 'response-time': '210ms', 'response-curve': 'cubic-bezier(0.2,0.8,0.2,1)' }),
  garden: starting({ action: '#256342', canvas: '#eef5e7', surface: '#fcfff6', text: '#173121', 'corner-roundness': '22px', 'outer-depth': '0.35', 'inner-depth': '0', 'edge-light': '0.2', 'control-size': '46px', 'scale-contrast': '1.24', density: '1.05', 'response-time': '180ms', 'response-curve': 'cubic-bezier(0.16,1,0.3,1)' }),
};
// Preserve the public historical startingPoints.library import without a duplicate UI preset.
Object.defineProperty(startingPoints, 'library', { value: startingPoints.bookish });
export const startingPointLabels = { clear: 'Clear', bookish: 'Bookish', wiki: 'Wiki', editorial: 'Editorial', night: 'Night', garden: 'Garden' };
const paletteKeys = ['action', 'canvas', 'surface', 'text'];
// Palette choices move only the shared color seeds; size, material and motion stay independent.
export const themePalettes = Object.fromEntries([
  ['clear', 'Indigo & mist'], ['bookish', 'Plum & paper'], ['wiki', 'Indigo & chalk'],
  ['editorial', 'Ink & parchment'], ['night', 'Midnight'], ['garden', 'Forest & cream'],
].map(([id, label]) => [id, { label, values: Object.fromEntries(paletteKeys.map(key => [key, startingPoints[id].values[key]])) }]));

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
  const values = { ...defaultRecipe().values, ...input.values };
  for (const field of themeFields) {
    const value = values[field.id];
    let valid = typeof value === 'string' && value.length > 0;
    if (valid) switch (field.type) {
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
    if (!valid) throw new Error(`${field.label}: enter a valid ${field.type.replaceAll('-', ' ')} value.`);
    if (Object.hasOwn(bounds, field.id)) {
      const number = boundedNumber(field, value), [min, max] = bounds[field.id];
      if (number !== undefined && (number < min || number > max)) throw new Error(`${field.label}: choose a value between ${min} and ${max}${field.type.includes('length') ? 'px (or equivalent)' : field.type === 'time' ? 'ms' : ''}.`);
    }
  }
  return { schemaVersion: 1, values };
}

/** Match presets by their complete semantic recipe, including locally saved themes. */
export function startingPointFor(input) {
  const recipe = JSON.stringify(validateRecipe(input));
  return Object.entries(startingPoints).find(([, value]) => JSON.stringify(value) === recipe)?.[0] ?? 'custom';
}

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, weight) => '#' + rgb(a).map((n, i) => Math.round(n * weight + rgb(b)[i] * (1 - weight)).toString(16).padStart(2, '0')).join('');
const luminance = hex => rgb(hex).map(n => { const s = n / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
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
export function deriveTheme(input, { mode } = {}) {
  if (mode !== undefined && !['light', 'dark'].includes(mode)) throw new Error('Unknown theme color mode.');
  const { values } = validateRecipe(input);
  const tokens = Object.fromEntries(themeFields.map(field => [field.property, values[field.id]]));
  for (const field of themeFields.filter(field => field.type.includes('length') && Object.hasOwn(bounds, field.id))) {
    if (boundedNumber(field, values[field.id]) === undefined) {
      const [min, max] = bounds[field.id]; tokens[field.property] = `clamp(${min}px, ${values[field.id]}, ${max}px)`;
    }
  }
  const adjustments = [];
  const nativeInk = foreground(values.canvas, '#ffffff', '#000000');
  const ink = mode === 'light' ? '#000000' : mode === 'dark' ? '#ffffff' : nativeInk;
  const paper = ink === '#000000' ? '#ffffff' : '#000000';
  // Preserve the requested palette in its native mode. The companion keeps a restrained
  // tint of the same surface seeds; contrast resolution below governs all usable roles.
  const companionSurface = mix(values.text, paper, .8);
  const surface = seed => readableColour(nativeInk === ink ? seed : mix(seed, companionSurface, .02), [ink], 7, paper);
  tokens['--ui-surface'] = surface(values.canvas);
  tokens['--ui-surface-raised'] = surface(values.surface);
  tokens['--ui-surface-sunken'] = surface(mix(tokens['--ui-surface-raised'], tokens['--ui-surface'], .92));
  const surfaces = ['--ui-surface', '--ui-surface-raised', '--ui-surface-sunken'].map(name => tokens[name]);
  const tones = { accent: values.action, danger: '#c92d1e', success: '#007a33', warning: '#ba5b0b', info: '#0066cc' };
  for (const [tone, seed] of Object.entries(tones)) {
    const fill = readableColour(seed, surfaces, 5, ink);
    tokens[`--ui-${tone}`] = fill;
    tokens[`--ui-on-${tone}`] = foreground(fill, '#ffffff', '#000000');
    tokens[`--ui-${tone}-on-strong`] = tokens[`--ui-on-${tone}`];
    tokens[`--ui-${tone}-hover`] = mix(fill, ink, .86);
    tokens[`--ui-${tone}-active`] = mix(fill, ink, .74);
    tokens[`--ui-${tone}-soft`] = mix(fill, tokens['--ui-surface-raised'], .08);
  }
  // Readable roles cover the quiet tinted surfaces as well as the neutral family.
  const readingSurfaces = [...surfaces, ...Object.keys(tones).flatMap(tone => surfaces.map(background => mix(tokens[`--ui-${tone}`], background, .12)))];
  for (const tone of Object.keys(tones)) {
    tokens[`--ui-${tone}-subtle-text`] = readableColour(tokens[`--ui-${tone}`], readingSurfaces, 4.5, ink);
  }
  const textSeed = nativeInk === ink ? values.text : mix(values.text, ink, .08);
  tokens['--ui-text'] = readableColour(textSeed, readingSurfaces, 4.5, ink);
  tokens['--ui-text-secondary'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .72), readingSurfaces, 4.5, ink);
  tokens['--ui-text-muted'] = tokens['--ui-text-secondary'];
  tokens['--ui-selection-surface'] = mix(tokens['--ui-accent'], tokens['--ui-surface-raised'], .1);
  tokens['--ui-selection-text'] = tokens['--ui-accent-subtle-text'];
  tokens['--ui-selection-border'] = mix(tokens['--ui-accent'], tokens['--ui-surface-raised'], .2);
  tokens['--ui-control-surface'] = tokens['--ui-surface-raised'];
  tokens['--ui-control-border'] = readableColour(mix(tokens['--ui-text'], tokens['--ui-surface-raised'], .43), readingSurfaces, 3, ink);
  tokens['--ui-control-border-hover'] = tokens['--ui-control-border'];
  tokens['--ui-border-strong'] = tokens['--ui-control-border'];
  tokens['--ui-disabled-text'] = tokens['--ui-text-secondary'];
  tokens['--ui-disabled-surface'] = tokens['--ui-surface-sunken'];
  tokens['--ui-disabled-border'] = tokens['--ui-control-border'];
  tokens['--ui-focus-ring'] = readableColour(tokens['--ui-accent'], readingSurfaces, 3, ink);
  tokens['--ui-focus-width'] = 'max(2px, calc(var(--ui-border-width) * 2))';
  tokens['color-scheme'] = ink === '#000000' ? 'light' : 'dark';
  for (const [id, property] of [['action', '--ui-accent'], ['canvas', '--ui-surface'], ['surface', '--ui-surface-raised'], ['text', '--ui-text']]) {
    if (tokens[property].toLowerCase() !== values[id].toLowerCase()) adjustments.push({ id, requested: values[id], resolved: tokens[property], reason: 'Adjusted to keep the shared palette readable.' });
  }
  return { tokens, adjustments };
}

/** Shared public seeds; combine with theme-system.css for a standalone exported theme. */
export function themeCSS(input, systemCSS = '', { scope = 'portable' } = {}) {
  if (!['portable', 'documentation'].includes(scope)) throw new Error('Unknown theme scope.');
  // The early documentation stylesheet wins over the baseline loaded later without !important.
  const selector = scope === 'documentation'
    ? ':root[data-looma-documentation-theme], :root[data-looma-documentation-theme] [data-theme], :root[data-looma-documentation-theme] [data-contrast]'
    : ':root, [data-theme], [data-contrast]';
  const light = deriveTheme(input, { mode: 'light' }).tokens;
  const dark = deriveTheme(input, { mode: 'dark' }).tokens;
  const palette = [], geometry = [];
  for (const [name, value] of Object.entries(light)) {
    if (name === 'color-scheme') continue;
    if (/^#[\da-f]{6}$/i.test(value)) palette.push(`  ${name}: light-dark(${value}, ${dark[name]});`);
    else geometry.push(`  ${name}: ${value};`);
  }
  const geometrySelector = scope === 'documentation' ? ':root[data-looma-documentation-theme]' : ':root';
  // Resolve colors at their point of use, so a nearer mode boundary wins independently
  // of the selector specificity needed to restore an early documentation theme.
  // Keep the first comment stable: the local writer recognizes its generated files by this marker.
  return `/* Looma shared semantic theme. */\n/* Always includes light and dark.\n   Set data-theme="light" or "dark" on any element to fix that subtree's mode.\n   Leave the root attribute unset to follow the system; a switch can set/remove it. */\n${systemCSS}\n${geometrySelector} {\n${geometry.join('\n')}\n}\n${selector} {\n${palette.join('\n')}\n}\n:root:not([data-theme]) { color-scheme: light dark; }\n[data-theme="light"] { color-scheme: light; }\n[data-theme="dark"] { color-scheme: dark; }\n@media (prefers-reduced-motion: reduce) {\n  ${selector} { --ui-motion-fast: 0ms; --ui-motion-base: 0ms; --ui-motion-press: 0ms; --ui-press-scale: 1; }\n}\n`;
}
