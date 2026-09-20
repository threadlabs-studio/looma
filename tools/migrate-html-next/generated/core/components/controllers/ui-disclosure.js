let nextDisclosureId = 0;

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

export default function controller(host) {
  const element = host.element;
  const trigger = element.querySelector("[data-ui-disclosure-trigger], button, [aria-controls]");
  const controlsId = trigger?.getAttribute("aria-controls") ?? "";
  const children = Array.from(element.children);
  const content = controlsId
    ? element.ownerDocument.getElementById(controlsId)
    : children.find((child) => child !== trigger) ?? null;

  if (trigger && content) {
    if (!content.id) content.id = `disclosure-content-${++nextDisclosureId}`;
    trigger.setAttribute("aria-controls", content.id);
    host.state.contentId = content.id;
  }
  host.state.internalOpen = host.state.open === undefined
    ? Boolean(host.state.defaultOpen)
    : Boolean(host.state.open);

  const apply = () => {
    if (host.state.open !== undefined) host.state.internalOpen = Boolean(host.state.open);
    const open = Boolean(host.state.internalOpen);
    trigger?.setAttribute("aria-expanded", String(open));
    if (content) content.hidden = !open;
    if (trigger instanceof HTMLButtonElement) trigger.disabled = Boolean(host.state.disabled);
    else trigger?.setAttribute("aria-disabled", String(Boolean(host.state.disabled)));
  };
  const setOpen = (next, event, triggerType = triggerFor(event)) => {
    if (host.state.disabled || Boolean(host.state.internalOpen) === next) return;
    if (host.state.open === undefined) host.state.internalOpen = next;
    apply();
    host.dispatch(next ? "open" : "close", { open: next, reason: "action", trigger: triggerType });
  };
  const onClick = (event) => {
    if (host.state.disabled) event.preventDefault();
    else setOpen(!Boolean(host.state.internalOpen), event);
  };
  const onKeydown = (event) => {
    if (host.state.disabled || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    setOpen(!Boolean(host.state.internalOpen), event, "keyboard");
  };
  trigger?.addEventListener("click", onClick);
  trigger?.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    trigger?.removeEventListener("click", onClick);
    trigger?.removeEventListener("keydown", onKeydown);
  };
}
