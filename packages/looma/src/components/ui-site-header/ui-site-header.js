import { closeDialog, closeOverlay, openOverlay, requestTopOverlayClose, showDialog } from "../shared/overlay.js";

const BREAKPOINTS = { sm: "40rem", md: "48rem", lg: "64rem" };

/** Presents the authored navigation inline on desktop and in a modal drawer on mobile. */
export function connect(host) {
  const { panel, trigger, close, navigation, inline } = host.refs;
  const document = panel.ownerDocument;
  const view = document.defaultView;
  const id = panel.id ||= `ui-site-navigation-${Math.random().toString(36).slice(2, 11)}`;
  let media;
  let breakpoint;
  let open = false;
  trigger.setAttribute("aria-controls", id);

  const dismiss = () => {
    if (!open) return;
    open = false;
    trigger.setAttribute("aria-expanded", "false");
    closeDialog(panel);
    inline.append(navigation);
    closeOverlay(document, id);
  };
  const syncMode = () => {
    const drawer = media?.matches ?? false;
    if (drawer === host.state.drawer) return;
    const focusedLink = navigation.contains(document.activeElement) ? document.activeElement : null;
    dismiss();
    // A pending overlay transition would keep the inline desktop navigation in the top layer.
    for (const animation of panel.getAnimations()) animation.cancel();
    if (drawer) closeDialog(panel);
    host.state.drawer = drawer;
    if (!drawer) focusedLink?.focus({ preventScroll: true });
  };
  const watchBreakpoint = () => {
    const next = host.props.breakpoint.value;
    if (next === breakpoint) return;
    breakpoint = next;
    media?.removeEventListener("change", syncMode);
    media = view.matchMedia(`(width < ${BREAKPOINTS[next] ?? BREAKPOINTS.lg})`);
    media.addEventListener("change", syncMode);
    syncMode();
  };
  const onTrigger = () => {
    if (!host.state.drawer || open) return;
    open = true;
    trigger.setAttribute("aria-expanded", "true");
    panel.append(navigation);
    showDialog(panel, true);
    openOverlay({ id, modal: true, element: panel, dismissible: true, requestClose: dismiss });
  };
  const onNavigation = (event) => {
    if (event.target.closest?.("a[href]")) dismiss();
  };
  const onCancel = (event) => {
    event.preventDefault();
    requestTopOverlayClose(document, "escape", "keyboard");
  };
  const onClose = (event) => {
    if (event.target === panel && !panel.open) dismiss();
  };
  trigger.addEventListener("click", onTrigger);
  close.addEventListener("click", dismiss);
  navigation.addEventListener("click", onNavigation);
  panel.addEventListener("cancel", onCancel);
  panel.addEventListener("close", onClose);
  host.state.enhanced = true;
  const stop = host.effect(watchBreakpoint);
  watchBreakpoint();
  return () => {
    stop();
    media?.removeEventListener("change", syncMode);
    trigger.removeEventListener("click", onTrigger);
    close.removeEventListener("click", dismiss);
    navigation.removeEventListener("click", onNavigation);
    panel.removeEventListener("cancel", onCancel);
    panel.removeEventListener("close", onClose);
    dismiss();
    host.state.enhanced = false;
    host.state.drawer = false;
    inline.append(navigation);
  };
}
