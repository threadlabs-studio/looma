// Native CI and local amd64 emulation differ at antialiased curve/text edges:
// the table artifact had 216 changed pixels, at most 17 RGB levels, while all
// geometry and flat regions matched. SSIM/CIE94 accepts that edge noise but
// still rejects a flat 3 RGB wash, a small 17 RGB indicator, and one dark pixel.
// _comparator is a test-only capability of our pinned Playwright version; the
// comparison regression tests exercise that exact implementation on upgrades.
export const stateSheetComparison = { _comparator: 'ssim-cie94', maxDiffPixels: 0 };
