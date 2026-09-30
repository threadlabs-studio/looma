import { updateComponentProps } from "@nextwebwg/html-next/runtime";

/** Keeps the summary checkbox in step with three independently checked items. */
export default function connectSelection(root: HTMLElement): () => void {
  const all = root.querySelector<HTMLElement>("#docs-checkbox-all");
  const items = Array.from(root.querySelectorAll<HTMLElement>(".docs-checkbox-item"));
  if (!all || !items.length) return () => {};
  const checked = (item: HTMLElement) => Boolean(item.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked);
  const onItemChange = (event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail?.checked !== "boolean") return;
    const count = items.filter(checked).length;
    updateComponentProps(all, { checked: count === items.length, indeterminate: count > 0 && count < items.length });
  };
  const onAllChange = (event: Event) => {
    if (!(event instanceof CustomEvent) || typeof event.detail?.checked !== "boolean") return;
    for (const item of items) updateComponentProps(item, { checked: event.detail.checked });
    updateComponentProps(all, { indeterminate: false });
  };
  all.addEventListener("change", onAllChange);
  for (const item of items) item.addEventListener("change", onItemChange);
  return () => {
    all.removeEventListener("change", onAllChange);
    for (const item of items) item.removeEventListener("change", onItemChange);
  };
}
