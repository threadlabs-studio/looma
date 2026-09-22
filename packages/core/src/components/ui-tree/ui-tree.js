function classify(rect, y, acceptsChildren) {
  const progress = rect.height > 0 ? Math.min(1, Math.max(0, (y - rect.top) / rect.height)) : 0.5;
  if (!acceptsChildren) return progress < 0.5 ? "before" : "after";
  if (progress < 0.25) return "before";
  if (progress > 0.75) return "after";
  return "inside";
}

function itemId(item) {
  return item.dataset.itemId || item.getAttribute("item-id") || "";
}

function parentItem(item, tree) {
  const parent = item.parentElement?.closest('[data-component-root~="ui-tree-item"]') ?? null;
  return parent && tree.contains(parent) ? parent : null;
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const itemSelector = '[data-component-root~="ui-tree-item"]';
  let source = null;
  let target = null;
  let position = null;
  let rejection = null;
  let rejectedTarget = null;
  let rejectedPosition = null;
  let tabStop = null;
  let hoverTimer = null;
  let hoverKey = null;

  const allItems = () => Array.from(element.querySelectorAll(itemSelector));
  const visibleItems = () => allItems().filter((item) => item.getClientRects().length > 0 && item.getAttribute("aria-disabled") !== "true");
  const rowFor = (item) => item.querySelector('[part="row"]');
  const acceptsChildren = (item) => item.getAttribute("data-container") === "true" && item.getAttribute("aria-disabled") !== "true";
  const metadata = (item) => ({
    type: item.dataset.dragType || item.getAttribute("drag-type") || "item",
    scope: item.dataset.dropScope || item.getAttribute("drop-scope") || "",
    accepts: (item.dataset.accepts || item.getAttribute("accepts") || "").split(",").map((value) => value.trim()).filter(Boolean),
  });
  const depth = (item) => Number(item.dataset.dropDepth ?? item.getAttribute("drop-depth")) || Number(item.getAttribute("aria-level")) || 1;
  const subtreeDepth = (item) => {
    const override = item.dataset.subtreeDepth ?? item.getAttribute("subtree-depth");
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
    const maxDepth = Math.max(0, Math.floor(Number(host.state.maxDepth ?? 0)));
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
    }, Math.max(0, Number(host.state.hoverExpandDelay ?? 700)));
  };
  const clearTarget = () => {
    target?.removeAttribute("data-drop-position");
    target = null;
    position = null;
    cancelHover();
  };
  const finish = () => {
    source?.removeAttribute("data-dragging");
    source = null;
    clearTarget();
    rejection = null;
    rejectedTarget = null;
    rejectedPosition = null;
  };
  const itemFromEvent = (event) => event.composedPath().find((node) => node instanceof HTMLElement && node.matches?.(itemSelector)) ?? null;
  const itemAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest?.(itemSelector) ?? null;
  const updateTarget = (nextTarget, y, transfer) => {
    if (!source || !nextTarget || nextTarget === source) {
      clearTarget();
      rejection = rejectedTarget = rejectedPosition = null;
      return false;
    }
    const row = rowFor(nextTarget);
    if (!row) return false;
    const nextPosition = classify(row.getBoundingClientRect(), y, acceptsChildren(nextTarget));
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
  const dispatchReorder = (from, to, nextPosition) => {
    const sourceId = itemId(from);
    const targetId = itemId(to);
    if (!sourceId || !targetId) return;
    if (nextPosition === "inside") expandTarget(targetId);
    const fromMeta = metadata(from);
    const toMeta = metadata(to);
    host.dispatch("reorder", { sourceId, targetId, position: nextPosition, sourceType: fromMeta.type, targetType: toMeta.type, sourceScope: fromMeta.scope, targetScope: toMeta.scope, trigger: "pointer" });
  };
  const dispatchRejected = (from, to, nextPosition, detail) => {
    const sourceId = itemId(from);
    const targetId = itemId(to);
    if (sourceId && targetId) host.dispatch("reorder-rejected", { sourceId, targetId, position: nextPosition, reason: "max-depth", maxDepth: detail.maxDepth, resultingDepth: detail.resultingDepth, trigger: "pointer" });
  };
  const onDragStart = (event) => {
    const item = itemFromEvent(event);
    const fromHandle = event.composedPath().some((node) => node instanceof HTMLElement && node.getAttribute("part") === "drag-handle");
    if (!item || item.getAttribute("data-sortable") !== "true" || item.getAttribute("aria-disabled") === "true" || !fromHandle) {
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
  const syncStructure = () => {
    for (const item of allItems()) item.dispatchEvent(new CustomEvent("ui-tree-structure-sync"));
    syncTabStop();
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
    if (interactive(event)) return;
    const current = itemFromEvent(event);
    if (!current) return;
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
  };
  const listeners = { dragstart: onDragStart, drag: onDrag, dragenter: onDragOver, dragover: onDragOver, dragleave: onDragLeave, drop: onDrop, dragend: onDragEnd, keydown: onKeydown, focusin: onFocusin, "ui-tree-expansion-change": onExpansion };
  for (const [name, listener] of Object.entries(listeners)) element.addEventListener(name, listener);
  const observer = new MutationObserver(syncStructure);
  observer.observe(element, { childList: true, subtree: true });
  const stop = host.effect(() => element.setAttribute("aria-label", String(host.state.label || "Tree")));
  syncStructure();
  return () => {
    stop();
    observer.disconnect();
    cancelHover();
    for (const [name, listener] of Object.entries(listeners)) element.removeEventListener(name, listener);
  };
}
