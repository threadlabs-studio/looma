import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay, requestTopOverlayClose } from "../shared/overlay.js";
import { menuItemFrom, menuItems, navigateMenu } from "../shared/menu-navigation.js";

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return event.detail === 0 ? "keyboard" : "pointer";
  return "programmatic";
}

function disabled(item) {
  return item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled") || item.getAttribute("disabled") === "true";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const overlayId = `ui-menu-${Math.random().toString(36).slice(2, 11)}`;
  const items = () => menuItems(element);
  let anchor = null;
  let surface = null;
  let lastFor;
  let lastPlacement;
  let lastExternalOpen = Boolean(host.state.open);
  host.state.internalOpen = lastExternalOpen;

  const onAnchorClick = (event) => {
    const trigger = triggerFor(event);
    if (host.state.internalOpen) close("action", trigger);
    else {
      host.state.internalOpen = true;
      host.dispatch("open", { open: true, reason: "action", trigger });
      requestAnimationFrame(() => items()[0]?.focus());
    }
  };
  const close = (reason, trigger) => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
    if (reason === "escape") anchor?.focus();
  };
  const ids = createIdResolver(document, () => apply());
  const setup = () => {
    const nextFor = String(host.state.for ?? "");
    const nextPlacement = String(host.state.placement ?? "bottom-start");
    if (nextFor === lastFor && nextPlacement === lastPlacement && surface) return;
    lastFor = nextFor;
    lastPlacement = nextPlacement;
    surface?.destroy();
    anchor?.removeEventListener("click", onAnchorClick);
    anchor = ids.get(nextFor);
    anchor?.addEventListener("click", onAnchorClick);
    surface = anchor ? createAnchoredSurface(element, { anchor, placement: nextPlacement }) : null;
  };
  const apply = () => {
    const externalOpen = Boolean(host.state.open);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
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
    if (item.getAttribute("role") !== "menuitem") {
      const detail = { trigger, checked: undefined };
      item.dispatchEvent(new CustomEvent("ui-menu-item-activate", { detail }));
      host.dispatch("select", { value, checked: detail.checked, trigger });
      return;
    }
    host.dispatch("select", { value, trigger });
    host.dispatch("close", { open: false, reason: "action", trigger });
    host.state.internalOpen = false;
  };
  const onClick = (event) => select(menuItemFrom(event.target), triggerFor(event));
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
      return;
    }
    const target = menuItemFrom(event.target);
    if (["Enter", " "].includes(event.key)) {
      if (!target || disabled(target)) return;
      if (target.localName === "a") {
        if (event.key === " ") { event.preventDefault(); target.click(); }
      } else {
        event.preventDefault();
        select(target, "keyboard");
      }
    } else {
      navigateMenu(event, element);
    }
  };
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    ids.stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    anchor?.removeEventListener("click", onAnchorClick);
    surface?.destroy();
    closeOverlay(document, overlayId);
  };
}
