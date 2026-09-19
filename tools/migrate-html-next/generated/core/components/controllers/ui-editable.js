function triggerElement(event) {
  return event.composedPath().find((node) => node instanceof HTMLElement && node.hasAttribute("data-ui-editable-trigger"));
}

export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  let trigger = null;
  host.state.internalEdit = host.state.edit === undefined
    ? Boolean(host.state.defaultEdit)
    : Boolean(host.state.edit);

  const apply = () => {
    if (host.state.edit !== undefined) host.state.internalEdit = Boolean(host.state.edit);
    const editing = Boolean(host.state.internalEdit);
    const preview = element.querySelector('[part="preview"]');
    const editor = element.querySelector('[part="edit"]');
    if (preview) preview.hidden = editing;
    if (editor) editor.hidden = !editing;
  };
  const focusEditor = () => {
    const editRoot = element.querySelector('[slot="edit"]');
    const selector = "input, textarea, select, button, [tabindex], [data-component-root~='ui-combobox']";
    const candidate = editRoot?.matches(selector) ? editRoot : editRoot?.querySelector(selector);
    if (typeof candidate?.focusInput === "function") void candidate.focusInput();
    else candidate?.focus?.();
  };
  const requestEdit = (next, reason, input) => {
    if (host.state.disabled || Boolean(host.state.internalEdit) === next) return;
    if (host.state.edit === undefined) host.state.internalEdit = next;
    apply();
    host.dispatch("edit-change", { edit: next, reason, trigger: input });
    requestAnimationFrame(() => next ? focusEditor() : trigger?.focus?.());
  };
  const onClick = (event) => {
    if (host.state.internalEdit || host.state.disabled) return;
    const candidate = triggerElement(event);
    if (!candidate) return;
    trigger = candidate;
    requestEdit(true, "activate", "pointer");
  };
  const onKeydown = (event) => {
    if (host.state.internalEdit && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      requestEdit(false, "escape", "keyboard");
      return;
    }
    if (host.state.internalEdit || !["Enter", " "].includes(event.key)) return;
    const candidate = triggerElement(event);
    if (!candidate) return;
    event.preventDefault();
    trigger = candidate;
    requestEdit(true, "activate", "keyboard");
  };
  const onDocumentPointerdown = (event) => {
    if (host.state.internalEdit && !event.composedPath().includes(element)) {
      requestEdit(false, "light-dismiss", "pointer");
    }
  };
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onDocumentPointerdown, true);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    document.removeEventListener("pointerdown", onDocumentPointerdown, true);
  };
}
