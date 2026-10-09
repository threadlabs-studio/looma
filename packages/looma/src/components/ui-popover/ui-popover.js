import { closeOverlay, createAnchoredSurface, createIdResolver, openOverlay, requestTopOverlayClose } from "../shared/overlay.js";

function connect(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const offset = () => {
    const value = getComputedStyle(element).getPropertyValue("--ui-popover-offset").trim();
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return 4;
    if (value.endsWith("rem")) return amount * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (value.endsWith("em")) return amount * Number.parseFloat(getComputedStyle(element).fontSize);
    return amount;
  };
  const overlayId = `ui-popover-${Math.random().toString(36).slice(2, 11)}`;
  let anchor = null;
  let anchorExpanded = null;
  let surface = null;
  let lastFor;
  let lastPlacement;
  let lastOpen;
  let lastExternalOpen = Boolean(host.props.open.value);
  host.state.internalOpen = lastExternalOpen;

  const close = (reason, trigger) => {
    host.state.internalOpen = false;
    lastOpen = false;
    host.dispatch("close", { open: false, reason, trigger });
  };
  const onAnchorClick = (event) => {
    const trigger = event.detail === 0 ? "keyboard" : "pointer";
    if (host.state.internalOpen) {
      close("action", trigger);
      return;
    }
    host.state.internalOpen = true;
    // Announce the anchor's toggle once, with its real trigger; apply() only announces changes it made.
    lastOpen = true;
    host.dispatch("open", { open: true, reason: "action", trigger });
  };
  const ids = createIdResolver(document, () => apply());
  const releaseAnchor = () => {
    if (!anchor) return;
    anchor.removeEventListener("click", onAnchorClick);
    if (anchorExpanded === null) anchor.removeAttribute("aria-expanded");
    else anchor.setAttribute("aria-expanded", anchorExpanded);
    anchor = null;
    anchorExpanded = null;
  };
  const setup = () => {
    const nextFor = String(host.props.for.value ?? "");
    const nextPlacement = String(host.props.placement.value ?? "bottom-start");
    if (surface && nextFor === lastFor && nextPlacement === lastPlacement
      && (!nextFor || anchor === document.getElementById(nextFor))) return;
    lastFor = nextFor;
    lastPlacement = nextPlacement;
    surface?.destroy();
    releaseAnchor();
    anchor = ids.get(nextFor);
    if (anchor) anchorExpanded = anchor.getAttribute("aria-expanded");
    anchor?.addEventListener("click", onAnchorClick);
    surface = createAnchoredSurface(element, { anchor, placement: nextPlacement, gap: offset });
  };
  const apply = () => {
    const externalOpen = Boolean(host.props.open.value);
    if (externalOpen !== lastExternalOpen) {
      lastExternalOpen = externalOpen;
      host.state.internalOpen = externalOpen;
    }
    setup();
    const open = Boolean(host.state.internalOpen);
    if (anchor) anchor.setAttribute("aria-expanded", String(open));
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
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      requestTopOverlayClose(document, "escape", "keyboard");
    }
  };
  element.addEventListener("keydown", onKeydown);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    ids.stop();
    element.removeEventListener("keydown", onKeydown);
    surface?.destroy();
    closeOverlay(document, overlayId);
    releaseAnchor();
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
