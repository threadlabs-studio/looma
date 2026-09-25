import { updateComponentProps } from "@nextwebwg/html-next/runtime";

/** Takes each change the user makes, as a consumer that owns selectedValues does. */
export default function keepSelection(root: HTMLElement): () => void {
  const onChange = (event: Event) => {
    const { selectedValues } = (event as CustomEvent<{ selectedValues: readonly string[] }>).detail;
    // A rendered component's data-* attributes only record its options; the runtime's prop channel sets them.
    updateComponentProps(event.target as Element, { selectedValues });
  };
  root.addEventListener("selected-values-change", onChange);
  return () => root.removeEventListener("selected-values-change", onChange);
}
