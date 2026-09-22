import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay, requestTopOverlayClose } from "../shared/overlay.js";

function disabled(item) {
  return item.getAttribute("aria-disabled") === "true" || item.hasAttribute("disabled") || item.getAttribute("disabled") === "true";
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const menuSurface = host.refs.menu;
  const overlayId = `ui-context-menu-${Math.random().toString(36).slice(2, 11)}`;
  let trigger = null;
  let contextTarget = null;
  let surface = null;
  let point = null;
  let lastFor = host.state.for;
  let lastOpenProp = Boolean(host.state.open);
  host.state.internalOpen = lastOpenProp;

  const items = () => Array.from(element.querySelectorAll('[data-component~="ui-menu-item"]')).filter((item) => !disabled(item));
  const focusFirst = () => requestAnimationFrame(() => items()[0]?.focus());
  const detach = () => {
    trigger?.removeEventListener("click", onTriggerClick);
    trigger?.removeEventListener("keydown", onTriggerKeydown);
    contextTarget?.removeEventListener("contextmenu", onContextMenu);
  };
  const ids = createIdResolver(document, () => resolveTargets());
  const resolveTargets = () => {
    const nextTrigger = ids.get(String(host.state.for ?? ""));
    const nextContext = nextTrigger;
    if (nextTrigger === trigger && nextContext === contextTarget) return;
    detach();
    trigger = nextTrigger;
    contextTarget = nextContext;
    trigger?.addEventListener("click", onTriggerClick);
    trigger?.addEventListener("keydown", onTriggerKeydown);
    contextTarget?.addEventListener("contextmenu", onContextMenu);
    surface?.setAnchor(trigger);
  };
  // Light dismiss leaves focus where the user pointed instead of pulling it back to the trigger.
  const close = (reason, input, returnFocus = reason !== "light-dismiss") => {
    if (!host.state.internalOpen) return;
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger: input });
    if (returnFocus) trigger?.focus();
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
    const open = Boolean(host.state.internalOpen);
    if (trigger) {
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", String(open));
    }
    if (open) {
      if (point) surface?.showAtPoint(point);
      else surface?.show();
      openOverlay({ id: overlayId, modal: false, element, dismissible: true, requestClose: close });
    } else {
      surface?.hide();
      closeOverlay(document, overlayId);
    }
  };
  const openFromTrigger = (input) => {
    if (!trigger) return;
    point = null;
    host.state.internalOpen = true;
    host.dispatch("open", { open: true, reason: "action", trigger: input });
    focusFirst();
  };
  function onTriggerClick(event) {
    const input = event.detail === 0 ? "keyboard" : "pointer";
    if (host.state.internalOpen) close("action", input);
    else openFromTrigger(input);
  }
  function onTriggerKeydown(event) {
    if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    if (!host.state.internalOpen) openFromTrigger("keyboard");
    else focusFirst();
  }
  function onContextMenu(event) {
    event.preventDefault();
    point = { x: event.clientX, y: event.clientY };
    surface?.showAtPoint(point);
    host.state.internalOpen = true;
    host.dispatch("open", { open: true, reason: "action", trigger: "pointer" });
    focusFirst();
  }
  const onKeydown = (event) => {
    if (!host.state.internalOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
    } else if (["Enter", " "].includes(event.key)) {
      const item = event.target.closest?.('[data-component~="ui-menu-item"]');
      if (!item || disabled(item)) return;
      event.preventDefault();
      host.dispatch("select", { value: item.getAttribute("data-value") ?? item.getAttribute("value") ?? "", trigger: "keyboard" });
      close("action", "keyboard");
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const enabled = items();
      if (!enabled.length) return;
      event.preventDefault();
      const index = enabled.indexOf(event.target.closest?.('[data-component~="ui-menu-item"]'));
      const next = event.key === "ArrowDown"
        ? (index < 0 ? 0 : Math.min(index + 1, enabled.length - 1))
        : (index <= 0 ? enabled.length - 1 : index - 1);
      enabled[next].focus();
    }
  };
  const onClick = (event) => {
    const item = event.target.closest?.('[data-component~="ui-menu-item"]');
    if (!item || disabled(item)) return;
    host.dispatch("select", { value: item.getAttribute("data-value") ?? item.getAttribute("value") ?? "", trigger: "pointer" });
    close("action", "pointer");
  };
  resolveTargets();
  if (menuSurface) surface = createAnchoredSurface(menuSurface, { anchor: trigger, placement: "bottom-start" });
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
