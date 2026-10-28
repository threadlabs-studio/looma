/** A focused searchable Google Fonts collection; system fonts never require a request. */
export const googleFonts = Object.fromEntries([
  ['Inter', 'sans-serif'], ['Roboto', 'sans-serif'], ['Open Sans', 'sans-serif'],
  ['Source Sans 3', 'sans-serif'], ['Lato', 'sans-serif'], ['Nunito Sans', 'sans-serif'],
  ['DM Sans', 'sans-serif'], ['Manrope', 'sans-serif'], ['Work Sans', 'sans-serif'],
  ['IBM Plex Sans', 'sans-serif'], ['Public Sans', 'sans-serif'], ['Atkinson Hyperlegible', 'sans-serif'],
  ['Outfit', 'sans-serif'], ['Fraunces', 'serif'], ['Merriweather', 'serif'], ['Lora', 'serif'],
  ['Source Serif 4', 'serif'], ['Newsreader', 'serif'], ['Libre Baskerville', 'serif'], ['Crimson Pro', 'serif'],
  ['EB Garamond', 'serif'], ['Playfair Display', 'serif'], ['Roboto Mono', 'monospace'],
  ['IBM Plex Mono', 'monospace'], ['JetBrains Mono', 'monospace'], ['Fira Code', 'monospace'],
].map(([family, category]) => [family, { family, category, weights: ['Lato', 'Atkinson Hyperlegible', 'Libre Baskerville'].includes(family) ? '400;700' : '400;500;600;700' }]));

export const systemFont = 'system-ui, sans-serif';
export const googleFontStack = family => `"${family}", ${googleFonts[family].category}`;
export function googleFontURL(fonts = {}) {
  const families = [...new Set(Object.values(fonts))].sort();
  if (!families.length) return '';
  return 'https://fonts.googleapis.com/css2?' + families.map(family => {
    if (!Object.hasOwn(googleFonts, family)) throw new Error('Choose a supported Google font.');
    return 'family=' + encodeURIComponent(family).replaceAll('%20', '+') + ':wght@' + googleFonts[family].weights;
  }).join('&') + '&display=swap';
}

/** Load and confirm actual faces before reporting a selected font as ready. */
const fontLoads = new WeakMap();
export async function loadGoogleFonts(document, fonts) {
  const url = googleFontURL(fonts);
  let link = document.head.querySelector('link[data-looma-google-fonts]');
  if (!url) { fontLoads.get(link)?.cancel(); link?.remove(); return; }
  if (link?.href !== url) {
    fontLoads.get(link)?.cancel(); link?.remove(); link = document.createElement('link');
    link.rel = 'stylesheet'; link.dataset.loomaGoogleFonts = '';
    let cancel;
    const loaded = new Promise((resolve, reject) => {
      cancel = () => resolve(false);
      link.onload = () => resolve(true); link.onerror = () => reject(new Error('The Google font could not load. Check your connection or select the system font.'));
    });
    fontLoads.set(link, { loaded, cancel }); link.href = url; document.head.append(link);
  }
  if (await fontLoads.get(link)?.loaded === false) return;
  for (const family of new Set(Object.values(fonts))) {
    const faces = await document.fonts.load(`400 16px "${family}"`);
    if (!faces.length) throw new Error(`${family} is unavailable; the fallback is currently displayed.`);
  }
}
