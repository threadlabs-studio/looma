// Reports the chip's text and colour as they change, and Enter or Escape in the text field as done.
// A colour chosen with the pointer returns focus to the text; the arrow keys stay among the swatches.
export function connect(host) {
  const element = host.element;
  const text = () => element.querySelector("[data-chip-label]");
  const onCommand = event => {
    if (event.target === element && event.command === "--focus") { event.stopPropagation(); text()?.focus(); }
  };
  element.addEventListener("command", onCommand);
  if (host.props.autofocus.value) queueMicrotask(() => text()?.focus());
  const onInput = (event) => {
    if (event.target === text()) host.dispatch("label", { label: event.target.value });
  };
  // The radio group reports a choice as select; a text selection in the field is a native select without a value.
  const onSelect = (event) => {
    if (event.target === element || typeof event.detail?.value !== "string") return;
    host.dispatch("color", { color: event.detail.value });
    if (event.detail.trigger === "pointer") text()?.focus();
  };
  const onKeyDown = (event) => {
    if (event.target !== text() || (event.key !== "Enter" && event.key !== "Escape")) return;
    event.preventDefault();
    host.dispatch("done", {});
  };
  element.addEventListener("input", onInput);
  element.addEventListener("select", onSelect);
  element.addEventListener("keydown", onKeyDown);
  return () => {
    element.removeEventListener("command", onCommand);
    element.removeEventListener("input", onInput);
    element.removeEventListener("select", onSelect);
    element.removeEventListener("keydown", onKeyDown);
  };
}
