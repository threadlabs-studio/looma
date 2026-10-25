// Reveal within the component's own scrollport; browser focus/scrollIntoView can move the page.
const pending = new WeakMap();

export function cancelActiveItemReveal(root) {
  const current = pending.get(root);
  if (!current) return;
  root.ownerDocument.defaultView.cancelAnimationFrame(current.frame);
  pending.delete(root);
}

function scrollport(root, item, view) {
  for (let parent = item.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
    if (parent.scrollHeight > parent.clientHeight && /^(auto|scroll|hidden)$/.test(view.getComputedStyle(parent).overflowY)) return parent;
    if (parent === root) break;
  }
  return null;
}

function destination(port, item, view) {
  const bounds = port.getBoundingClientRect();
  const scale = port.offsetHeight ? bounds.height / port.offsetHeight : 1;
  if (!scale) return port.scrollTop;
  const style = view.getComputedStyle(port);
  const fade = style.maskImage !== "none" ? parseFloat(style.getPropertyValue("--_ui-scroll-fade-size")) || 0 : 0;
  const top = bounds.top + (port.clientTop + Math.max(parseFloat(style.scrollPaddingTop) || 0, fade)) * scale;
  const bottom = bounds.top + (port.clientTop + port.clientHeight - Math.max(parseFloat(style.scrollPaddingBottom) || 0, fade)) * scale;
  const row = item.getBoundingClientRect();
  const delta = row.top < top ? row.top - top : row.bottom > bottom ? Math.min(row.bottom - bottom, row.top - top) : 0;
  return Math.max(0, Math.min(port.scrollHeight - port.clientHeight, port.scrollTop + delta / scale));
}

/** Resolve after rendering so HTML and framework adapters reveal the same active row. */
export function revealActiveItem(root, resolve) {
  const view = root.ownerDocument.defaultView;
  const item = typeof resolve === "function" ? resolve() : resolve;
  if (item && pending.get(root)?.item === item) return;
  cancelActiveItemReveal(root);
  const current = { item, frame: 0 };
  pending.set(root, current);
  current.frame = view.requestAnimationFrame(() => {
    current.item = typeof resolve === "function" ? resolve() : resolve;
    if (!root.isConnected || !current.item?.getClientRects().length || !root.contains(current.item)) {
      pending.delete(root);
      return;
    }
    const port = scrollport(root, current.item, view);
    if (!port) { pending.delete(root); return; }
    const from = port.scrollTop;
    const to = destination(port, current.item, view);
    const token = view.getComputedStyle(root).getPropertyValue("--ui-motion-fast").trim();
    const duration = view.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0
      : (parseFloat(token) || 0) * (token.endsWith("ms") ? 1 : 1000);
    if (Math.abs(to - from) < 1 || duration <= 0) {
      port.scrollTop = to;
      pending.delete(root);
      return;
    }
    const started = view.performance.now();
    const animate = (now) => {
      if (!root.isConnected || !current.item.getClientRects().length) { pending.delete(root); return; }
      const progress = Math.min(1, (now - started) / duration);
      port.scrollTop = from + (to - from) * (1 - (1 - progress) ** 3);
      if (progress < 1) current.frame = view.requestAnimationFrame(animate);
      else pending.delete(root);
    };
    current.frame = view.requestAnimationFrame(animate);
  });
}

export function focusAndRevealItem(root, item) {
  if (!item) return;
  item.focus({ preventScroll: true });
  revealActiveItem(root, item);
}
