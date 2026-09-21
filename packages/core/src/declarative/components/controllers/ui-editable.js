function triggerFor(event) {
  if (event instanceof KeyboardEvent) return "keyboard";
  if (event instanceof MouseEvent || event instanceof PointerEvent) return "pointer";
  return "programmatic";
}

/** Owns the display/edit transition so authors only provide value and label. */
export default function controller(host) {
  const element = host.element;
  const document = element.ownerDocument;
  const preview = element.querySelector(".editable__preview");
  const input = element.querySelector(".editable__input");
  const editor = element.querySelector(".editable__editor");
  let lastExternalEdit = Boolean(host.state.edit);
  let lastExternalValue = String(host.state.value ?? "");
  host.state.internalEdit = lastExternalEdit;
  host.state.internalValue = lastExternalValue;
  host.state.draft = lastExternalValue;

  const apply = () => {
    const externalEdit = Boolean(host.state.edit);
    const externalValue = String(host.state.value ?? "");
    if (externalEdit !== lastExternalEdit) {
      lastExternalEdit = externalEdit;
      host.state.internalEdit = externalEdit;
      if (externalEdit) host.state.draft = host.state.internalValue;
    }
    if (externalValue !== lastExternalValue) {
      lastExternalValue = externalValue;
      host.state.internalValue = externalValue;
      if (!host.state.internalEdit) host.state.draft = externalValue;
    }
    const editing = Boolean(host.state.internalEdit);
    if (preview) preview.hidden = editing;
    if (editor) editor.hidden = !editing;
    if (preview) preview.disabled = Boolean(host.state.disabled);
    if (input) {
      input.disabled = Boolean(host.state.disabled);
      input.setAttribute("aria-label", String(host.state.label || "Edit value"));
    }
  };

  const setEditing = (next, reason, trigger) => {
    if (host.state.disabled || Boolean(host.state.internalEdit) === next) return;
    if (next) host.state.draft = host.state.internalValue;
    host.state.internalEdit = next;
    apply();
    host.dispatch("edit-change", { edit: next, reason, trigger });
    requestAnimationFrame(() => next ? input?.focus() : preview?.focus());
  };
  const commit = (trigger) => {
    const previousValue = String(host.state.internalValue ?? "");
    const value = String(host.state.draft ?? "");
    host.state.internalValue = value;
    setEditing(false, "commit", trigger);
    if (value !== previousValue) host.dispatch("change", { value, previousValue, trigger });
  };
  const cancel = (reason, trigger) => {
    host.state.draft = host.state.internalValue;
    setEditing(false, reason, trigger);
  };
  const onInput = (event) => {
    if (event.target !== input) return;
    host.state.draft = input.value;
    host.dispatch("input", { value: input.value, trigger: "keyboard" });
  };
  const onClick = (event) => {
    if (event.target.closest?.(".editable__preview")) {
      setEditing(true, "activate", triggerFor(event));
      return;
    }
    const action = event.target.closest?.("[data-action]")?.dataset.action;
    if (action === "save") commit(triggerFor(event));
    else if (action === "cancel") cancel("cancel", triggerFor(event));
  };
  const onKeydown = (event) => {
    if (!host.state.internalEdit) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancel("escape", "keyboard");
    } else if (event.key === "Enter" && event.target === input) {
      event.preventDefault();
      commit("keyboard");
    }
  };
  const onDocumentPointerdown = (event) => {
    if (host.state.internalEdit && !event.composedPath().includes(element)) {
      cancel("light-dismiss", "pointer");
    }
  };

  element.addEventListener("input", onInput);
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onDocumentPointerdown, true);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("input", onInput);
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    document.removeEventListener("pointerdown", onDocumentPointerdown, true);
  };
}
