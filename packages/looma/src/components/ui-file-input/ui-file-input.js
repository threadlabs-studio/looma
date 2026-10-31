import { fileRejection } from "./files.js";
import { afterFormReset } from "../shared/form-reset.js";

/** Own native file selection and drag/drop; applications own every upload and its lifecycle. */
export function connect(host) {
  const element = host.element;
  const input = element.querySelector("[data-file-control]");
  let selected = Array.from(input.files ?? []);
  const ids = new WeakMap();
  let nextId = 0;
  let options;
  let signature;
  let depth = 0;
  let validity = "";
  let connected = true;
  let trigger = "programmatic";
  const blocked = () => input.matches(":disabled");
  const id = file => { if (!ids.has(file)) ids.set(file, String(++nextId)); return ids.get(file); };
  const paint = () => {
    host.state.files = selected.map(file => ({ id: id(file), name: file.name, size: file.size }));
  };
  const setValidity = message => {
    validity = message;
    host.state.invalidSelection = Boolean(message);
    input.setCustomValidity(message);
    queueMicrotask(() => { if (connected) input.setCustomValidity(validity); });
  };
  const validate = (announce = false) => {
    const previous = validity;
    const message = fileRejection(selected, options) || (announce && input.required && !selected.length ? "Choose at least one file." : "");
    setValidity(message);
    if (announce || message || host.state.error === previous) host.state.error = message;
    return !message;
  };
  const writeFiles = files => {
    if (!files.length) { input.value = ""; return; }
    const transfer = new input.ownerDocument.defaultView.DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
  };
  const propose = (files, source) => {
    if (blocked()) return;
    const message = fileRejection(files, options);
    if (message) {
      writeFiles(selected);
      host.state.error = message;
      input.setCustomValidity(validity);
      queueMicrotask(() => { if (connected) input.setCustomValidity(validity); });
      host.dispatch("reject", { files, message });
      return;
    }
    writeFiles(files);
    selected = files;
    host.state.error = "";
    paint(); validate(true);
    host.dispatch("change", { files: [...selected], trigger: source });
  };
  const change = event => { event.stopPropagation(); propose(Array.from(input.files ?? []), trigger); };
  const stopInput = event => event.stopPropagation();
  const key = () => { trigger = "keyboard"; };
  const pointer = () => { trigger = "pointer"; };
  const invalid = () => { validate(true); };
  const hasFiles = event => Array.from(event.dataTransfer?.types ?? []).includes("Files");
  const enter = event => { if (hasFiles(event) && !blocked()) { depth++; host.state.dragging = true; } };
  const leave = event => { if (hasFiles(event)) { depth = Math.max(0, depth - 1); host.state.dragging = depth > 0; } };
  const over = event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = blocked() ? "none" : "copy";
  };
  const drop = event => {
    if (!hasFiles(event)) return;
    event.preventDefault(); depth = 0; host.state.dragging = false;
    propose(Array.from(event.dataTransfer.files), "pointer");
  };
  const remove = event => {
    const button = event.target.closest?.("[data-file-remove]");
    if (!button || !element.contains(button) || blocked()) return;
    const at = selected.findIndex(file => id(file) === button.getAttribute("data-file-id"));
    if (at < 0) return;
    propose(selected.filter((_, index) => index !== at), event.detail === 0 ? "keyboard" : "pointer");
    queueMicrotask(() => {
      if (!connected) return;
      const buttons = element.querySelectorAll("[data-file-remove]");
      (buttons[Math.min(at, buttons.length - 1)] ?? input).focus();
    });
  };
  input.addEventListener("change", change); input.addEventListener("input", stopInput);
  input.addEventListener("keydown", key); input.addEventListener("pointerdown", pointer); input.addEventListener("invalid", invalid);
  element.addEventListener("dragenter", enter); element.addEventListener("dragleave", leave);
  element.addEventListener("dragover", over); element.addEventListener("drop", drop); element.addEventListener("click", remove);
  const stop = host.effect(() => {
    const next = { multiple: host.props.multiple.value, accept: host.props.accept.value, maxFileSize: host.props.maxFileSize.value, locale: host.props.locale.value, required: host.props.required.value };
    const nextSignature = JSON.stringify(next);
    if (nextSignature === signature) return;
    signature = nextSignature; options = next; paint(); validate();
  });
  host.state.enhanced = true;
  const reset = afterFormReset(input, () => { selected = Array.from(input.files ?? []); host.state.error = ""; paint(); validate(); });
  return () => {
    connected = false; stop(); reset(); host.state.enhanced = false;
    input.setCustomValidity("");
    input.removeEventListener("change", change); input.removeEventListener("input", stopInput);
    input.removeEventListener("keydown", key); input.removeEventListener("pointerdown", pointer); input.removeEventListener("invalid", invalid);
    element.removeEventListener("dragenter", enter); element.removeEventListener("dragleave", leave);
    element.removeEventListener("dragover", over); element.removeEventListener("drop", drop); element.removeEventListener("click", remove);
  };
}
