/** Filters the example's results as the query changes; a real application would query its index. */
export default function filterResults(root: HTMLElement): () => void {
  const update = () => {
    const input = root.querySelector<HTMLInputElement>('[data-example-id="docs-search-input"]');
    const status = root.querySelector<HTMLElement>('[data-example-id="docs-search-status"]');
    const empty = root.querySelector<HTMLElement>('[data-example-id="docs-search-empty"]');
    const results = [
      root.querySelector<HTMLElement>('[data-example-id="docs-result-design-tokens"]'),
      root.querySelector<HTMLElement>('[data-example-id="docs-result-token-overrides"]'),
      root.querySelector<HTMLElement>('[data-example-id="docs-result-button-variants"]')
    ].filter((result): result is HTMLElement => result !== null);
    if (!input || !status || !empty || results.length === 0) return;
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    for (const result of results) {
      result.hidden = !result.textContent?.toLowerCase().includes(query);
      if (!result.hidden) visible += 1;
    }
    status.textContent = `${visible} result${visible === 1 ? "" : "s"}`;
    empty.hidden = visible !== 0;
  };
  const onInput = (event: Event) => {
    if ((event.target as HTMLElement | null)?.dataset.exampleId === "docs-search-input") update();
  };
  root.addEventListener("input", onInput);
  const frame = requestAnimationFrame(update);
  return () => {
    cancelAnimationFrame(frame);
    root.removeEventListener("input", onInput);
  };
}
