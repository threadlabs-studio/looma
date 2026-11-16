import { nextCollectionPosition } from "../shared/collection-navigation.js";

const selector = 'button, a[href], [role="button"], select, input:not([type="hidden"])';

/** Keep one Tab stop in the toolbar; arrow keys move among its enabled authored controls. */
export function connect(host) {
  const strip = host.refs.strip;
  let current = null;
  const controls = () => Array.from(strip.querySelectorAll(selector)).filter((element) =>
    !element.disabled && element.getAttribute("aria-disabled") !== "true"
    && !element.closest("[hidden], [inert], [role='menu'], [role='listbox']")
    && element.getClientRects().length > 0);
  const sync = () => {
    const items = controls();
    if (!items.includes(current)) current = items.find((item) => item.tabIndex === 0) ?? items[0] ?? null;
    for (const item of items) item.tabIndex = item === current ? 0 : -1;
  };
  const onFocusin = (event) => {
    const item = event.target.closest?.(selector);
    if (!controls().includes(item)) return;
    current = item;
    sync();
  };
  const onKeydown = (event) => {
    const items = controls();
    const index = items.indexOf(event.target.closest?.(selector));
    if (index < 0) return;
    const rtl = getComputedStyle(strip).direction === "rtl";
    if (event.key === "ArrowUp" || event.key === "ArrowDown") return;
    const previousKey = rtl ? "ArrowRight" : "ArrowLeft";
    const nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    const key = event.key === previousKey ? "ArrowUp" : event.key === nextKey ? "ArrowDown" : event.key;
    const next = nextCollectionPosition(items.length, index, key, true);
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  };
  const observer = new MutationObserver(sync);
  observer.observe(strip, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "hidden", "aria-disabled"] });
  strip.addEventListener("focusin", onFocusin);
  strip.addEventListener("keydown", onKeydown);
  sync();
  return () => {
    observer.disconnect();
    strip.removeEventListener("focusin", onFocusin);
    strip.removeEventListener("keydown", onKeydown);
  };
}
