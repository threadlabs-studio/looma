// Reports the menu's choice as a block action.
export function connect(host) {
  const element = host.element;
  const onSelect = (event) => {
    if (event.target !== element && element.contains(event.target)) host.dispatch("action", { action: event.detail.value });
  };
  element.addEventListener("select", onSelect);
  return () => element.removeEventListener("select", onSelect);
}
