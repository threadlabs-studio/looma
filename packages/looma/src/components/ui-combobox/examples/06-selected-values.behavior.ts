/** Takes each change the user makes, as a consumer that owns selectedValues does. */
export default function keepSelection(root: HTMLElement): () => void {
  const onChange = (event: Event) => {
    const { selectedValues } = (event as CustomEvent<{ selectedValues: readonly string[] }>).detail;
    (event.target as HTMLElement).setAttribute("data-selected-values", JSON.stringify(selectedValues));
  };
  root.addEventListener("selected-values-change", onChange);
  return () => root.removeEventListener("selected-values-change", onChange);
}
