import { closeOverlay, createAnchoredSurface, openOverlay } from "./shared/overlay.js";

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const overlayId = element.id || `ui-tooltip-${Math.random().toString(36).slice(2, 11)}`;
  if (!element.id) element.id = overlayId;
  let pinned = false;
  let focused = false;
  let trigger = null;
  let surface = null;
  let showTimer = null;
  let hideTimer = null;
  let lastFor;
  let lastPlacement;
  host.state.internalOpen = host.state.open === undefined ? Boolean(host.state.defaultOpen) : Boolean(host.state.open);

  const clearShow = () => { if (showTimer !== null) clearTimeout(showTimer); showTimer = null; };
  const clearHide = () => { if (hideTimer !== null) clearTimeout(hideTimer); hideTimer = null; };
  const clearTimers = () => { clearShow(); clearHide(); };
  const setOpen = (open, input) => {
    if (Boolean(host.state.internalOpen) === open) return;
    if (host.state.open === undefined) host.state.internalOpen = open;
    host.dispatch(open ? "open" : "close", { open, reason: "action", trigger: input });
  };
  const onClick = (event) => {
    if (!host.state.toggleOnClick) return;
    clearTimers();
    pinned = !pinned;
    setOpen(pinned, event.detail === 0 ? "keyboard" : "pointer");
  };
  const onKeydown = (event) => { if (event.key === "Escape") clearTimers(); };
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
    if (focused || pinned || !host.state.internalOpen || hideTimer !== null) return;
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
    pinned = false;
    clearTimers();
    setOpen(false, "keyboard");
  };
  const detach = () => {
    if (!trigger) return;
    const ids = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== element.id);
    if (ids.length) trigger.setAttribute("aria-describedby", ids.join(" "));
    else trigger.removeAttribute("aria-describedby");
    trigger.removeEventListener("click", onClick);
    trigger.removeEventListener("keydown", onKeydown);
    trigger.removeEventListener("pointerenter", onEnter);
    trigger.removeEventListener("pointerleave", onLeave);
    trigger.removeEventListener("focusin", onFocusin);
    trigger.removeEventListener("focusout", onFocusout);
  };
  const attach = () => {
    if (!trigger) return;
    const ids = new Set((trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
    ids.add(element.id);
    trigger.setAttribute("aria-describedby", [...ids].join(" "));
    trigger.addEventListener("click", onClick);
    trigger.addEventListener("keydown", onKeydown);
    trigger.addEventListener("pointerenter", onEnter);
    trigger.addEventListener("pointerleave", onLeave);
    trigger.addEventListener("focusin", onFocusin);
    trigger.addEventListener("focusout", onFocusout);
  };
  const setup = () => {
    const nextFor = String(host.state.for ?? "");
    const nextPlacement = String(host.state.placement ?? "top-start");
    if (surface && nextFor === lastFor && nextPlacement === lastPlacement) return;
    lastFor = nextFor;
    lastPlacement = nextPlacement;
    const nextTrigger = nextFor ? document.getElementById(nextFor) : element.previousElementSibling;
    if (nextTrigger !== trigger) {
      detach();
      trigger = nextTrigger;
      attach();
    }
    surface?.destroy();
    surface = createAnchoredSurface(element, { anchor: trigger, placement: nextPlacement });
  };
  const close = (reason, input) => {
    if (reason !== "escape" && !(reason === "light-dismiss" && host.state.toggleOnClick)) return;
    pinned = false;
    clearTimers();
    if (host.state.open === undefined) host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger: input });
  };
  const apply = () => {
    if (host.state.open !== undefined) host.state.internalOpen = Boolean(host.state.open);
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
    clearTimers();
    detach();
    surface?.destroy();
    element.removeEventListener("pointerenter", onSurfaceEnter);
    element.removeEventListener("pointerleave", onLeave);
    closeOverlay(document, overlayId);
  };
}
