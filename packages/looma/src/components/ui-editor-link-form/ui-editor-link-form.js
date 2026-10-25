import { cancelActiveItemReveal, focusAndRevealItem } from "../shared/active-item-reveal.js";
// Gives each form its own field ids, reports field changes and choices, saves on Enter in a field,
// closes on Escape, and moves between the search field and its results with the arrow keys.
export function connect(host) {
  const element = host.element;
  if (host.state.base === "ui-editor-link-form") host.state.base = `ui-editor-link-form-${Math.random().toString(36).slice(2, 11)}`;
  const within = (event, selector) => {
    const match = event.target.closest?.(selector);
    return match && element.contains(match) ? match : null;
  };
  const onInput = (event) => {
    if (within(event, "[data-link-destination]")) host.dispatch("destination", { value: event.target.value });
    else if (within(event, "[data-link-text]")) host.dispatch("text", { text: event.target.value });
  };
  // Checkbox reports its own change with the new state; the native change it wraps carries none.
  const onChange = (event) => {
    if (within(event, "[data-link-new-tab]") && typeof event.detail?.checked === "boolean") host.dispatch("new-tab", { newTab: event.detail.checked });
  };
  const onClick = (event) => {
    const result = within(event, "[data-link-result]");
    if (result) host.dispatch("choose", { id: result.dataset.linkId });
    else if (within(event, "[data-link-clear]")) {
      host.dispatch("clear", {});
      element.querySelector("[data-link-search]")?.focus();
    }
  };
  const moveFocus = (event, offset) => {
    const results = [...element.querySelectorAll("[data-link-result]")];
    const next = results[results.indexOf(event.target) + offset];
    if (next) focusAndRevealItem(element, next);
    else if (offset < 0) element.querySelector("[data-link-search]")?.focus();
    else return;
    event.preventDefault();
  };
  // The form handles Enter and Escape itself, so the overlay around it does not also act on them.
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      host.dispatch("dismiss", {});
    } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      event.stopPropagation();
      host.dispatch("save", {});
    } else if (event.key === "ArrowDown" && (within(event, "[data-link-result]") || (within(event, "[data-link-search]") && host.props.mode.value === "target"))) {
      moveFocus(event, 1);
    } else if (event.key === "ArrowUp" && within(event, "[data-link-result]")) {
      moveFocus(event, -1);
    }
  };
  const onSubmit = (event) => {
    event.preventDefault();
    host.dispatch("save", {});
  };
  element.addEventListener("input", onInput);
  element.addEventListener("change", onChange);
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeyDown);
  element.addEventListener("submit", onSubmit);
  return () => {
    cancelActiveItemReveal(element);
    element.removeEventListener("input", onInput);
    element.removeEventListener("change", onChange);
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeyDown);
    element.removeEventListener("submit", onSubmit);
  };
}
