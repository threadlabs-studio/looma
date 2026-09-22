// HTML Next controller for ui-top-bar, ported from the Stencil component. Projected light-DOM
// children live directly in each named region, so one native observer replaces slotchange state.

function hasContent(region) {
  return [...region.childNodes].some((node) => node.nodeType !== 3 || Boolean(node.textContent?.trim()));
}

export default function controller(host) {
  const regions = {
    hasLeading: host.element.querySelector(".top-bar__leading"),
    hasSearch: host.element.querySelector(".top-bar__search"),
    hasActions: host.element.querySelector(".top-bar__actions"),
  };

  const syncSlots = () => {
    for (const [state, region] of Object.entries(regions)) {
      const present = Boolean(region && hasContent(region));
      host.state[state] = present;
      if (region) region.hidden = !present;
    }
  };

  const observer = new MutationObserver(syncSlots);
  for (const region of Object.values(regions)) {
    if (region) observer.observe(region, { childList: true, subtree: true });
  }
  syncSlots();
  queueMicrotask(syncSlots);

  return () => observer.disconnect();
}
