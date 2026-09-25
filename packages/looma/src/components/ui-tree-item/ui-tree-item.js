import { trackInputModality } from "../shared/input-modality.js";

function triggerFor(event) {
  return event.detail === 0 ? "keyboard" : "pointer";
}

function parentItem(element) {
  return element.parentElement?.closest('[role="treeitem"]') ?? null;
}

/** Synchronizes an inferred tree hierarchy after nested component lowering. */
// What a row click leaves alone: a control, or anything inside one, such as an item of the options
// menu a row holds. Clicking those neither follows the row's link nor toggles a branch.
const CONTROLS = [
  "a", "button", "input", "select", "textarea", "label", "summary", '[contenteditable=""]', '[contenteditable="true"]',
  ...["button", "link", "menu", "menuitem", "menuitemcheckbox", "menuitemradio", "listbox", "option", "checkbox",
    "radio", "switch", "tab", "slider", "spinbutton", "combobox", "textbox", "dialog"].map((role) => `[role="${role}"]`),
].join(", ");

export default function controller(host) {
  const element = host.element;
  const { row, disclosure, children, leading, label, actions, labelText } = host.refs;
  // Touch use enlarges rows and hides drag handles (see the template's styles).
  trackInputModality(element.ownerDocument);
  const childItems = () => Array.from(children?.children ?? [])
    .filter((child) => child.matches?.('[role="treeitem"]'));
  let lastExternalExpanded = Boolean(host.state.expanded);
  host.state.internalExpanded = lastExternalExpanded;

  const isContainer = () => Boolean(host.state.container) || childItems().length > 0;
  const updateLevel = () => {
    const tree = element.closest('[role="tree"]');
    let ancestor = parentItem(element);
    let level = 1;
    while (ancestor && tree?.contains(ancestor)) {
      level += 1;
      ancestor = parentItem(ancestor);
    }
    host.state.structuralLevel = level;
  };

  const apply = () => {
    const externalExpanded = Boolean(host.state.expanded);
    if (externalExpanded !== lastExternalExpanded) {
      lastExternalExpanded = externalExpanded;
      host.state.internalExpanded = externalExpanded;
    }
    const container = isContainer();
    const expanded = container && Boolean(host.state.internalExpanded);
    const name = String(host.state.label || "Unnamed item");
    host.state.isContainer = container;
    // A leaf has no aria-expanded at all; "false" would announce it as a collapsed branch.
    if (container) element.setAttribute("aria-expanded", String(expanded));
    else element.removeAttribute("aria-expanded");
    element.tabIndex = host.state.disabled || !host.state.tabStop ? -1 : 0;
    element.style.setProperty("--ui-tree-item-depth", String(Number(host.state.structuralLevel ?? 1) - 1));
    disclosure.setAttribute("aria-expanded", String(expanded));
    disclosure.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${name}`);
  };

  const setExpanded = (next, trigger) => {
    if (!isContainer() || host.state.disabled || Boolean(host.state.internalExpanded) === next) return;
    host.state.internalExpanded = next;
    apply();
    host.dispatch("expand", { id: String(host.state.itemId || ""), expanded: next, trigger });
    element.dispatchEvent(new CustomEvent("ui-tree-expansion-change", { bubbles: true }));
  };
  const onDisclosureClick = (event) => { event.stopPropagation(); setExpanded(!Boolean(host.state.internalExpanded), triggerFor(event)); };
  const onRowClick = (event) => {
    if (host.state.disabled) return;
    const interactive = event.composedPath().some((node) => node instanceof HTMLElement && node.matches?.(CONTROLS));
    if (interactive) return;
    if (isContainer()) {
      setExpanded(!Boolean(host.state.internalExpanded), triggerFor(event));
      return;
    }
    // A leaf row whose label is a link is that link everywhere a control is not: its icon and padding
    // follow it too. The click is replayed with its modifiers, so a modified click still opens a tab.
    const link = labelText?.querySelector("a[href]");
    if (link) link.dispatchEvent(new MouseEvent("click", event));
  };
  const onRoving = (event) => { host.state.tabStop = Boolean(event.detail?.active) && !host.state.disabled; apply(); };
  const onExpansionRequest = (event) => {
    if (typeof event.detail?.expanded === "boolean") setExpanded(event.detail.expanded, event.detail.trigger ?? "keyboard");
  };
  const onStructure = () => { updateLevel(); apply(); };
  const onAutoExpand = () => setExpanded(true, "pointer");

  element.addEventListener("ui-tree-auto-expand", onAutoExpand);
  element.addEventListener("ui-tree-structure-sync", onStructure);
  element.addEventListener("ui-tree-roving-tab-stop", onRoving);
  element.addEventListener("ui-tree-request-expanded", onExpansionRequest);
  disclosure.addEventListener("click", onDisclosureClick);
  row.addEventListener("click", onRowClick);
  const observer = new MutationObserver(() => { updateLevel(); apply(); });
  observer.observe(children, { childList: true });
  updateLevel();
  const stop = host.effect(apply);
  apply();
  /**
   * A hovered row reads its whole name. The label box always fills the row, so the name is measured
   * at its own width; it has to end where the fade before the controls begins, since the controls
   * overlay the label's end rather than taking width from it.
   */
  const MARQUEE_SPEED = 36; // CSS pixels per second.
  // The tree sets this for its items; an item's own prop overrides it either way.
  const marqueeWanted = () => host.state.marquee
    || getComputedStyle(element).getPropertyValue("--ui-tree-item-marquee").trim() === "1";
  const startMarquee = () => {
    if (!labelText || !label || !marqueeWanted()) return;
    labelText.style.flex = "none";
    labelText.style.inlineSize = "max-content";
    const text = labelText.getBoundingClientRect();
    labelText.style.flex = labelText.style.inlineSize = "";
    const cell = label.getBoundingClientRect();
    const icon = leading?.getBoundingClientRect();
    const stop = (actions?.offsetWidth ?? 0) + parseFloat(getComputedStyle(label).columnGap);
    const rightToLeft = getComputedStyle(element).direction === "rtl";
    const distance = Math.ceil(rightToLeft ? cell.left + stop - text.left : text.right - (cell.right - stop));
    if (distance <= 0) return;
    const lead = icon?.width ? (rightToLeft ? icon.right - cell.right : cell.left - icon.left) : 0;
    row.style.setProperty("--_marquee-lead", `${Math.max(0, lead)}px`);
    row.style.setProperty("--_marquee-distance", `${rightToLeft ? distance : -distance}px`);
    row.style.setProperty(
      "--_marquee-duration",
      `${Math.min(10, Math.max(1.4, distance / MARQUEE_SPEED)).toFixed(2)}s`
    );
    row.dataset.uiMarquee = "";
  };
  const stopMarquee = () => {
    delete row.dataset.uiMarquee;
    row.style.removeProperty("--_marquee-lead");
    row.style.removeProperty("--_marquee-distance");
    row.style.removeProperty("--_marquee-duration");
  };
  // Pointer and focus both count: a keyboard walk through a tree reads the same names.
  row.addEventListener("pointerenter", startMarquee);
  row.addEventListener("pointerleave", stopMarquee);
  row.addEventListener("focusin", startMarquee);
  row.addEventListener("focusout", stopMarquee);

  // The label's fade has to end where the controls begin, and only the controls know their width.
  const actionsSize = new ResizeObserver(([entry]) => {
    const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
    element.style.setProperty("--_tree-actions-width", `${width}px`);
  });
  if (actions) actionsSize.observe(actions);

  return () => {
    stop?.();
    observer.disconnect();
    actionsSize.disconnect();
    row.removeEventListener("pointerenter", startMarquee);
    row.removeEventListener("pointerleave", stopMarquee);
    row.removeEventListener("focusin", startMarquee);
    row.removeEventListener("focusout", stopMarquee);
    element.removeEventListener("ui-tree-auto-expand", onAutoExpand);
    element.removeEventListener("ui-tree-structure-sync", onStructure);
    element.removeEventListener("ui-tree-roving-tab-stop", onRoving);
    element.removeEventListener("ui-tree-request-expanded", onExpansionRequest);
    disclosure.removeEventListener("click", onDisclosureClick);
    row.removeEventListener("click", onRowClick);
  };
}
