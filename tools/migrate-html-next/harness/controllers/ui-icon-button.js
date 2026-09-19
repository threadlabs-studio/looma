export default function controller(host) {
  const element = host.element;
  const button = element.querySelector("button");
  const apply = () => {
    const disabled = Boolean(host.state.disabled);
    if (host.state.anticipatory) element.setAttribute("data-ui-affordance", "button");
    else element.removeAttribute("data-ui-affordance");
    if (button) {
      button.disabled = disabled;
      const label = String(host.state.label ?? "");
      if (label) button.setAttribute("aria-label", label);
      else button.removeAttribute("aria-label");
    }
  };
  const stop = host.effect(apply);
  apply();
  return stop;
}
