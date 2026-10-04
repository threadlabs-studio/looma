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
  let anchorAria = null;
  let surface = null;
  let lastFor;
  let lastPlacement;
  let lastExternalOpen = Boolean(host.props.open.value);
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
  const releaseAnchor = () => {
    if (!anchor) return;
    anchor.removeEventListener("click", onAnchorClick);
    for (const [name, value] of Object.entries(anchorAria ?? {})) {
      if (value === null) anchor.removeAttribute(name);
      else anchor.setAttribute(name, value);
    }
    anchor = null;
    anchorAria = null;
  };
  const setup = () => {
    const nextFor = host.props.inline.value ? "" : String(host.props.for.value ?? "");
    const nextPlacement = String(host.props.placement.value ?? "bottom-start");
    if (nextFor === lastFor && nextPlacement === lastPlacement && surface) return;
    lastFor = nextFor;
    lastPlacement = nextPlacement;
    surface?.destroy();
    releaseAnchor();
    anchor = ids.get(nextFor);
    if (anchor) anchorAria = { "aria-haspopup": anchor.getAttribute("aria-haspopup"), "aria-expanded": anchor.getAttribute("aria-expanded") };
    anchor?.addEventListener("click", onAnchorClick);
    surface = anchor ? createAnchoredSurface(element, { anchor, placement: nextPlacement }) : null;
  };
  const apply = () => {
    const inline = Boolean(host.props.inline.value);
    const externalOpen = Boolean(host.props.open.value);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    setup();
    const open = inline || Boolean(host.state.internalOpen);
    if (anchor) {
      anchor.setAttribute("aria-haspopup", "menu");
      anchor.setAttribute("aria-expanded", String(open));
    }
    if (inline) {
      surface?.hide();
      closeOverlay(document, overlayId);
    } else if (open) {
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
    if (host.props.inline.value) return;
    host.dispatch("close", { open: false, reason: "action", trigger });
    host.state.internalOpen = false;
  };
  const onClick = (event) => select(menuItemFrom(event.target), triggerFor(event));
  const onKeydown = (event) => {
    if (event.key === "Escape") {
      if (host.props.inline.value || event.defaultPrevented) return;
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
    surface?.destroy();
    closeOverlay(document, overlayId);
    releaseAnchor();
  };
}
