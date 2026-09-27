// Keep externally supplied selections in sync when options arrive after the listbox upgrades.
// Without value or values, the native select owns selection, keyboard behavior, and form reset.
export default function controller(host) {
  const select = host.element;
  const apply = () => {
    if (host.state.multiple) {
      if (host.state.values === undefined || host.state.values === null) return;
      const values = new Set(host.state.values.map(String));
      for (const option of select.options) {
        option.defaultSelected = values.has(option.value);
        option.selected = values.has(option.value);
      }
      return;
    }
    if (host.state.value === undefined || host.state.value === null) return;
    const value = String(host.state.value);
    for (const option of select.options) option.defaultSelected = option.value === value;
    if (select.value !== value) select.value = value;
  };
  const observer = new MutationObserver(apply);
  observer.observe(select, { childList: true, subtree: true });
  const stop = host.effect(apply);
  return () => {
    stop();
    observer.disconnect();
  };
}
