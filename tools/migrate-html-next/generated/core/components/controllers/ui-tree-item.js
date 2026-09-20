function triggerFor(event) {
  if (typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) return "keyboard";
  if ((typeof MouseEvent !== "undefined" && event instanceof MouseEvent)
    || (typeof PointerEvent !== "undefined" && event instanceof PointerEvent)
    || ["click", "pointerdown", "pointerup"].includes(event.type)) return "pointer";
  return "programmatic";
}

function parentItem(element) {
  return element.parentElement?.closest('[data-component-root~="ui-tree-item"]') ?? null;
}

export default function controller(host) {
  const element = host.element;
  const row = element.querySelector('[part="row"]');
  const disclosure = element.querySelector('[part="disclosure"]');
  const children = element.querySelector('[part="children"]');
  const dragHandle = element.querySelector('[part="drag-handle"]');
  host.state.internalExpanded = host.state.expanded === undefined
    ? Boolean(host.state.defaultExpanded)
    : Boolean(host.state.expanded);

  const expanded = () => host.state.expanded === undefined ? Boolean(host.state.internalExpanded) : Boolean(host.state.expanded);
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
    if (host.state.expanded !== undefined) host.state.internalExpanded = Boolean(host.state.expanded);
    const container = Boolean(host.state.container);
    const disabled = Boolean(host.state.disabled);
    const open = container && expanded();
    const level = Number(host.state.structuralLevel ?? 1);
    element.setAttribute("role", "treeitem");
    if (host.state.label) element.setAttribute("aria-label", String(host.state.label));
    else element.removeAttribute("aria-label");
    element.setAttribute("aria-level", String(level));
    element.setAttribute("aria-selected", String(Boolean(host.state.selected)));
    element.setAttribute("aria-disabled", String(disabled));
    if (container) element.setAttribute("aria-expanded", String(open));
    else element.removeAttribute("aria-expanded");
    element.tabIndex = disabled || !host.state.tabStop ? -1 : 0;
    element.style.setProperty("--ui-tree-item-depth", String(level - 1));
    element.style.marginInlineStart = level > 1 ? "var(--ui-tree-indent, 16px)" : "0px";
    if (children) children.hidden = !open;
    if (disclosure) {
      disclosure.disabled = disabled;
      disclosure.setAttribute("aria-expanded", String(open));
      disclosure.setAttribute("aria-label", `${open ? "Collapse" : "Expand"} ${host.state.label || "item"}`);
    }
    disclosure?.querySelector(".disclosure-icon")?.classList.toggle("disclosure-icon--expanded", open);
    if (dragHandle) {
      const label = `Drag ${host.state.label || "item"} to reorder`;
      dragHandle.setAttribute("aria-label", label);
      dragHandle.title = label;
      dragHandle.draggable = Boolean(host.state.sortable) && !disabled;
    }
  };
  const setExpanded = (open, trigger) => {
    if (!host.state.container || host.state.disabled || expanded() === open) return;
    if (host.state.expanded === undefined) host.state.internalExpanded = open;
    apply();
    host.dispatch("expand", { id: String(host.state.itemId ?? ""), expanded: open, trigger });
    element.dispatchEvent(new CustomEvent("ui-tree-expansion-change", { bubbles: true }));
  };
  const onAutoExpand = () => setExpanded(true, "pointer");
  const onStructure = () => { updateLevel(); apply(); };
  const onRoving = (event) => { host.state.tabStop = Boolean(event.detail?.active) && !host.state.disabled; };
  const onExpansionRequest = (event) => {
    if (typeof event.detail?.expanded === "boolean") setExpanded(event.detail.expanded, event.detail.trigger ?? "keyboard");
  };
  const onDisclosureClick = (event) => {
    event.stopPropagation();
    setExpanded(!expanded(), triggerFor(event));
  };
  const onDisclosureKeydown = (event) => {
    if (!["ArrowRight", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    setExpanded(event.key === "ArrowRight", "keyboard");
  };
  const onRowClick = (event) => {
    if (!host.state.container || host.state.disabled) return;
    const interactive = event.composedPath().some((node) => node instanceof HTMLElement && (node.matches('a, button, input, select, textarea, [role="button"], [role="link"]') || node.getAttribute("slot") === "actions"));
    if (!interactive) setExpanded(!expanded(), triggerFor(event));
  };
  element.addEventListener("ui-tree-auto-expand", onAutoExpand);
  element.addEventListener("ui-tree-structure-sync", onStructure);
  element.addEventListener("ui-tree-roving-tab-stop", onRoving);
  element.addEventListener("ui-tree-request-expanded", onExpansionRequest);
  disclosure?.addEventListener("click", onDisclosureClick);
  disclosure?.addEventListener("keydown", onDisclosureKeydown);
  row?.addEventListener("click", onRowClick);
  updateLevel();
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("ui-tree-auto-expand", onAutoExpand);
    element.removeEventListener("ui-tree-structure-sync", onStructure);
    element.removeEventListener("ui-tree-roving-tab-stop", onRoving);
    element.removeEventListener("ui-tree-request-expanded", onExpansionRequest);
    disclosure?.removeEventListener("click", onDisclosureClick);
    disclosure?.removeEventListener("keydown", onDisclosureKeydown);
    row?.removeEventListener("click", onRowClick);
  };
}
