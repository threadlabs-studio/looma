import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay, requestTopOverlayClose } from "../shared/overlay.js";

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
  let lastFor = host.state.for;
  let lastOpenProp = Boolean(host.state.open);
  host.state.internalOpen = lastOpenProp;

  const items = () => Array.from(element.querySelectorAll('[role="menuitem"]')).filter((item) => !disabled(item));
  const focusFirst = () => requestAnimationFrame(() => items()[0]?.focus());
  const targetEvents = { contextmenu: onContextMenu, keydown: onTargetKeydown, pointerdown: onPointerdown, pointerup: endPress, pointercancel: endPress };
  const detach = () => {
    for (const [type, listener] of Object.entries(targetEvents)) target?.removeEventListener(type, listener);
    endPress();
  };
  const ids = createIdResolver(document, () => resolveTargets());
  const resolveTargets = () => {
    const next = ids.get(String(host.state.for ?? ""));
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
    if (host.state.for !== lastFor) {
      lastFor = host.state.for;
      resolveTargets();
    }
    const externalOpen = Boolean(host.state.open);
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
  const onKeydown = (event) => {
    if (!host.state.internalOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
    } else if (["Enter", " "].includes(event.key)) {
      const item = event.target.closest?.('[role="menuitem"]');
      if (!item || disabled(item)) return;
      event.preventDefault();
      host.dispatch("select", { value: item.getAttribute("data-value") ?? item.getAttribute("value") ?? "", trigger: "keyboard" });
      close("action", "keyboard");
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const enabled = items();
      if (!enabled.length) return;
      event.preventDefault();
      const index = enabled.indexOf(event.target.closest?.('[role="menuitem"]'));
      const next = event.key === "ArrowDown"
        ? (index < 0 ? 0 : Math.min(index + 1, enabled.length - 1))
        : (index <= 0 ? enabled.length - 1 : index - 1);
      enabled[next].focus();
    }
  };
  const onClick = (event) => {
    const item = event.target.closest?.('[role="menuitem"]');
    if (!item || disabled(item)) return;
    host.dispatch("select", { value: item.getAttribute("data-value") ?? item.getAttribute("value") ?? "", trigger: "pointer" });
    close("action", "pointer");
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
