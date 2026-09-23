import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay } from "../shared/overlay.js";

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const overlayId = element.id || `ui-tooltip-${Math.random().toString(36).slice(2, 11)}`;
  if (!element.id) element.id = overlayId;
  let focused = false;
  let trigger = null;
  let surface = null;
  let showTimer = null;
  let hideTimer = null;
  let lastFor;
  let lastPlacement;
  let lastExternalOpen = Boolean(host.state.open);
  host.state.internalOpen = lastExternalOpen;

  const clearShow = () => { if (showTimer !== null) clearTimeout(showTimer); showTimer = null; };
  const clearHide = () => { if (hideTimer !== null) clearTimeout(hideTimer); hideTimer = null; };
  const clearTimers = () => { clearShow(); clearHide(); };
  const setOpen = (open, input) => {
    if (Boolean(host.state.internalOpen) === open) return;
    host.state.internalOpen = open;
    if (trigger && host.state.trigger === "click") trigger.setAttribute("aria-expanded", String(open));
    host.dispatch(open ? "open" : "close", { open, reason: "action", trigger: input });
  };
  const onKeydown = (event) => {
    if (event.key !== "Escape") return;
    clearTimers();
    // A tooltip the reader opened is theirs to close.
    if (host.state.trigger === "click" && host.state.internalOpen) setOpen(false, "keyboard");
  };
  const onEnter = (event) => {
    if (event.pointerType === "touch") return;
    clearHide();
    if (host.state.internalOpen || showTimer !== null) return;
    showTimer = setTimeout(() => {
      showTimer = null;
      setOpen(true, "pointer");
    }, Math.max(0, Number(host.state.showDelay ?? 500)));
  };
  const onLeave = () => {
    clearShow();
    if (focused || !host.state.internalOpen || hideTimer !== null) return;
    hideTimer = setTimeout(() => {
      hideTimer = null;
      setOpen(false, "pointer");
    }, Math.max(0, Number(host.state.hideDelay ?? 100)));
  };
  const onFocusin = () => {
    focused = true;
    clearTimers();
    setOpen(true, "keyboard");
  };
  const onFocusout = (event) => {
    if (event.relatedTarget && element.contains(event.relatedTarget)) return;
    focused = false;
    clearTimers();
    setOpen(false, "keyboard");
  };
  const detach = () => {
    if (!trigger) return;
    const ids = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== element.id);
    if (ids.length) trigger.setAttribute("aria-describedby", ids.join(" "));
    else trigger.removeAttribute("aria-describedby");
    trigger.removeEventListener("keydown", onKeydown);
    trigger.removeEventListener("click", onClick);
    trigger.removeAttribute("aria-expanded");
    trigger.removeEventListener("pointerenter", onEnter);
    trigger.removeEventListener("pointerleave", onLeave);
    trigger.removeEventListener("focusin", onFocusin);
    trigger.removeEventListener("focusout", onFocusout);
  };
  const onClick = () => {
    clearTimers();
    setOpen(!host.state.internalOpen, "pointer");
  };
  const attach = () => {
    if (!trigger) return;
    const ids = new Set((trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
    ids.add(element.id);
    trigger.setAttribute("aria-describedby", [...ids].join(" "));
    trigger.addEventListener("keydown", onKeydown);
    const how = host.state.trigger ?? "hover";
    if (how === "click") {
      // A question-mark button says nothing on hover: it opens when pressed, and closes the same way.
      trigger.addEventListener("click", onClick);
      trigger.setAttribute("aria-expanded", String(Boolean(host.state.internalOpen)));
      return;
    }
    if (how === "hover") {
      trigger.addEventListener("pointerenter", onEnter);
      trigger.addEventListener("pointerleave", onLeave);
    }
    trigger.addEventListener("focusin", onFocusin);
    trigger.addEventListener("focusout", onFocusout);
  };
  const ids = createIdResolver(document, () => {
    lastFor = undefined;
    apply();
  });
  const setup = () => {
    const nextFor = String(host.state.for ?? "");
    const nextPlacement = String(host.state.placement ?? "top-start");
    if (surface && nextFor === lastFor && nextPlacement === lastPlacement) return;
    lastFor = nextFor;
    lastPlacement = nextPlacement;
    const nextTrigger = ids.get(nextFor);
    if (nextTrigger !== trigger) {
      detach();
      trigger = nextTrigger;
      attach();
    }
    surface?.destroy();
    surface = createAnchoredSurface(element, { anchor: trigger, placement: nextPlacement });
  };
  const close = (reason, input) => {
    if (reason !== "escape" && reason !== "light-dismiss") return;
    clearTimers();
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger: input });
  };
  const apply = () => {
    const externalOpen = Boolean(host.state.open);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    setup();
    const open = Boolean(host.state.internalOpen);
    element.hidden = !open;
    if (open) {
      surface?.show();
      openOverlay({ id: overlayId, modal: false, element, relatedElements: trigger ? [trigger] : [], dismissible: true, requestClose: close });
    } else {
      surface?.hide();
      closeOverlay(document, overlayId);
    }
  };
  const onSurfaceEnter = () => clearHide();
  element.addEventListener("pointerenter", onSurfaceEnter);
  element.addEventListener("pointerleave", onLeave);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    ids.stop();
    clearTimers();
    detach();
    surface?.destroy();
    element.removeEventListener("pointerenter", onSurfaceEnter);
    element.removeEventListener("pointerleave", onLeave);
    closeOverlay(document, overlayId);
  };
}
