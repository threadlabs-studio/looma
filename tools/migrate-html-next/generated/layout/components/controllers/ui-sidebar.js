function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export default function controller(host) {
  const element = host.element;
  let resizeHandle;
  let pointerAbort;

  const bounds = () => {
    const min = positive(host.state.minWidth, 176);
    return { min, max: Math.max(min, positive(host.state.maxWidth, 480)), step: positive(host.state.resizeStep, 16) };
  };
  const defaultWidth = () => host.state.width === "narrow" ? 224 : host.state.width === "wide" ? 384 : 288;
  const storageId = () => {
    const key = String(host.state.storageKey ?? "").trim();
    return key ? `looma:sidebar-width:${key}` : null;
  };
  const readStoredWidth = () => {
    const key = storageId();
    if (!key || typeof localStorage === "undefined") return null;
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch { return null; }
  };
  const persistWidth = (width) => {
    const key = storageId();
    if (!key || typeof localStorage === "undefined") return;
    try { localStorage.setItem(key, String(width)); } catch { /* unavailable storage */ }
  };
  const currentWidth = () => {
    const inline = Number.parseFloat(element.style.getPropertyValue("--ui-sidebar-width"));
    if (Number.isFinite(inline)) return inline;
    const children = [...element.children].filter((child) => !child.hasAttribute("data-ui-sidebar-resizer"));
    const region = host.state.side === "end" ? children.at(-1) : children[0];
    return region?.getBoundingClientRect().width || defaultWidth();
  };
  const setWidth = (value, persist = false, trigger = "programmatic") => {
    const { min, max } = bounds();
    const width = Math.round(Math.max(min, Math.min(max, value)));
    const previous = Number.parseFloat(element.style.getPropertyValue("--ui-sidebar-width"));
    element.style.setProperty("--ui-sidebar-width", `${width}px`);
    resizeHandle?.setAttribute("aria-valuemin", String(min));
    resizeHandle?.setAttribute("aria-valuemax", String(max));
    resizeHandle?.setAttribute("aria-valuenow", String(width));
    if (persist && previous !== width) persistWidth(width);
    if (!Number.isFinite(previous) || previous !== width) host.dispatch("resize", { width, trigger });
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
    setWidth(next, true, "keyboard");
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
      persistWidth(currentWidth());
      pointerAbort?.abort();
      pointerAbort = undefined;
    };
    window.addEventListener("pointermove", (move) => {
      setWidth(startWidth + ((move.clientX - startX) * multiplier), false, "pointer");
    }, { signal });
    window.addEventListener("pointerup", finish, { once: true, signal });
    window.addEventListener("pointercancel", finish, { once: true, signal });
  };
  const removeHandle = () => {
    pointerAbort?.abort();
    pointerAbort = undefined;
    resizeHandle?.remove();
    resizeHandle = undefined;
  };
  const sync = () => {
    if (!host.state.resizable) { removeHandle(); return; }
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
      resizeHandle.addEventListener("dblclick", () => setWidth(defaultWidth(), true, "pointer"));
      element.append(resizeHandle);
      setWidth(readStoredWidth() ?? currentWidth());
    }
    resizeHandle.setAttribute("aria-label", String(host.state.resizeLabel || "Resize sidebar"));
    setWidth(currentWidth());
  };
  const stop = host.effect(sync);
  sync();
  return () => { stop(); removeHandle(); };
}
