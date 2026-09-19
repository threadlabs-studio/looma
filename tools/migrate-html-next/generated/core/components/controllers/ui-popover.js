import { closeOverlay, createAnchoredSurface, openOverlay, requestTopOverlayClose } from "./shared/overlay.js";

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const overlayId = `ui-popover-${Math.random().toString(36).slice(2, 11)}`;
  let anchor = null;
  let surface = null;
  let lastFor;
  let lastPlacement;
  let lastOpen;
  host.state.internalOpen = host.state.open === undefined ? Boolean(host.state.defaultOpen) : Boolean(host.state.open);

  const close = (reason, trigger) => {
    if (host.state.open === undefined) host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
  };
  const setup = () => {
    const nextFor = String(host.state.for ?? "");
    const nextPlacement = String(host.state.placement ?? "bottom-start");
    if (surface && nextFor === lastFor && nextPlacement === lastPlacement) return;
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
    if (open) {
      surface?.show();
      openOverlay({ id: overlayId, modal: false, element, relatedElements: anchor ? [anchor] : [], dismissible: true, requestClose: close });
    } else {
      surface?.hide();
      closeOverlay(document, overlayId);
    }
    if (lastOpen !== undefined && lastOpen !== open) {
      host.dispatch(open ? "open" : "close", { open, reason: "programmatic", trigger: "programmatic" });
    }
    lastOpen = open;
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") requestTopOverlayClose(document, "escape", "keyboard");
  };
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("keydown", onKeydown);
    surface?.destroy();
    closeOverlay(document, overlayId);
  };
}
