import { readNativeProperty, writeNativeProperty } from "./shared/native-control.js";

/** Synchronizes typed Looma props to the native input without replacing native events. */
export default function controller(host) {
  const input = host.element;

  const apply = () => {
    if (input.localName !== "input") return;
    const value = host.state.value ?? input.dataset.value;
    if (value !== undefined && readNativeProperty(input, "value") !== String(value)) {
      writeNativeProperty(input, "value", String(value));
    }
    input.disabled = Boolean(host.state.disabled) || input.dataset.disabled === "true";
    input.readOnly = Boolean(host.state.readonly) || input.dataset.readonly === "true";
    input.required = Boolean(host.state.required) || input.dataset.required === "true";
    input.setAttribute(
      "aria-invalid",
      String(Boolean(host.state.invalid) || input.dataset.invalid === "true"),
    );
  };

  // Keep the declarative value property readable after native user editing.
  const onInput = () => {
    input.value = String(readNativeProperty(input, "value") ?? "");
  };
  input.addEventListener("input", onInput);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop?.();
    input.removeEventListener("input", onInput);
  };
}
