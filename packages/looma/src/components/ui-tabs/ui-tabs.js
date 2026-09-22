import { trackTrigger } from "../shared/trigger.js";

let panelIds = 0;

/** Lists the authored panels (each labelled by its aria-label) as tabs and shows the selected one. */
export default function controller(host) {
  const { list, panels: container } = host.refs;
  const [trigger, stopTracking] = trackTrigger(host);
  const panels = () => Array.from(container.children).filter((child) => child instanceof HTMLElement);
  let external = String(host.state.value || "");
  host.state.internalValue = external;

  const readPanels = () => {
    const items = panels();
    host.state.tabs = items.map((panel, index) => {
      if (!panel.id) panel.id = `ui-tab-panel-${++panelIds}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `${panel.id}-tab`);
      return { id: panel.id, label: panel.getAttribute("aria-label") || `Tab ${index + 1}` };
    });
    if (!items.some((panel) => panel.id === host.state.internalValue)) {
      host.state.internalValue = external || items[0]?.id || "";
    }
  };
  const stop = host.effect(() => {
    const value = String(host.state.value || "");
    if (value !== external) {
      external = value;
      host.state.internalValue = value;
    }
    const selected = host.state.internalValue;
    for (const panel of panels()) panel.hidden = panel.id !== selected;
    // Roving focus: only the selected tab is in the tab order.
    for (const button of list.querySelectorAll('[role="tab"]')) button.tabIndex = button.value === selected ? 0 : -1;
  });

  const select = (button, how) => {
    const previousValue = host.state.internalValue || undefined;
    host.state.internalValue = button.value;
    host.dispatch("select", { value: button.value, previousValue, trigger: how });
  };
  const onClick = (event) => {
    const button = event.target.closest?.('[role="tab"]');
    if (button && list.contains(button)) select(button, trigger());
  };
  const onKeydown = (event) => {
    const button = event.target.closest?.('[role="tab"]');
    if (!button || !list.contains(button)) return;
    const buttons = Array.from(list.querySelectorAll('[role="tab"]'));
    const vertical = host.state.orientation === "vertical";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    if (event.key !== previousKey && event.key !== nextKey) return;
    event.preventDefault();
    const index = buttons.indexOf(button);
    const next = buttons[(index + (event.key === nextKey ? 1 : buttons.length - 1)) % buttons.length];
    select(next, "keyboard");
    next.focus();
  };
  // A vertical mouse wheel over an overflowing strip scrolls it sideways instead of the page.
  // Trackpad gestures already carry a horizontal delta and are left to the browser.
  const onWheel = (event) => {
    if (list.scrollWidth <= list.clientWidth || event.deltaX !== 0 || event.ctrlKey) return;
    event.preventDefault();
    list.scrollLeft += event.deltaY;
  };
  list.addEventListener("click", onClick);
  list.addEventListener("keydown", onKeydown);
  list.addEventListener("wheel", onWheel, { passive: false });
  const observer = new MutationObserver(readPanels);
  observer.observe(container, { childList: true });
  readPanels();
  return () => {
    stop();
    stopTracking();
    observer.disconnect();
    list.removeEventListener("click", onClick);
    list.removeEventListener("keydown", onKeydown);
    list.removeEventListener("wheel", onWheel);
  };
}
