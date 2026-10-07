import { trackTrigger } from "../shared/trigger.js";

let panelIds = 0;

/** Lists the authored panels (each labelled by its aria-label) as tabs and shows the selected one. */
function connect(host) {
  const { list, panels: container } = host.refs;
  const [trigger, stopTracking] = trackTrigger(host);
  const panels = () => Array.from(container.children).filter((child) => child instanceof HTMLElement);
  const tabButtons = () => Array.from(list.querySelectorAll("button"));
  const focusTab = (button) => {
    for (const tab of tabButtons()) tab.tabIndex = tab === button ? 0 : -1;
    button.focus();
  };
  let external = String(host.props.value.value || "");
  host.state.internalValue = external;

  const readPanels = () => {
    const items = panels();
    host.state.tabs = items.map((panel, index) => {
      if (!panel.id) panel.id = `ui-tab-panel-${++panelIds}`;
      panel.setAttribute("role", "tabpanel");
      return { id: panel.id, label: panel.getAttribute("aria-label") || `Tab ${index + 1}` };
    });
    if (!items.some((panel) => panel.id === host.state.internalValue)) {
      host.state.internalValue = external || items[0]?.id || "";
    }
    syncButtons();
  };
  const syncButtons = () => {
    const buttons = tabButtons();
    const selected = host.state.internalValue;
    const focused = list.contains(host.element.ownerDocument.activeElement) ? host.element.ownerDocument.activeElement : null;
    for (const [index, panel] of panels().entries()) {
      const button = buttons.find((candidate) => candidate.value === panel.id) ?? buttons[index];
      if (!button) continue;
      button.type = "button";
      button.value = panel.id;
      button.setAttribute("role", "tab");
      if (!button.id) button.id = `${panel.id}-tab`;
      button.setAttribute("aria-controls", panel.id);
      button.setAttribute("aria-selected", String(panel.id === selected));
      button.tabIndex = button.disabled ? -1 : button === focused || (!focused && button.value === selected) ? 0 : -1;
      panel.setAttribute("aria-labelledby", button.id);
    }
  };
  const stop = host.effect(() => {
    const value = String(host.props.value.value || "");
    if (value !== external) {
      external = value;
      host.state.internalValue = value;
    }
    const selected = host.state.internalValue;
    for (const panel of panels()) panel.hidden = panel.id !== selected;
    // Roving focus: only the selected tab is in the tab order.
    syncButtons();
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
    const buttons = tabButtons().filter((candidate) => !candidate.disabled);
    const vertical = host.props.orientation.value === "vertical";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    if (host.props.activation.value === "manual" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      select(button, "keyboard");
      return;
    }
    if (event.key !== previousKey && event.key !== nextKey && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = buttons.indexOf(button);
    const next = event.key === "Home" ? buttons[0] : event.key === "End" ? buttons.at(-1) : buttons[(index + (event.key === nextKey ? 1 : buttons.length - 1)) % buttons.length];
    if (host.props.activation.value !== "manual") select(next, "keyboard");
    focusTab(next);
  };
  const onFocusout = (event) => {
    if (list.contains(event.relatedTarget)) return;
    for (const button of tabButtons()) button.tabIndex = button.value === host.state.internalValue ? 0 : -1;
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
  list.addEventListener("focusout", onFocusout);
  list.addEventListener("wheel", onWheel, { passive: false });
  const observer = new MutationObserver(readPanels);
  observer.observe(container, { childList: true });
  const tabObserver = new MutationObserver(syncButtons);
  tabObserver.observe(list, { childList: true });
  readPanels();
  return () => {
    stop();
    stopTracking();
    observer.disconnect();
    tabObserver.disconnect();
    list.removeEventListener("click", onClick);
    list.removeEventListener("keydown", onKeydown);
    list.removeEventListener("focusout", onFocusout);
    list.removeEventListener("wheel", onWheel);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
