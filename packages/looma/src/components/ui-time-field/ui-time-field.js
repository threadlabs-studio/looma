/** Forward the composed field's events once through the same contract in HTML and adapters. */
export function connect(host) {
  const field = host.element.querySelector("[data-time-field]");
  const events = ["input", "change", "query-change", "validation-change"];
  const forward = event => {
    if (event.detail === undefined) return;
    event.stopPropagation();
    host.dispatch(event.type, event.detail);
  };
  const request = event => {
    if (event.target !== host.element) return;
    const accepted = field.dispatchEvent(event instanceof CustomEvent ? new CustomEvent(event.type, { detail: event.detail, cancelable: event.cancelable }) : new Event(event.type));
    if (!accepted) event.preventDefault();
  };
  for (const name of events) field.addEventListener(name, forward);
  for (const name of ["validate", "set-value"]) host.element.addEventListener(name, request);
  return () => {
    for (const name of events) field.removeEventListener(name, forward);
    for (const name of ["validate", "set-value"]) host.element.removeEventListener(name, request);
  };
}
