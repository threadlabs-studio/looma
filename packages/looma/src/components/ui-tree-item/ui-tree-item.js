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

  const isContainer = () => Boolean(host.state.container) || Boolean(host.state.lazy) || childItems().length > 0;
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
    if (host.state.lazy && expanded && childItems().length === 0) element.setAttribute("aria-busy", "true");
    else element.removeAttribute("aria-busy");
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
  const MARQUEE_SPEED = 36; // CSS pixels per second, for every name: a clamped duration made short slides crawl.
  const MARQUEE_REST = 1800; // Milliseconds the name holds at its end before the next pass.
  let marqueeRestart;
  let pointerHover = false;
  let keyboardFocus = false;
  // The tree sets this for its items; an item's own prop overrides it either way.
  const marqueeWanted = () => host.state.marquee
    || getComputedStyle(element).getPropertyValue("--_ui-default-tree-item-marquee").trim() === "1";
  // A slotted link may fill the row and have padding past its name. Measure the rendered letters,
  // since moving that link's box to the actions would send a short name too far (or move it at all).
  const textEdge = (rightToLeft) => {
    const walker = element.ownerDocument.createTreeWalker(labelText, NodeFilter.SHOW_TEXT);
    const range = element.ownerDocument.createRange();
    let edge = rightToLeft ? Infinity : -Infinity;
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        if (rect.width === 0 || rect.height === 0) continue;
        edge = rightToLeft ? Math.min(edge, rect.left) : Math.max(edge, rect.right);
      }
    }
    return Number.isFinite(edge) ? edge : rightToLeft
      ? labelText.getBoundingClientRect().left : labelText.getBoundingClientRect().right;
  };
  const startMarquee = () => {
    if (!labelText || !label || !marqueeWanted()) return;
    labelText.style.flex = "none";
    labelText.style.inlineSize = "max-content";
    const rightToLeft = getComputedStyle(element).direction === "rtl";
    const end = textEdge(rightToLeft);
    labelText.style.flex = labelText.style.inlineSize = "";
    const cell = label.getBoundingClientRect();
    const icon = leading?.getBoundingClientRect();
    const stop = actions?.offsetWidth ?? 0;
    const distance = Math.ceil(rightToLeft ? cell.left + stop - end : end - (cell.right - stop));
    if (distance <= 0) return;
    const lead = icon?.width ? (rightToLeft ? icon.right - cell.right : cell.left - icon.left) : 0;
    row.style.setProperty("--_marquee-lead", `${Math.max(0, lead)}px`);
    row.style.setProperty("--_marquee-icon-width", `${icon?.width ?? 0}px`);
    row.style.setProperty("--_marquee-distance", `${rightToLeft ? distance : -distance}px`);
    row.style.setProperty("--_marquee-duration", `${(distance / MARQUEE_SPEED).toFixed(2)}s`);
    row.dataset.uiMarquee = "";
  };
  const stopMarquee = () => {
    clearTimeout(marqueeRestart);
    delete row.dataset.uiMarquee;
    row.style.removeProperty("--_marquee-lead");
    row.style.removeProperty("--_marquee-icon-width");
    row.style.removeProperty("--_marquee-distance");
    row.style.removeProperty("--_marquee-duration");
  };
  // A hovering pointer and keyboard focus both count: a keyboard walk through a tree reads the same
  // names. A touch does not, so a swipe down the list, or the focus a tap leaves, never starts it.
  const onPointerEnter = (event) => {
    if (event.pointerType === "touch") return;
    pointerHover = true;
    startMarquee();
  };
  const onPointerLeave = (event) => {
    if (event.pointerType === "touch") return;
    pointerHover = false;
    if (!keyboardFocus) stopMarquee();
  };
  // Keyboard focus lands on the item itself as the tree roves, or on a control in its row; a nested
  // item's focus is that item's own.
  const ownFocus = (event) => event.target === element || row.contains(event.target);
  const onFocusIn = (event) => {
    if (!ownFocus(event) || !event.target.matches?.(":focus-visible")) return;
    keyboardFocus = true;
    startMarquee();
  };
  const onFocusOut = (event) => {
    if (!ownFocus(event)) return;
    keyboardFocus = false;
    if (!pointerHover) stopMarquee();
  };
  // After a rest at the end, the name goes again from the start for as long as it is being read.
  const onMarqueeEnd = (event) => {
    if (event.target !== labelText || !("uiMarquee" in row.dataset)) return;
    clearTimeout(marqueeRestart);
    marqueeRestart = setTimeout(() => {
      if (!pointerHover && !keyboardFocus) return;
      delete row.dataset.uiMarquee;
      void labelText.offsetWidth; // Flushes the finished animation, so the next one starts over.
      row.dataset.uiMarquee = "";
    }, MARQUEE_REST);
  };
  row.addEventListener("pointerenter", onPointerEnter);
  row.addEventListener("pointerleave", onPointerLeave);
  element.addEventListener("focusin", onFocusIn);
  element.addEventListener("focusout", onFocusOut);
  labelText?.addEventListener("animationend", onMarqueeEnd);

  // The label's fade has to end where the controls begin, and only the controls know their width.
  const actionsSize = new ResizeObserver(([entry]) => {
    const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
    element.style.setProperty("--_tree-actions-width", `${width}px`);
  });
  if (actions) actionsSize.observe(actions);

  return () => {
    clearTimeout(marqueeRestart);
    stop?.();
    observer.disconnect();
    actionsSize.disconnect();
    row.removeEventListener("pointerenter", onPointerEnter);
    row.removeEventListener("pointerleave", onPointerLeave);
    element.removeEventListener("focusin", onFocusIn);
    element.removeEventListener("focusout", onFocusOut);
    labelText?.removeEventListener("animationend", onMarqueeEnd);
    element.removeEventListener("ui-tree-auto-expand", onAutoExpand);
    element.removeEventListener("ui-tree-structure-sync", onStructure);
    element.removeEventListener("ui-tree-roving-tab-stop", onRoving);
    element.removeEventListener("ui-tree-request-expanded", onExpansionRequest);
    disclosure.removeEventListener("click", onDisclosureClick);
    row.removeEventListener("click", onRowClick);
  };
}
