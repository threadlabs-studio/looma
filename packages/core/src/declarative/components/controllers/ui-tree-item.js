function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

function parentItem(element) {
  return element.parentElement?.closest('[data-component-root~="ui-tree-item"]') ?? null;
}

/** Synchronizes an inferred tree hierarchy after nested component lowering. */
export default function controller(host) {
  const element = host.element;
  const row = element.querySelector('[part="row"]');
  const disclosure = element.querySelector('[part="disclosure"]');
  const children = element.querySelector('[part="children"]');
  const dragHandle = element.querySelector('[part="drag-handle"]');
  const label = element.querySelector('[part="label"]');
  const childItems = () => Array.from(children?.children ?? [])
    .filter((child) => child.matches?.('[data-component-root~="ui-tree-item"]'));
  let lastExternalExpanded = Boolean(host.state.expanded);
  host.state.internalExpanded = lastExternalExpanded;

  const isContainer = () => Boolean(host.state.container) || childItems().length > 0;
  const updateLevel = () => {
    const tree = element.closest('[data-component-root~="ui-tree"]');
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
    const disabled = Boolean(host.state.disabled);
    const expanded = container && Boolean(host.state.internalExpanded);
    const level = Number(host.state.structuralLevel ?? 1);
    const name = String(host.state.label || "Unnamed item");
    element.setAttribute("role", "treeitem");
    element.setAttribute("aria-label", name);
    element.setAttribute("aria-level", String(level));
    element.setAttribute("aria-selected", String(Boolean(host.state.selected)));
    element.setAttribute("aria-disabled", String(disabled));
    element.setAttribute("data-container", String(container));
    element.setAttribute("data-selected", String(Boolean(host.state.selected)));
    element.setAttribute("data-disabled", String(disabled));
    element.setAttribute("data-sortable", String(Boolean(host.state.sortable)));
    if (container) element.setAttribute("aria-expanded", String(expanded));
    else element.removeAttribute("aria-expanded");
    element.tabIndex = disabled || !host.state.tabStop ? -1 : 0;
    element.style.setProperty("--ui-tree-item-depth", String(level - 1));
    if (label && label.textContent !== name) label.textContent = name;
    if (children) children.hidden = !expanded;
    if (disclosure) {
      disclosure.hidden = !container;
      disclosure.disabled = disabled;
      disclosure.setAttribute("aria-expanded", String(expanded));
      disclosure.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${name}`);
    }
    disclosure?.querySelector(".disclosure-icon")?.classList.toggle("disclosure-icon--expanded", expanded);
    if (dragHandle) {
      dragHandle.setAttribute("aria-label", `Drag ${name} to reorder`);
      dragHandle.draggable = Boolean(host.state.sortable) && !disabled;
    }
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
    if (!isContainer() || host.state.disabled) return;
    const interactive = event.composedPath().some((node) => node instanceof HTMLElement && node.matches?.('a, button, input, select, textarea, [role="button"], [role="link"]'));
    if (!interactive) setExpanded(!Boolean(host.state.internalExpanded), triggerFor(event));
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
  disclosure?.addEventListener("click", onDisclosureClick);
  row?.addEventListener("click", onRowClick);
  const observer = new MutationObserver(() => { updateLevel(); apply(); });
  if (children) observer.observe(children, { childList: true });
  updateLevel();
  const stop = host.effect(apply);
  apply();
  return () => {
    stop?.();
    observer.disconnect();
    element.removeEventListener("ui-tree-auto-expand", onAutoExpand);
    element.removeEventListener("ui-tree-structure-sync", onStructure);
    element.removeEventListener("ui-tree-roving-tab-stop", onRoving);
    element.removeEventListener("ui-tree-request-expanded", onExpansionRequest);
    disclosure?.removeEventListener("click", onDisclosureClick);
    row?.removeEventListener("click", onRowClick);
  };
}
