export function curvePoints(value) {
  const presets = { linear: [0, 0, 1, 1], ease: [.25, .1, .25, 1], "ease-in": [.42, 0, 1, 1], "ease-out": [0, 0, .58, 1], "ease-in-out": [.42, 0, .58, 1] };
  if (presets[value]) return [...presets[value]];
  const match = /^cubic-bezier\(\s*([^)]*)\s*\)$/.exec(String(value));
  const parts = match?.[1].split(",");
  const points = parts?.map(part => part.trim() === "" ? NaN : Number(part));
  if (!points || points.length !== 4 || points.some(number => !Number.isFinite(number))) throw new Error("Use a cubic-bezier curve.");
  return points.map((number, index) => Math.min(index % 2 ? 2 : 1, Math.max(index % 2 ? -1 : 0, number)));
}
export function curveText(points) { return `cubic-bezier(${points.map(number => Number(number.toFixed(3))).join(", ")})`; }
