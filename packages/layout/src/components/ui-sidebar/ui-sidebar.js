const BREAKPOINTS = { sm: "40rem", md: "48rem", lg: "64rem" };

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * An application sidebar panel. Docked, it can be resized and collapsed; below its breakpoint it is an
 * off-canvas drawer (a popover). A button toggles it with the platform's invoker commands:
 * `<button commandfor="nav" command="--toggle">`.
 */
export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const view = document.defaultView;
  let resizeHandle;
  let pointerAbort;
  let media;
  let lastCollapsed = Boolean(host.state.collapsed);
  let lastWidth = Number(host.state.width) || 0;
  host.state.internalCollapsed = lastCollapsed;
  host.state.drawer = false;

  const bounds = () => {
    const min = positive(host.state.minWidth, 200);
    return { min, max: Math.max(min, positive(host.state.maxWidth, 480)), step: positive(host.state.resizeStep, 16) };
  };
  const currentWidth = () => element.getBoundingClientRect().width || 280;
  const setWidth = (value, trigger = "programmatic") => {
    const { min, max } = bounds();
    const width = Math.round(Math.max(min, Math.min(max, value)));
    const previous = Number.parseFloat(element.style.getPropertyValue("--_sidebar-width"));
    element.style.setProperty("--_sidebar-width", `${width}px`);
    resizeHandle?.setAttribute("aria-valuemin", String(min));
    resizeHandle?.setAttribute("aria-valuemax", String(max));
    resizeHandle?.setAttribute("aria-valuenow", String(width));
    if (previous !== width) host.dispatch("resize", { width, trigger });
  };

  const onKeydown = (event) => {
    const { min, max, step } = bounds();
    let next = null;
    if (event.key === "Home") next = min;
    if (event.key === "End") next = max;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const delta = event.key === "ArrowRight" ? step : -step;
      next = currentWidth() + (host.state.side === "end" ? -delta : delta);
    }
    if (next === null) return;
    event.preventDefault();
    setWidth(next, "keyboard");
  };
  const onPointerdown = (event) => {
    if (event.button !== 0 || pointerAbort) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = currentWidth();
    const multiplier = host.state.side === "end" ? -1 : 1;
    pointerAbort = new AbortController();
    const signal = pointerAbort.signal;
    const finish = () => {
      pointerAbort?.abort();
      pointerAbort = undefined;
    };
    view.addEventListener("pointermove", (move) => {
      setWidth(startWidth + ((move.clientX - startX) * multiplier), "pointer");
    }, { signal });
    view.addEventListener("pointerup", finish, { once: true, signal });
    view.addEventListener("pointercancel", finish, { once: true, signal });
  };
  const removeHandle = () => {
    pointerAbort?.abort();
    pointerAbort = undefined;
    resizeHandle?.remove();
    resizeHandle = undefined;
  };
  // The handle exists only while the panel is docked, open, and resizable.
  const syncHandle = () => {
    if (!host.state.resizable || host.state.drawer || host.state.internalCollapsed) { removeHandle(); return; }
    if (!resizeHandle) {
      resizeHandle = document.createElement("div");
      resizeHandle.setAttribute("data-ui-sidebar-resizer", "");
      resizeHandle.setAttribute("data-ui-affordance", "resize");
      resizeHandle.setAttribute("role", "separator");
      resizeHandle.setAttribute("aria-orientation", "vertical");
      resizeHandle.setAttribute("tabindex", "0");
      const guide = document.createElement("span");
      guide.setAttribute("data-ui-guide", "");
      guide.setAttribute("aria-hidden", "true");
      resizeHandle.append(guide);
      resizeHandle.addEventListener("keydown", onKeydown);
      resizeHandle.addEventListener("pointerdown", onPointerdown);
      resizeHandle.addEventListener("dblclick", () => {
        element.style.removeProperty("--_sidebar-width");
        setWidth(currentWidth(), "pointer");
      });
      element.append(resizeHandle);
    }
    resizeHandle.setAttribute("aria-label", String(host.state.resizeLabel || "Resize sidebar"));
    const { min, max } = bounds();
    resizeHandle.setAttribute("aria-valuemin", String(min));
    resizeHandle.setAttribute("aria-valuemax", String(max));
    resizeHandle.setAttribute("aria-valuenow", String(Math.round(currentWidth())));
  };

  // Below the breakpoint the panel is a popover drawer: top layer, backdrop, Escape and light dismiss.
  const applyMode = () => {
    const drawer = media?.matches ?? false;
    if (drawer === host.state.drawer) return;
    host.state.drawer = drawer;
    if (drawer) {
      element.setAttribute("popover", "auto");
    } else {
      if (element.matches(":popover-open")) element.hidePopover();
      element.removeAttribute("popover");
    }
    syncHandle();
  };
  const watchBreakpoint = () => {
    media?.removeEventListener("change", applyMode);
    // Without media queries (a non-browser DOM) the sidebar simply stays docked.
    if (typeof view.matchMedia !== "function") return;
    const width = BREAKPOINTS[host.state.breakpoint] ?? BREAKPOINTS.md;
    media = view.matchMedia(`(width < ${width})`);
    media.addEventListener("change", applyMode);
    applyMode();
  };

  const toggle = (trigger) => {
    if (host.state.drawer) {
      element.togglePopover();   // reported by the popover's own toggle event
      return;
    }
    host.state.internalCollapsed = !host.state.internalCollapsed;
    syncHandle();
    host.dispatch("toggle", { open: !host.state.internalCollapsed, mode: "docked", trigger });
  };
  const triggerOf = (source) => source?.matches?.(":focus-visible") ? "keyboard" : "pointer";
  const onCommand = (event) => {
    if (event.command !== "--toggle") return;
    toggle(triggerOf(event.source));
  };
  // Where the platform does not yet dispatch invoker commands, a click on the invoker does the same.
  const invokerCommands = typeof view.HTMLButtonElement?.prototype === "object" && "commandForElement" in view.HTMLButtonElement.prototype;
  const onDocumentClick = (event) => {
    const invoker = event.target.closest?.("[commandfor][command='--toggle']");
    if (!invoker || !element.id || invoker.getAttribute("commandfor") !== element.id) return;
    toggle(triggerOf(invoker));
  };
  const onPopoverToggle = (event) => {
    if (!host.state.drawer) return;
    host.dispatch("toggle", { open: event.newState === "open", mode: "drawer", trigger: "programmatic" });
  };

  const apply = () => {
    const collapsed = Boolean(host.state.collapsed);
    if (collapsed !== lastCollapsed) {
      lastCollapsed = collapsed;
      host.state.internalCollapsed = collapsed;
    }
    const width = Number(host.state.width) || 0;
    if (width !== lastWidth) {
      lastWidth = width;
      if (width > 0) setWidth(width);
      else element.style.removeProperty("--_sidebar-width");
    }
    syncHandle();
  };

  element.addEventListener("command", onCommand);
  element.addEventListener("toggle", onPopoverToggle);
  if (!invokerCommands) document.addEventListener("click", onDocumentClick);
  if (lastWidth > 0) setWidth(lastWidth);
  watchBreakpoint();
  let lastBreakpoint = host.state.breakpoint;
  const stop = host.effect(() => {
    if (host.state.breakpoint !== lastBreakpoint) { lastBreakpoint = host.state.breakpoint; watchBreakpoint(); }
    apply();
  });
  apply();
  return () => {
    stop();
    removeHandle();
    media?.removeEventListener("change", applyMode);
    element.removeEventListener("command", onCommand);
    element.removeEventListener("toggle", onPopoverToggle);
    document.removeEventListener("click", onDocumentClick);
  };
}
