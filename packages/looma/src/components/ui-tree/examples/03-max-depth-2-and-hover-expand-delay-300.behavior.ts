/**
 * Applies a tree's `reorder` requests, as an application does: the tree reports a drop, and the
 * application moves the item. The tree re-derives levels from the DOM.
 */
export default function applyTreeReorder(root: HTMLElement): () => void {
  const onReorder = (event: Event) => {
    const { sourceId, targetId, position } = (event as CustomEvent<{
      sourceId: string;
      targetId: string;
      position: "before" | "inside" | "after";
    }>).detail;
    const tree = (event.target as Element | null)?.closest('[role="tree"]');
    const item = (id: string) => tree?.querySelector<HTMLElement>(`[role="treeitem"][data-item-id="${CSS.escape(id)}"]`);
    const source = item(sourceId);
    const target = item(targetId);
    if (!source || !target || source === target || source.contains(target)) return;
    if (position === "before") target.before(source);
    else if (position === "after") target.after(source);
    else {
      const group = target.querySelector<HTMLElement>(':scope > [role="group"]');
      if (!group) return;
      // Stay inside the group's slot range: before its closing marker when there is one.
      const last = group.lastChild;
      const marker = last && (last.nodeType === Node.PROCESSING_INSTRUCTION_NODE || last.nodeType === Node.COMMENT_NODE) ? last : null;
      group.insertBefore(source, marker);
    }
  };
  root.addEventListener("reorder", onReorder, true);
  return () => root.removeEventListener("reorder", onReorder, true);
}
