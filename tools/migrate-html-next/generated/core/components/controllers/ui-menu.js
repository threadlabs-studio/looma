import { closeOverlay, createAnchoredSurface, openOverlay, requestTopOverlayClose } from "./shared/overlay.js";

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

function disabled(item) {
  return item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled") || item.getAttribute("disabled") === "true";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const overlayId = `ui-menu-${Math.random().toString(36).slice(2, 11)}`;
  const items = () => Array.from(element.querySelectorAll('[data-component-root~="ui-menu-item"]'));
  let anchor = null;
  let surface = null;
  let lastFor;
  let lastPlacement;
  host.state.internalOpen = host.state.open === undefined ? Boolean(host.state.defaultOpen) : Boolean(host.state.open);

  const close = (reason, trigger) => {
    if (!host.state.internalOpen) return;
    if (host.state.open === undefined) host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
    if (reason === "escape") anchor?.focus();
  };
  const setup = () => {
    const nextFor = String(host.state.for ?? "");
    const nextPlacement = String(host.state.placement ?? "bottom-start");
    if (nextFor === lastFor && nextPlacement === lastPlacement && surface) return;
    lastFor = nextFor;
    lastPlacement = nextPlacement;
    surface?.destroy();
    anchor = nextFor ? document.getElementById(nextFor) : null;
    surface = anchor ? createAnchoredSurface(element, { anchor, placement: nextPlacement }) : null;
  };
  const apply = () => {
    if (host.state.open !== undefined) host.state.internalOpen = Boolean(host.state.open);
    setup();
    const open = Boolean(host.state.internalOpen);
    if (anchor) {
      anchor.setAttribute("aria-haspopup", "menu");
      anchor.setAttribute("aria-expanded", String(open));
    }
    if (open) {
      surface?.show();
      openOverlay({ id: overlayId, modal: false, element, relatedElements: anchor ? [anchor] : [], dismissible: true, requestClose: close });
    } else {
      surface?.hide();
      closeOverlay(document, overlayId);
    }
  };
  const select = (item, trigger) => {
    if (!item || disabled(item)) return;
    const value = item.getAttribute("data-value") ?? item.getAttribute("value") ?? "";
    host.dispatch("select", { value, trigger });
    host.dispatch("close", { open: false, reason: "action", trigger });
    if (host.state.open === undefined) host.state.internalOpen = false;
  };
  const onClick = (event) => select(event.target.closest?.('[data-component-root~="ui-menu-item"]'), triggerFor(event));
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
      return;
    }
    const enabled = items().filter((item) => !disabled(item));
    const target = event.target.closest?.('[data-component-root~="ui-menu-item"]');
    const index = target ? enabled.indexOf(target) : -1;
    if (["Enter", " "].includes(event.key)) {
      if (index >= 0) {
        event.preventDefault();
        select(target, "keyboard");
      }
    } else if (["ArrowDown", "ArrowUp"].includes(event.key) && enabled.length) {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (index < 0 ? 0 : Math.min(index + 1, enabled.length - 1)) : (index <= 0 ? enabled.length - 1 : index - 1);
      enabled[next]?.focus();
    }
  };
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    surface?.destroy();
    closeOverlay(document, overlayId);
  };
}
