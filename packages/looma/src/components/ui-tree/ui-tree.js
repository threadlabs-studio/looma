function classify(rect, y, acceptsChildren) {
  const progress = rect.height > 0 ? Math.min(1, Math.max(0, (y - rect.top) / rect.height)) : 0.5;
  if (!acceptsChildren) return progress < 0.5 ? "before" : "after";
  if (progress < 0.25) return "before";
  if (progress > 0.75) return "after";
  return "inside";
}

// Items publish their identity and drag rules as data attributes for the tree.
function itemId(item) {
  return item.dataset.itemId || "";
}

function parentItem(item, tree) {
  const parent = item.parentElement?.closest('[role="treeitem"]') ?? null;
  return parent && tree.contains(parent) ? parent : null;
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const itemSelector = '[role="treeitem"]';
  let source = null;
  let target = null;
  let position = null;
  let rejection = null;
  let rejectedTarget = null;
  let rejectedPosition = null;
  let tabStop = null;
  let hoverTimer = null;
  let hoverKey = null;
  let typed = "";
  let lastTyped = 0;
  let moveMode = false;
  const announcer = document.createElement("span");
  announcer.setAttribute("role", "status");
  announcer.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
  document.body.append(announcer);
  const announce = (message) => { announcer.textContent = message; };

  const allItems = () => Array.from(element.querySelectorAll(itemSelector));
  const visibleItems = () => allItems().filter((item) => item.getClientRects().length > 0 && item.getAttribute("aria-disabled") !== "true");
  const rowFor = (item) => item.querySelector(":scope > .row");
  const selectionMode = () => String(host.props.selection.value || "none");
  // Only a branch has aria-expanded.
  const acceptsChildren = (item) => item.hasAttribute("aria-expanded") && item.getAttribute("aria-disabled") !== "true";
  const metadata = (item) => ({
    type: item.dataset.dragType || "item",
    scope: item.dataset.dropScope || "",
    accepts: (item.dataset.accepts || "").split(",").map((value) => value.trim()).filter(Boolean),
  });
  const depth = (item) => Number(item.dataset.dropDepth) || Number(item.getAttribute("aria-level")) || 1;
  const subtreeDepth = (item) => {
    const override = item.dataset.subtreeDepth;
    if (override != null) return Math.max(0, Math.floor(Number(override)));
    return Array.from(item.querySelectorAll(itemSelector)).reduce((deepest, descendant) => {
      let nesting = 0;
      let ancestor = parentItem(descendant, element);
      while (ancestor && ancestor !== item) {
        nesting += 1;
        ancestor = parentItem(ancestor, element);
      }
      return ancestor === item ? Math.max(deepest, nesting + 1) : deepest;
    }, 0);
  };
  const rejected = (from, to, nextPosition) => {
    if (from.contains(to)) return { reason: "descendant" };
    const fromMeta = metadata(from);
    const toMeta = metadata(to);
    if (nextPosition === "inside") {
      if (!acceptsChildren(to) || (toMeta.accepts.length && !toMeta.accepts.includes(fromMeta.type))) return { reason: "incompatible" };
    } else if (fromMeta.type !== toMeta.type) return { reason: "incompatible" };
    const maxDepth = Math.max(0, Math.floor(Number(host.props.maxDepth.value ?? 0)));
    if (maxDepth > 0) {
      const resultingDepth = Math.max(0, Math.floor(depth(to))) + (nextPosition === "inside" ? 1 : 0) + subtreeDepth(from);
      if (resultingDepth > maxDepth) return { reason: "max-depth", maxDepth, resultingDepth };
    }
    return null;
  };
  const cancelHover = () => { if (hoverTimer !== null) clearTimeout(hoverTimer); hoverTimer = null; hoverKey = null; };
  const expandTarget = (id) => {
    const item = allItems().find((candidate) => itemId(candidate) === id);
    if (item?.getAttribute("aria-expanded") === "false") item.dispatchEvent(new CustomEvent("ui-tree-auto-expand"));
  };
  const scheduleHover = (id) => {
    if (hoverKey === id && hoverTimer !== null) return;
    cancelHover();
    hoverKey = id;
    hoverTimer = setTimeout(() => {
      const key = hoverKey;
      hoverTimer = null;
      hoverKey = null;
      if (key) expandTarget(key);
    }, Math.max(0, Number(host.props.hoverExpandDelay.value ?? 700)));
  };
  const clearTarget = () => {
    target?.removeAttribute("data-drop-position");
    target = null;
    position = null;
    cancelHover();
  };
  const finish = () => {
    moveMode = false;
    element.removeAttribute("data-move-mode");
    source?.removeAttribute("data-dragging");
    source = null;
    clearTarget();
    rejection = null;
    rejectedTarget = null;
    rejectedPosition = null;
  };
  const itemFromEvent = (event) => event.composedPath().find((node) => node instanceof HTMLElement && node.matches?.(itemSelector)) ?? null;
  const itemAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest?.(itemSelector) ?? null;
  const chooseTarget = (nextTarget, nextPosition, transfer) => {
    if (!source || !nextTarget || nextTarget === source) {
      clearTarget();
      rejection = rejectedTarget = rejectedPosition = null;
      return false;
    }
    const nextRejection = rejected(source, nextTarget, nextPosition);
    if (nextRejection) {
      if (transfer) transfer.dropEffect = "none";
      clearTarget();
      if (nextRejection.reason === "max-depth") {
        rejection = nextRejection;
        rejectedTarget = nextTarget;
        rejectedPosition = nextPosition;
      } else rejection = rejectedTarget = rejectedPosition = null;
      return false;
    }
    rejection = rejectedTarget = rejectedPosition = null;
    if (transfer) transfer.dropEffect = "move";
    if (target !== nextTarget || position !== nextPosition) {
      clearTarget();
      target = nextTarget;
      position = nextPosition;
      target.setAttribute("data-drop-position", position);
    }
    if (position === "inside" && target.getAttribute("aria-expanded") === "false") scheduleHover(itemId(target));
    else cancelHover();
    return true;
  };
  const updateTarget = (nextTarget, y, transfer) => {
    const row = nextTarget && rowFor(nextTarget);
    return row ? chooseTarget(nextTarget, classify(row.getBoundingClientRect(), y, acceptsChildren(nextTarget)), transfer) : false;
  };
  const dispatchReorder = (from, to, nextPosition, how = "pointer") => {
    const sourceId = itemId(from);
    const targetId = itemId(to);
    if (!sourceId || !targetId) return;
    if (nextPosition === "inside") expandTarget(targetId);
    const fromMeta = metadata(from);
    const toMeta = metadata(to);
    host.dispatch("reorder", { sourceId, targetId, position: nextPosition, sourceType: fromMeta.type, targetType: toMeta.type, sourceScope: fromMeta.scope, targetScope: toMeta.scope, trigger: how });
  };
  const dispatchRejected = (from, to, nextPosition, detail, how = "pointer") => {
    const sourceId = itemId(from);
    const targetId = itemId(to);
    if (sourceId && targetId) host.dispatch("reorder-rejected", { sourceId, targetId, position: nextPosition, reason: "max-depth", maxDepth: detail.maxDepth, resultingDepth: detail.resultingDepth, trigger: how });
  };
  const nameOf = (item) => item.getAttribute("aria-label") || itemId(item) || "item";
  const beginMove = (item) => {
    if (!itemId(item) || item.getAttribute("aria-disabled") === "true") return;
    finish();
    moveMode = true;
    source = item;
    source.setAttribute("data-dragging", "true");
    element.setAttribute("data-move-mode", "");
    announce(`Moving ${nameOf(item)}. Choose a destination by click or the arrow keys. Press Enter to place or Escape to cancel.`);
  };
  const commitMove = (how) => {
    if (!source) return;
    if (target && position) {
      const message = `Move requested: ${nameOf(source)} ${position} ${nameOf(target)}.`;
      dispatchReorder(source, target, position, how);
      finish();
      announce(message);
    } else if (rejection && rejectedTarget && rejectedPosition) {
      dispatchRejected(source, rejectedTarget, rejectedPosition, rejection, how);
      finish();
      announce(`Cannot move ${nameOf(source)} there: maximum depth exceeded.`);
    } else announce("Choose another destination row.");
  };
  const onMoveClick = (event) => {
    const handle = event.composedPath().find((node) => node instanceof HTMLElement && node.classList.contains("drag-handle"));
    if (handle) {
      event.preventDefault();
      event.stopPropagation();
      const item = itemFromEvent(event);
      if (item) beginMove(item);
      return;
    }
    if (!moveMode) {
      if (selectionMode() === "none") return;
      const item = itemFromEvent(event);
      if (!item || item.getAttribute("aria-disabled") === "true") return;
      const path = event.composedPath();
      const checkbox = path.some((node) => node instanceof HTMLElement && node.classList.contains("selection-checkbox"));
      const control = path.some((node) => node instanceof HTMLElement && node !== item && node.matches?.('a, button, input, select, textarea, [role="button"], [role="link"]'));
      if (control && !checkbox) return;
      event.preventDefault();
      event.stopPropagation();
      selectItem(item, "pointer");
      focusItem(item);
      if (selectionMode() === "single" && !checkbox) host.dispatch("activate", { id: itemId(item), trigger: "pointer" });
      if (checkbox) requestAnimationFrame(syncSelection);
      return;
    }
    const item = itemFromEvent(event);
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    if (updateTarget(item, event.clientY)) commitMove("pointer");
    else if (rejection) commitMove("pointer");
    else announce("Choose another destination row.");
  };
  const onMovePointer = (event) => {
    if (!moveMode) return;
    const item = itemFromEvent(event);
    if (item && item !== source) updateTarget(item, event.clientY);
  };
  const onMoveKeydown = (event) => {
    if (!moveMode) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
      announce("Move cancelled.");
      return true;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commitMove("keyboard");
      return true;
    }
    if (event.key === "ArrowRight" && target) {
      event.preventDefault();
      if (chooseTarget(target, "inside")) announce(`Move ${nameOf(source)} inside ${nameOf(target)}.`);
      else announce("That item cannot contain this one.");
      return true;
    }
    if (event.key === "ArrowLeft" && target) {
      event.preventDefault();
      const side = allItems().indexOf(target) < allItems().indexOf(source) ? "before" : "after";
      if (chooseTarget(target, side)) announce(`Move ${nameOf(source)} ${side} ${nameOf(target)}.`);
      return true;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
    event.preventDefault();
    const items = visibleItems();
    const step = event.key === "ArrowDown" ? 1 : -1;
    let index = items.indexOf(target ?? source);
    while (index + step >= 0 && index + step < items.length) {
      index += step;
      const candidate = items[index];
      const side = step < 0 ? "before" : "after";
      if (candidate !== source && chooseTarget(candidate, side)) {
        announce(`Move ${nameOf(source)} ${side} ${nameOf(candidate)}. Press Enter to place.`);
        break;
      }
    }
    return true;
  };
  const onDragStart = (event) => {
    if (moveMode) finish();
    const item = itemFromEvent(event);
    // An item renders its drag handle only while it is sortable and enabled.
    const fromHandle = event.composedPath().some((node) => node instanceof HTMLElement && node.classList.contains("drag-handle"));
    if (!item || !fromHandle) {
      event.preventDefault();
      return;
    }
    const id = itemId(item);
    const row = rowFor(item);
    if (!id || !row) { event.preventDefault(); return; }
    source = item;
    item.setAttribute("data-dragging", "true");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      if (typeof event.dataTransfer.setDragImage === "function") event.dataTransfer.setDragImage(row, 16, Math.max(0, row.getBoundingClientRect().height / 2));
    }
  };
  const onDrag = (event) => {
    if (!source || (!event.clientX && !event.clientY)) return;
    const item = itemAtPoint(event.clientX, event.clientY);
    if (item) updateTarget(item, event.clientY, event.dataTransfer);
  };
  const onDragOver = (event) => { if (source && updateTarget(itemFromEvent(event), event.clientY, event.dataTransfer)) event.preventDefault(); };
  const onDragLeave = (event) => {
    if (event.relatedTarget && element.contains(event.relatedTarget)) return;
    if (!itemAtPoint(event.clientX, event.clientY)) {
      clearTarget();
      rejection = rejectedTarget = rejectedPosition = null;
    }
  };
  const onDrop = (event) => {
    if (!source || !target || !position) return;
    event.preventDefault();
    dispatchReorder(source, target, position);
    finish();
  };
  const onDragEnd = (event) => {
    if (source && rejectedTarget && rejectedPosition && rejection) dispatchRejected(source, rejectedTarget, rejectedPosition, rejection);
    else if (source) {
      const item = itemAtPoint(event.clientX, event.clientY);
      const row = item && item !== source ? rowFor(item) : null;
      if (item && row) {
        const nextPosition = classify(row.getBoundingClientRect(), event.clientY, acceptsChildren(item));
        const nextRejection = rejected(source, item, nextPosition);
        if (!nextRejection) dispatchReorder(source, item, nextPosition);
        else if (nextRejection.reason === "max-depth") dispatchRejected(source, item, nextPosition, nextRejection);
      }
    }
    finish();
  };
  const syncTabStop = (preferred = null) => {
    const items = visibleItems();
    const next = preferred && items.includes(preferred) ? preferred : tabStop && items.includes(tabStop) ? tabStop : items[0] ?? null;
    tabStop = next;
    for (const item of items) item.dispatchEvent(new CustomEvent("ui-tree-roving-tab-stop", { detail: { active: item === next } }));
  };
  const syncSelection = () => {
    const mode = selectionMode();
    if (mode === "multiple") element.setAttribute("aria-multiselectable", "true");
    else element.removeAttribute("aria-multiselectable");
    for (const item of allItems()) {
      if (mode === "multiple") item.setAttribute("data-selection-mode", "multiple");
      else item.removeAttribute("data-selection-mode");
      const checkbox = rowFor(item)?.querySelector(".selection-checkbox");
      if (checkbox) {
        checkbox.checked = item.getAttribute("aria-selected") === "true";
        const descendants = Array.from(item.querySelectorAll(itemSelector));
        checkbox.indeterminate = mode === "multiple" && descendants.some((child) => child.getAttribute("aria-selected") === "true")
          && (item.getAttribute("aria-selected") !== "true" || descendants.some((child) => child.getAttribute("aria-selected") !== "true"));
      }
    }
  };
  const selectItem = (item, how) => {
    const mode = selectionMode();
    const id = itemId(item);
    if (mode === "none" || !id) return;
    if (mode === "single") {
      if (item.getAttribute("aria-selected") !== "true") host.dispatch("select", { ids: [id], trigger: how });
      return;
    }
    const items = allItems();
    const selected = new Set(items.filter((candidate) => candidate.getAttribute("aria-selected") === "true").map(itemId).filter(Boolean));
    const subtree = [item, ...Array.from(item.querySelectorAll(itemSelector))]
      .filter((candidate) => candidate.getAttribute("aria-disabled") !== "true");
    const adding = !selected.has(id);
    for (const candidate of subtree) {
      const candidateId = itemId(candidate);
      if (!candidateId) continue;
      if (adding) selected.add(candidateId);
      else selected.delete(candidateId);
    }
    let ancestor = parentItem(item, element);
    while (ancestor) {
      const children = items.filter((candidate) => parentItem(candidate, element) === ancestor);
      if (children.length && children.every((child) => selected.has(itemId(child)))) selected.add(itemId(ancestor));
      else selected.delete(itemId(ancestor));
      ancestor = parentItem(ancestor, element);
    }
    host.dispatch("select", { ids: items.map(itemId).filter((candidate) => candidate && selected.has(candidate)), trigger: how });
  };
  const syncStructure = () => {
    for (const item of allItems()) item.dispatchEvent(new CustomEvent("ui-tree-structure-sync"));
    syncTabStop();
    syncSelection();
  };
  const interactive = (event) => {
    for (const node of event.composedPath()) {
      if (node instanceof HTMLElement && node.matches?.(itemSelector)) break;
      if (node instanceof HTMLElement && node.matches('a, button, input, select, textarea, [role="button"], [role="link"]')) return true;
    }
    return false;
  };
  const focusItem = (item) => { syncTabStop(item); item.focus(); };
  const onFocusin = (event) => { if (!interactive(event)) { const item = itemFromEvent(event); if (item) syncTabStop(item); } };
  const onExpansion = () => requestAnimationFrame(() => syncTabStop());
  const onKeydown = (event) => {
    if (onMoveKeydown(event)) return;
    if (interactive(event)) return;
    const current = itemFromEvent(event);
    if (!current) return;
    if (event.key === "Enter" && selectionMode() === "single" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (current.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      selectItem(current, "keyboard");
      host.dispatch("activate", { id: itemId(current), trigger: "keyboard" });
      return;
    }
    if (event.key === " " && selectionMode() !== "none") {
      event.preventDefault();
      selectItem(current, "keyboard");
      return;
    }
    const items = visibleItems();
    const index = items.indexOf(current);
    if (index < 0) return;
    const next = event.key === "ArrowDown" ? items[index + 1] : event.key === "ArrowUp" ? items[index - 1] : event.key === "Home" ? items[0] : event.key === "End" ? items.at(-1) : null;
    if (next) { event.preventDefault(); focusItem(next); return; }
    if (event.key === "ArrowLeft") {
      if (current.getAttribute("aria-expanded") === "true") { event.preventDefault(); current.dispatchEvent(new CustomEvent("ui-tree-request-expanded", { detail: { expanded: false, trigger: "keyboard" } })); }
      else { const parent = parentItem(current, element); if (parent) { event.preventDefault(); focusItem(parent); } }
    } else if (event.key === "ArrowRight") {
      if (current.getAttribute("aria-expanded") === "false") { event.preventDefault(); current.dispatchEvent(new CustomEvent("ui-tree-request-expanded", { detail: { expanded: true, trigger: "keyboard" } })); }
      else if (current.getAttribute("aria-expanded") === "true") { const child = items.find((item) => parentItem(item, element) === current); if (child) { event.preventDefault(); focusItem(child); } }
    }
    if (event.key.length === 1 && /^[\p{L}\p{N}]$/u.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      typed = `${now - lastTyped < 700 ? typed : ""}${event.key.toLocaleLowerCase()}`;
      lastTyped = now;
      const candidates = [...items.slice(index + 1), ...items.slice(0, index + 1)];
      const match = candidates.find((item) => (item.getAttribute("aria-label") || item.textContent || "").trim().toLocaleLowerCase().startsWith(typed));
      if (match) { event.preventDefault(); focusItem(match); }
    }
  };
  const listeners = { dragstart: onDragStart, drag: onDrag, dragenter: onDragOver, dragover: onDragOver, dragleave: onDragLeave, drop: onDrop, dragend: onDragEnd, keydown: onKeydown, focusin: onFocusin, pointermove: onMovePointer, "ui-tree-expansion-change": onExpansion };
  for (const [name, listener] of Object.entries(listeners)) element.addEventListener(name, listener);
  element.addEventListener("click", onMoveClick, true);
  const observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList")) syncStructure();
    else syncSelection();
  });
  observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  const stop = host.effect(() => {
    element.setAttribute("aria-label", String(host.props.label.value || "Tree"));
    syncSelection();
  });
  syncStructure();
  return () => {
    stop();
    observer.disconnect();
    cancelHover();
    announcer.remove();
    for (const [name, listener] of Object.entries(listeners)) element.removeEventListener(name, listener);
    element.removeEventListener("click", onMoveClick, true);
  };
}
