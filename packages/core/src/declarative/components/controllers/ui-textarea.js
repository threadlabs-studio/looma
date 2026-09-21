import { readNativeProperty, writeNativeProperty } from "./shared/native-control.js";

/** Synchronizes typed Looma props to the native textarea without replacing native events. */
export default function controller(host) {
  const textarea = host.element;

  const apply = () => {
    if (textarea.localName !== "textarea") return;
    const value = host.state.value ?? textarea.dataset.value;
    if (value !== undefined && readNativeProperty(textarea, "value") !== String(value)) {
      writeNativeProperty(textarea, "value", String(value));
    }
    textarea.disabled = Boolean(host.state.disabled) || textarea.dataset.disabled === "true";
    textarea.readOnly = Boolean(host.state.readonly) || textarea.dataset.readonly === "true";
    textarea.required = Boolean(host.state.required) || textarea.dataset.required === "true";
    textarea.rows = Number(host.state.rows ?? textarea.dataset.rows ?? 4);
    textarea.setAttribute(
      "aria-invalid",
      String(Boolean(host.state.invalid) || textarea.dataset.invalid === "true"),
    );
  };

  // Keep the declarative value property readable after native user editing.
  const onInput = () => {
    textarea.value = String(readNativeProperty(textarea, "value") ?? "");
  };
  textarea.addEventListener("input", onInput);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop?.();
    textarea.removeEventListener("input", onInput);
  };
}
