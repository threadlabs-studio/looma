// The pinned amd64 Chromium image can rasterize curved edges slightly differently
// on native CI and local emulation. The curve-editor evidence had 174 changed
// pixels (mostly 1 RGB level); five exceeded .01 and none exceeded .05. Keep
// zero mismatched pixels: a small missing glyph or state must still fail.
export const stateSheetComparison = { threshold: 0.05, maxDiffPixels: 0 };
