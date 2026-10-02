// Marks an anticipatory button for the enclosing ui-affordance-scope, which reveals it on proximity.
export default function controller(host) {
  const stop = host.effect(() => {
    if (host.props.anticipatory.value) host.element.setAttribute("data-ui-affordance", "button");
    else host.element.removeAttribute("data-ui-affordance");
  });
  const onClick = (event) => {
    if (!host.props.loading.value && !host.props.pending.value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  host.element.addEventListener("click", onClick, true);
  return () => {
    stop();
    host.element.removeEventListener("click", onClick, true);
  };
}
