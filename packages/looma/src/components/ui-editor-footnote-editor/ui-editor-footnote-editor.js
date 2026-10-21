// Gives each editor its own field ids, reports the note's text as it changes and a label when it is
// committed, Go to note when pressed, and Enter or Escape in a field as done.
export function connect(host) {
  const element = host.element;
  if (host.state.base === "ui-editor-footnote-editor") host.state.base = `ui-editor-footnote-editor-${Math.random().toString(36).slice(2, 11)}`;
  const within = (event, selector) => {
    const match = event.target.closest?.(selector);
    return match && element.contains(match) ? match : null;
  };
  const onInput = (event) => {
    if (within(event, "[data-footnote-note]")) host.dispatch("text", { text: event.target.value });
  };
  const onChange = (event) => {
    if (within(event, "[data-footnote-label]") && typeof event.target.value === "string") host.dispatch("label", { label: event.target.value.trim() });
  };
  const onClick = (event) => {
    if (within(event, "[data-footnote-go]")) host.dispatch("go", {});
  };
  // The editor handles Enter and Escape itself, so the overlay around it does not also act on them.
  const onKeyDown = (event) => {
    const label = within(event, "[data-footnote-label]");
    if ((event.key !== "Enter" && event.key !== "Escape") || !(label || within(event, "[data-footnote-note]"))) return;
    event.preventDefault();
    event.stopPropagation();
    if (label && event.key === "Enter") host.dispatch("label", { label: event.target.value.trim() });
    host.dispatch("done", {});
  };
  element.addEventListener("input", onInput);
  element.addEventListener("change", onChange);
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeyDown);
  return () => {
    element.removeEventListener("input", onInput);
    element.removeEventListener("change", onChange);
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeyDown);
  };
}
