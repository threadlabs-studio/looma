import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay, requestTopOverlayClose } from "../shared/overlay.js";
import { menuItemFrom, menuItems, navigateMenu } from "../shared/menu-navigation.js";

function disabled(item) {
  return item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled") || item.getAttribute("disabled") === "true";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const menuSurface = host.refs.menu;
  const overlayId = `ui-context-menu-${Math.random().toString(36).slice(2, 11)}`;
  let target = null;
  let surface = null;
  let point = null;
  let press = null;
  let lastFor = host.props.for.value;
  let lastOpenProp = Boolean(host.props.open.value);
  host.state.internalOpen = lastOpenProp;

  const items = () => menuItems(element);
  const focusFirst = () => requestAnimationFrame(() => items()[0]?.focus());
  const targetEvents = { contextmenu: onContextMenu, keydown: onTargetKeydown, pointerdown: onPointerdown, pointerup: endPress, pointercancel: endPress };
  const detach = () => {
    for (const [type, listener] of Object.entries(targetEvents)) target?.removeEventListener(type, listener);
    endPress();
  };
  const ids = createIdResolver(document, () => resolveTargets());
  const resolveTargets = () => {
    const next = ids.get(String(host.props.for.value ?? ""));
    if (next === target) return;
    detach();
    target = next;
    for (const [type, listener] of Object.entries(targetEvents)) target?.addEventListener(type, listener);
    surface?.setAnchor(target);
  };
  // Light dismiss leaves focus where the user pointed instead of pulling it back to the target.
  const close = (reason, input, returnFocus = reason !== "light-dismiss") => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    endPress();
    host.dispatch("close", { open: false, reason, trigger: input });
    if (returnFocus) target?.focus();
  };
  const apply = () => {
    if (host.props.for.value !== lastFor) {
      lastFor = host.props.for.value;
      resolveTargets();
    }
    const externalOpen = Boolean(host.props.open.value);
    if (externalOpen !== lastOpenProp) {
      lastOpenProp = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    if (host.state.internalOpen) {
      if (point) surface?.showAtPoint(point);
      else surface?.show();
      openOverlay({ id: overlayId, modal: false, element, dismissible: true, requestClose: close });
    } else {
      surface?.hide();
      closeOverlay(document, overlayId);
    }
  };
  // A null point anchors the menu to the target, for keyboard opens that have no pointer position.
  const openAt = (at, input) => {
    point = at;
    if (at) surface?.showAtPoint(at);
    host.state.internalOpen = true;
    host.dispatch("open", { open: true, reason: "action", trigger: input });
    focusFirst();
  };
  // A nested target that already opened its own menu prevents the default, so outer targets stay shut.
  function onContextMenu(event) {
    if (event.defaultPrevented) return;
    event.preventDefault();
    // A touch long-press opens the menu itself; Android's own contextmenu for that press is the same gesture.
    if (press) {
      clearTimeout(press.timer);
      if (!press.opened) openAt(press.at, "pointer");
      press.opened = true;
      return;
    }
    openAt({ x: event.clientX, y: event.clientY }, "pointer");
  }
  // Shift+F10 and the Menu key, handled here so every browser (Safari fires no contextmenu for them) behaves alike.
  function onTargetKeydown(event) {
    if (event.defaultPrevented || !(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) return;
    event.preventDefault();
    openAt(null, "keyboard");
  }
  // iOS Safari fires no contextmenu on long-press, so touch opens the menu after a held press.
  function onPointerdown(event) {
    if (event.pointerType !== "touch") return;
    endPress();
    press = { at: { x: event.clientX, y: event.clientY }, opened: false };
    press.timer = setTimeout(() => {
      press.opened = true;
      openAt(press.at, "pointer");
    }, 500);
  }
  function endPress() {
    clearTimeout(press?.timer);
    press = null;
  }
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
    close("action", trigger);
  };
  const onKeydown = (event) => {
    if (!host.state.internalOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
    } else if (["Enter", " "].includes(event.key)) {
      const item = menuItemFrom(event.target);
      if (!item || disabled(item)) return;
      if (item.localName === "a") {
        if (event.key === " ") { event.preventDefault(); item.click(); }
      } else {
        event.preventDefault();
        select(item, "keyboard");
      }
    } else {
      navigateMenu(event, element);
    }
  };
  const onClick = (event) => {
    const item = menuItemFrom(event.target);
    if (!item || disabled(item)) return;
    const trigger = event.detail === 0 ? "keyboard" : "pointer";
    select(item, trigger);
  };
  resolveTargets();
  if (menuSurface) surface = createAnchoredSurface(menuSurface, { anchor: target, placement: "bottom-start" });
  element.addEventListener("keydown", onKeydown);
  element.addEventListener("click", onClick);
  const observer = new MutationObserver(resolveTargets);
  observer.observe(element, { childList: true, subtree: true });
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    ids.stop();
    observer.disconnect();
    detach();
    element.removeEventListener("keydown", onKeydown);
    element.removeEventListener("click", onClick);
    surface?.destroy();
    closeOverlay(document, overlayId);
  };
}
