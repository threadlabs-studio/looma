// Marks an anticipatory button for the enclosing ui-affordance-scope, which reveals it on proximity.
export default function controller(host) {
  return host.effect(() => {
    if (host.state.anticipatory) host.element.setAttribute("data-ui-affordance", "button");
    else host.element.removeAttribute("data-ui-affordance");
  });
}
