// HTML Next controller for ui-top-bar, ported from the Stencil component. Projected light-DOM
// children live directly in each named region, so one native observer replaces slotchange state.

function hasContent(region) {
  return [...region.childNodes].some((node) => node.nodeType !== 3 || Boolean(node.textContent?.trim()));
}

export default function controller(host) {
  const regions = ["leading", "search", "actions"]
    .map((name) => host.element.querySelector(`.top-bar__${name}`))
    .filter(Boolean);

  const syncSlots = () => {
    for (const region of regions) region.hidden = !hasContent(region);
  };

  const observer = new MutationObserver(syncSlots);
  for (const region of regions) observer.observe(region, { childList: true, subtree: true });
  syncSlots();

  return () => observer.disconnect();
}
