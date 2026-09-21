import { readNativeProperty, writeNativeProperty } from "./shared/native-control.js";

/**
 * Applies a controlled value after projected options settle.
 *
 * Native selection, keyboard behavior, form participation, and input/change
 * events stay owned by the `<select>` root. The controller exists only because
 * an authored value can arrive before its slotted `<option>` elements.
 */
export default function controller(host) {
  const select = host.element;

  const applyValue = () => {
    if (select.localName !== "select") return;
    const value = host.state.value ?? select.dataset.value;
    if (value !== undefined) writeNativeProperty(select, "value", String(value));
    select.disabled = Boolean(host.state.disabled) || select.dataset.disabled === "true";
    select.required = Boolean(host.state.required) || select.dataset.required === "true";
    select.multiple = Boolean(host.state.multiple) || select.dataset.multiple === "true";
    select.setAttribute(
      "aria-invalid",
      String(Boolean(host.state.invalid) || select.dataset.invalid === "true"),
    );
  };

  const onChange = () => {
    select.value = String(readNativeProperty(select, "value") ?? "");
  };

  const observer = new MutationObserver(applyValue);
  observer.observe(select, { childList: true, subtree: true });
  select.addEventListener("change", onChange);
  const stop = host.effect(applyValue);
  queueMicrotask(applyValue);
  const settledFrame = requestAnimationFrame(applyValue);
  applyValue();

  return () => {
    stop?.();
    cancelAnimationFrame(settledFrame);
    observer.disconnect();
    select.removeEventListener("change", onChange);
  };
}
