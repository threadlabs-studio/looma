// Reports the menu's choice as a block action.
function connect(host) {
  const element = host.element;
  const onSelect = (event) => {
    if (event.target !== element && element.contains(event.target)) host.dispatch("action", { action: event.detail.value });
  };
  element.addEventListener("select", onSelect);
  return () => element.removeEventListener("select", onSelect);
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
