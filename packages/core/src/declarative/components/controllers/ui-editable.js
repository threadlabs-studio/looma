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
    if (preview) preview.disabled = Boolean(host.state.disabled);
    if (input) {
      // The inactive input stays in layout (it shares the value's cell) but out of the tab order.
      input.tabIndex = editing ? 0 : -1;
      input.disabled = Boolean(host.state.disabled) || !editing;
      input.setAttribute("aria-label", String(host.state.label || "Edit value"));
    }
  };

  const setEditing = (next, reason, trigger) => {
    if (host.state.disabled || Boolean(host.state.internalEdit) === next) return;
    // Measured before the input is disabled, which drops focus to the body.
    const focusWasInside = element.contains(document.activeElement);
    if (next) host.state.draft = host.state.internalValue;
    host.state.internalEdit = next;
    apply();
    host.dispatch("edit-change", { edit: next, reason, trigger });
    requestAnimationFrame(() => {
      // Return focus to the display only if it was still inside the editor (Enter, Escape, Save,
      // Cancel). After a click elsewhere, focus stays where the user clicked; pulling it back would
      // scroll the page to this editor.
      if (!next) {
        if (focusWasInside) preview?.focus({ preventScroll: true });
        return;
      }
      input?.focus({ preventScroll: true });
      input?.select();
    });
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
  // Leaving the field saves, as with other in-place editors; Escape is the way to discard.
  const onDocumentPointerdown = (event) => {
    if (host.state.internalEdit && !event.composedPath().includes(element)) commit("pointer");
  };
  // Only the input's own blur counts: hiding the display button during the swap also moves focus,
  // and must not end the edit. Tabbing to another control saves; clicks away are handled above.
  const onInputBlur = (event) => {
    if (host.state.internalEdit && event.relatedTarget && !element.contains(event.relatedTarget)) commit("keyboard");
  };

  element.addEventListener("input", onInput);
  element.addEventListener("click", onClick);
  element.addEventListener("keydown", onKeydown);
  input?.addEventListener("blur", onInputBlur);
  document.addEventListener("pointerdown", onDocumentPointerdown, true);
  const stop = host.effect(apply);
  apply();
  return () => {
    stop();
    element.removeEventListener("input", onInput);
    element.removeEventListener("click", onClick);
    element.removeEventListener("keydown", onKeydown);
    input?.removeEventListener("blur", onInputBlur);
    document.removeEventListener("pointerdown", onDocumentPointerdown, true);
  };
}
