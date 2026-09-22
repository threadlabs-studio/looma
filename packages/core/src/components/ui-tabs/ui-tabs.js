let nextTabId = 0;

function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

/** Builds the native tab controls from authored, aria-labeled panel sections. */
export default function controller(host) {
  const element = host.element;
  const tablist = element.querySelector(".tabs__list");
  const panelContainer = element.querySelector(".tabs__panels");
  const panels = () => Array.from(panelContainer?.children ?? []).filter((child) => child instanceof HTMLElement);
  let lastExternalValue = String(host.state.value || "");
  host.state.internalValue = lastExternalValue;

  const apply = () => {
    const externalValue = String(host.state.value || "");
    if (externalValue !== lastExternalValue) {
      lastExternalValue = externalValue;
      host.state.internalValue = externalValue;
    }
    element.setAttribute("data-orientation", host.state.orientation || "horizontal");
    tablist?.setAttribute("aria-label", String(host.state.label || "Tabs"));
    const items = panels();
    const buttons = Array.from(tablist?.querySelectorAll('[role="tab"]') ?? []);
    buttons.forEach((button, index) => {
      const panel = items[index];
      if (!panel) return;
      const selected = panel.id === host.state.internalValue;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
    });
  };

  const rebuild = () => {
    if (!tablist) return;
    const items = panels();
    const buttons = items.map((panel, index) => {
      if (!panel.id) panel.id = `ui-tab-panel-${++nextTabId}`;
      const button = element.ownerDocument.createElement("button");
      button.type = "button";
      button.id = `ui-tab-${++nextTabId}`;
      button.value = panel.id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panel.id);
      button.textContent = panel.getAttribute("aria-label") || `Tab ${index + 1}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", button.id);
      return button;
    });
    tablist.replaceChildren(...buttons);
    if (!items.some((panel) => panel.id === host.state.internalValue)) {
      host.state.internalValue = lastExternalValue || items[0]?.id || "";
    }
    apply();
  };

  const select = (button, trigger) => {
    const previousValue = String(host.state.internalValue || "") || undefined;
    host.state.internalValue = button.value;
    apply();
    host.dispatch("select", { value: button.value, previousValue, trigger });
  };

  const onClick = (event) => {
    const button = event.target.closest?.('[role="tab"]');
    if (button && tablist?.contains(button)) select(button, triggerFor(event));
  };
  const onKeydown = (event) => {
    const button = event.target.closest?.('[role="tab"]');
    if (!button || !tablist?.contains(button)) return;
    const buttons = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const index = buttons.indexOf(button);
    const vertical = host.state.orientation === "vertical";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    if (event.key !== previousKey && event.key !== nextKey) return;
    event.preventDefault();
    const nextIndex = event.key === nextKey
      ? (index + 1) % buttons.length
      : (index - 1 + buttons.length) % buttons.length;
    const next = buttons[nextIndex];
    if (next) {
      select(next, "keyboard");
      next.focus();
    }
  };

  // A vertical mouse wheel over an overflowing strip scrolls it sideways instead of the page.
  // Trackpad gestures already carry a horizontal delta and are left to the browser.
  const onWheel = (event) => {
    if (!tablist || tablist.scrollWidth <= tablist.clientWidth || event.deltaX !== 0 || event.ctrlKey) return;
    event.preventDefault();
    tablist.scrollLeft += event.deltaY;
  };
  tablist?.addEventListener("click", onClick);
  tablist?.addEventListener("keydown", onKeydown);
  tablist?.addEventListener("wheel", onWheel, { passive: false });
  const observer = new MutationObserver(rebuild);
  if (panelContainer) observer.observe(panelContainer, { childList: true });
  const stop = host.effect(apply);
  rebuild();
  return () => {
    stop?.();
    observer.disconnect();
    tablist?.removeEventListener("click", onClick);
    tablist?.removeEventListener("keydown", onKeydown);
    tablist?.removeEventListener("wheel", onWheel);
  };
}
