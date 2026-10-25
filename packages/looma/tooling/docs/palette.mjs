// Perceptual palette operations use Oklab/OKLCH; output remains portable sRGB hex.
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const encoded = value => value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export function toLch(hex) {
  const [r, g, b] = [1, 3, 5].map(i => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
  const bb = .0259040371 * l + .7827717662 * m - .808675766 * s;
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, Math.hypot(a, bb), (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360];
}
const channels = ([lightness, chroma, hue]) => {
  const a = chroma * Math.cos(hue * Math.PI / 180), b = chroma * Math.sin(hue * Math.PI / 180);
  const l = (lightness + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (lightness - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (lightness - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
};
export function fromLch([lightness, chroma, hue]) {
  lightness = clamp(lightness); chroma = Math.max(0, chroma);
  let rgb = channels([lightness, chroma, hue]);
  if (rgb.some(n => n < -.000001 || n > 1.000001)) {
    // Reduce chroma at fixed hue/lightness instead of clipping individual channels.
    let low = 0, high = chroma;
    for (let i = 0; i < 18; i++) {
      const middle = (low + high) / 2;
      if (channels([lightness, middle, hue]).every(n => n >= 0 && n <= 1)) low = middle;
      else high = middle;
    }
    rgb = channels([lightness, low, hue]);
  }
  return '#' + rgb.map(n => Math.round(clamp(encoded(n)) * 255).toString(16).padStart(2, '0')).join('');
}
export function mixColour(a, b, weight) {
  // Cartesian Oklab mixing avoids a hue discontinuity around 0/360 degrees.
  const cartesian = hex => { const [l, c, h] = toLch(hex); return [l, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)]; };
  const first = cartesian(a), second = cartesian(b), mixed = first.map((n, i) => n * weight + second[i] * (1 - weight));
  return fromLch([mixed[0], Math.hypot(mixed[1], mixed[2]), Math.atan2(mixed[2], mixed[1]) * 180 / Math.PI]);
}
export function paletteSeeds(values) {
  const intensity = Number(values['color-intensity']) * 2, warmth = (Number(values.warmth) - .5) * 2;
  const relationship = values['palette-relationship'];
  const brandHue = toLch(values.action)[2];
  return Object.fromEntries(['action', 'canvas', 'surface', 'text'].map(key => {
    if (intensity === 1 && warmth === 0 && relationship === 'preserve') return [key, values[key]];
    let [l, c, h] = toLch(values[key]);
    if (key !== 'action') {
      const tint = Math.max(Math.abs(warmth), relationship === 'preserve' ? 0 : .5);
      if (tint) l = clamp(l, .08 * tint, 1 - .03 * tint);
      if (relationship !== 'preserve') { h = brandHue + (relationship === 'neighboring' ? 30 : 180); c = Math.max(c, .018); }
      if (warmth !== 0) {
        const strength = Math.abs(warmth);
        const target = fromLch([l, warmth > 0 ? .025 : .018, warmth > 0 ? 85 : 255]);
        [l, c, h] = toLch(mixColour(fromLch([l, c, h]), target, 1 - strength));
      }
    }
    return [key, fromLch([l, c * intensity, h])];
  }));
}

export function companionSurface(seed, mode) {
  const [l, c, h] = toLch(seed);
  // Retain hue and restrained colorfulness; convert the tonal role, not the identity.
  return fromLch([mode === 'dark' ? .16 + (1 - l) * .12 : .94 + (1 - l) * .045, Math.min(c, .045), h]);
}
