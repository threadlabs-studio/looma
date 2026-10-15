/**
 * Shows a key binding in ProseMirror notation ("Mod-Shift-8") the way the reader's platform writes
 * it: modifier symbols in Apple's order on Apple devices (⇧⌘8), and Ctrl+Shift+8 elsewhere.
 */
export function formatEditorShortcut(keys: string, apple: boolean): string {
  const parts = keys.split("-");
  const key = (parts.pop() ?? "").toUpperCase();
  const has = (name: string) => parts.includes(name);
  if (apple) return `${has("Ctrl") ? "⌃" : ""}${has("Alt") ? "⌥" : ""}${has("Shift") ? "⇧" : ""}${has("Mod") ? "⌘" : ""}${key}`;
  return [has("Mod") || has("Ctrl") ? "Ctrl" : "", has("Alt") ? "Alt" : "", has("Shift") ? "Shift" : "", key].filter(Boolean).join("+");
}

// Client Hints report "macOS" in a secure context; navigator.platform reports "MacIntel" or "iPhone".
export const isApplePlatform = () => typeof navigator !== "undefined"
  && /mac|iphone|ipad|ipod/i.test((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || navigator.userAgent);
