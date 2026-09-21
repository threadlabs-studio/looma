import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay, requestTopOverlayClose } from "./shared/overlay.js";

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const overlayId = `ui-popover-${Math.random().toString(36).slice(2, 11)}`;
  let anchor = null;
  let surface = null;
  let lastFor;
  let lastPlacement;
  let lastOpen;
  let lastExternalOpen = Boolean(host.state.open);
  host.state.internalOpen = lastExternalOpen;

  const close = (reason, trigger) => {
    host.state.internalOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
  };
  const onAnchorClick = (event) => {
    host.state.internalOpen = !Boolean(host.state.internalOpen);
    if (!host.state.internalOpen) close("action", event.detail === 0 ? "keyboard" : "pointer");
  };
  const ids = createIdResolver(document, () => apply());
  const setup = () => {
    const nextFor = String(host.state.for ?? "");
    const nextPlacement = String(host.state.placement ?? "bottom-start");
    if (surface && nextFor === lastFor && nextPlacement === lastPlacement) return;
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
    ids.stop();
    element.removeEventListener("keydown", onKeydown);
    anchor?.removeEventListener("click", onAnchorClick);
    surface?.destroy();
    closeOverlay(document, overlayId);
  };
}
