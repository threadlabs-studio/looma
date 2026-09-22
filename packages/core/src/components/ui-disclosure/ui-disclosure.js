let nextDisclosureId = 0;

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

/**
 * Synchronizes the generated trigger and animated panel. The public `open`
 * value behaves like native initial state: later external changes are observed,
 * while clicks can update local state without an unchanged false value resetting it.
 */
export default function controller(host) {
  const element = host.element;
  const trigger = element.querySelector(".disclosure__trigger");
  const panel = element.querySelector(".disclosure__panel");
  const summary = trigger?.querySelector("span:first-child");
  let lastExternalOpen = Boolean(host.state.open);
  host.state.internalOpen = lastExternalOpen;

  if (trigger && panel) {
    if (!panel.id) panel.id = `disclosure-content-${++nextDisclosureId}`;
    trigger.setAttribute("aria-controls", panel.id);
    host.state.contentId = panel.id;
  }

  const apply = () => {
    const externalOpen = Boolean(host.state.open);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    const open = Boolean(host.state.internalOpen);
    element.setAttribute("data-state-open", String(open));
    trigger?.setAttribute("aria-expanded", String(open));
    panel?.setAttribute("aria-hidden", String(!open));
    if (summary) summary.textContent = String(host.state.summary || "Details");
    if (trigger instanceof HTMLButtonElement) trigger.disabled = Boolean(host.state.disabled);
  };

  const onClick = (event) => {
    if (host.state.disabled) return;
    const next = !Boolean(host.state.internalOpen);
    host.state.internalOpen = next;
    apply();
    host.dispatch(next ? "open" : "close", {
      open: next,
      reason: "action",
      trigger: triggerFor(event)
    });
  };

  trigger?.addEventListener("click", onClick);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop?.();
    trigger?.removeEventListener("click", onClick);
  };
}
