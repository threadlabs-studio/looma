import { trackTrigger } from "../shared/trigger.js";

let panelIds = 0;
const GROUP_EVENT = "looma-tabs-group";
const storageKey = (group) => `looma-tabs:${group}`;

// Storage can be missing or throw (private windows, blocked site data); the selection still syncs in the page.
function readStored(group) {
  try { return globalThis.localStorage?.getItem(storageKey(group)) ?? null; } catch { return null; }
}
function writeStored(group, label) {
  try { globalThis.localStorage?.setItem(storageKey(group), label); } catch { /* not remembered */ }
}

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

  const group = () => String(host.props.group.value || "");
  const document = host.element.ownerDocument;
  // A group shares a selection by tab label, since panel ids are unique in a document.
  const selectLabel = (label) => {
    const tab = host.state.tabs.find((candidate) => candidate.label === label);
    if (!tab || tab.id === host.state.internalValue) return false;
    host.state.internalValue = tab.id;
    return true;
  };
  const select = (button, how) => {
    const previousValue = host.state.internalValue || undefined;
    host.state.internalValue = button.value;
    host.dispatch("select", { value: button.value, previousValue, trigger: how });
    const name = group();
    const label = host.state.tabs.find((tab) => tab.id === button.value)?.label;
    if (!name || label === undefined) return;
    writeStored(name, label);
    document.dispatchEvent(new CustomEvent(GROUP_EVENT, { detail: { group: name, label, source: host.element } }));
  };
  const onGroupSelect = (event) => {
    const { group: name, label, source } = event.detail;
    if (source === host.element || name !== group()) return;
    const previousValue = host.state.internalValue || undefined;
    if (selectLabel(label)) host.dispatch("select", { value: host.state.internalValue, previousValue, trigger: "programmatic" });
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
  document.addEventListener(GROUP_EVENT, onGroupSelect);
  // A remembered choice applies when the page does not choose a panel itself.
  if (group() && !external) {
    const stored = readStored(group());
    if (stored !== null) selectLabel(stored);
  }
  return () => {
    document.removeEventListener(GROUP_EVENT, onGroupSelect);
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
