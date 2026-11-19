// Gives each card its own tooltip ids and reports edit and remove requests without taking focus
// from the editor.
export function connect(host) {
  const element = host.element;
  if (host.state.base === "ui-editor-link-card") host.state.base = `ui-editor-link-card-${Math.random().toString(36).slice(2, 11)}`;
  const stop = host.effect(() => {
    const href = host.props.openHref.value;
    const base = element.ownerDocument.baseURI;
    try {
      host.state.openTarget = new URL(href, base).origin === element.ownerDocument.location.origin ? "_self" : "_blank";
    } catch {
      host.state.openTarget = "_blank";
    }
  });
  const action = (event) => {
    const control = event.target.closest?.("[data-link-action]");
    return control && element.contains(control) ? control.dataset.linkAction : null;
  };
  // Keep the editor's selection while a command is pressed.
  const onPointerDown = (event) => { if (action(event)) event.preventDefault(); };
  const onClick = (event) => {
    const name = action(event);
    if (name) host.dispatch(name, {});
  };
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("click", onClick);
  return () => {
    stop();
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("click", onClick);
  };
}
