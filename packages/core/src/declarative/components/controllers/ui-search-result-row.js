// HTML Next controller for the optional projected regions in ui-search-result-row.

export function hasContent(region) {
  return [...region.childNodes].some((node) => node.nodeType !== 3 || Boolean(node.textContent?.trim()));
}

export default function controller(host) {
  const regions = {
    hasLeading: host.element.querySelector(".search-result-row__leading"),
    hasMeta: host.element.querySelector(".search-result-row__meta"),
    hasExcerpt: host.element.querySelector(".search-result-row__excerpt"),
    hasTrailing: host.element.querySelector(".search-result-row__trailing"),
  };
  const syncSlots = () => {
    for (const [state, region] of Object.entries(regions)) host.state[state] = Boolean(region && hasContent(region));
  };
  const observer = new MutationObserver(syncSlots);
  for (const region of Object.values(regions)) {
    if (region) observer.observe(region, { childList: true, subtree: true });
  }
  syncSlots();
  return () => observer.disconnect();
}
