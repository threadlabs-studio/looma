// Gives each toolbar its own ids for its tooltips and description popover, reports placement,
// description, and delete requests, and keeps the description draft tied to the image it opened for.
export function connect(host) {
  const element = host.element;
  if (host.state.base === "ui-editor-image-toolbar") host.state.base = `ui-editor-image-toolbar-${Math.random().toString(36).slice(2, 11)}`;
  let target = null;
  const isDescription = (event) => event.target === host.refs.description;
  const onClick = (event) => {
    const control = event.target.closest?.("[data-placement], [data-action]");
    if (!control || !element.contains(control)) return;
    if (control.dataset.placement) host.dispatch("placement", { placement: control.dataset.placement });
    else if (control.dataset.action === "delete") host.dispatch("delete", {});
    else if (control.dataset.action === "cancel") host.state.describing = false;
  };
  const onOpen = (event) => {
    if (!isDescription(event)) return;
    target = host.props.target.value;
    host.state.draft = String(host.props.alt.value ?? "");
    host.state.describing = true;
  };
  const onClose = (event) => {
    if (isDescription(event)) host.state.describing = false;
  };
  const onInput = (event) => {
    if (event.target === host.refs.alt) host.state.draft = event.target.value;
  };
  const onSubmit = (event) => {
    event.preventDefault();
    host.state.describing = false;
    if (host.props.target.value !== target) return;
    host.dispatch("describe", { alt: String(host.state.draft ?? "") });
  };
  // Another image's selection cancels a draft rather than applying it there.
  const stop = host.effect(() => {
    if (host.props.target.value !== target && host.state.describing) host.state.describing = false;
  });
  element.addEventListener("click", onClick);
  element.addEventListener("open", onOpen);
  element.addEventListener("close", onClose);
  element.addEventListener("input", onInput);
  element.addEventListener("submit", onSubmit);
  return () => {
    stop();
    element.removeEventListener("click", onClick);
    element.removeEventListener("open", onOpen);
    element.removeEventListener("close", onClose);
    element.removeEventListener("input", onInput);
    element.removeEventListener("submit", onSubmit);
  };
}
