// A frozen column reads its offset from the Data Table around it, which measures every frozen column
// and publishes --_ui-col-<index> on its table. The column points its own offset at its index and
// follows it when columns are added, removed, or reordered.
export function connect(host) {
  const element = host.element;
  const row = element.parentElement;
  if (!row) return undefined;
  const update = () => element.style.setProperty("--_ui-frozen-offset", `var(--_ui-col-${element.cellIndex}, 0)`);
  const observer = new MutationObserver(update);
  observer.observe(row, { childList: true });
  update();
  return () => {
    observer.disconnect();
    element.style.removeProperty("--_ui-frozen-offset");
  };
}
