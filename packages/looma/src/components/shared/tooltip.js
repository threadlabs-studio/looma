/** Resolve the inherited pointer-intent delay; CSS time values and millisecond numbers are accepted. */
export function tooltipShowDelay(element, fallback = 500) {
  if (!element) return fallback;
  const value = element.ownerDocument.defaultView.getComputedStyle(element).getPropertyValue("--ui-tooltip-show-delay").trim();
  const match = /^([0-9]+(?:\.[0-9]+)?)(ms|s)?$/.exec(value);
  return match ? Number(match[1]) * (match[2] === "s" ? 1000 : 1) : fallback;
}
