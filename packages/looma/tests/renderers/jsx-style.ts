/** Inline scene styles use the browser's own declaration parser. */
export function jsxStyle(source: string): Record<string, string> {
  const style = document.createElement("span").style;
  style.cssText = source;
  return Object.fromEntries(Array.from(style, name => [name.startsWith("--") ? name : name.replace(/^-ms-/, "ms-").replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), style.getPropertyValue(name)]));
}
