// Marks an anticipatory button for the enclosing ui-affordance-scope, which reveals it on proximity.
export default function controller(host) {
  const stop = host.effect(() => {
    if (host.state.anticipatory) host.element.setAttribute("data-ui-affordance", "button");
    else host.element.removeAttribute("data-ui-affordance");
  });
  const onClick = (event) => {
    if (!host.state.loading && !host.state.pending) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  host.element.addEventListener("click", onClick, true);
  return () => {
    stop();
    host.element.removeEventListener("click", onClick, true);
  };
}
