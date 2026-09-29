import { updateComponentProps } from "@nextwebwg/html-next/runtime";

/** Apply Tree's controlled selection request to the authored items in this example. */
export default function applyTreeSelection(root: HTMLElement): () => void {
  const onSelect = (event: Event) => {
    const { ids } = (event as CustomEvent<{ ids: string[] }>).detail;
    const tree = (event.target as Element | null)?.closest('[role="tree"]');
    if (!tree) return;
    const selected = new Set(ids);
    for (const item of tree.querySelectorAll<HTMLElement>('[role="treeitem"][data-item-id]')) {
      updateComponentProps(item, { selected: selected.has(item.dataset.itemId ?? "") });
    }
  };
  root.addEventListener("select", onSelect, true);
  return () => root.removeEventListener("select", onSelect, true);
}
