// HTML Next controller for ui-search-shell, ported from the Stencil component. The lowered light
// DOM places projected nodes directly in their status/footer regions, so native child observation
// replaces the original shadow-slot `slotchange` bookkeeping.

export function hasContent(region) {
  return [...region.childNodes].some((node) => node.nodeType !== 3 || Boolean(node.textContent?.trim()));
}

export default function controller(host) {
  const status = host.element.querySelector(".search-shell__status");
  const footer = host.element.querySelector(".search-shell__footer");

  const syncSlots = () => {
    if (status) status.hidden = !hasContent(status);
    if (footer) footer.hidden = !hasContent(footer);
  };

  const observer = new MutationObserver(syncSlots);
  if (status) observer.observe(status, { childList: true, subtree: true });
  if (footer) observer.observe(footer, { childList: true, subtree: true });
  syncSlots();

  return () => observer.disconnect();
}
