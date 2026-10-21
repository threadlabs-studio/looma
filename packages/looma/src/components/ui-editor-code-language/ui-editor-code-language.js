// Reports a chosen language; typing a filter is not a choice.
export function connect(host) {
  const element = host.element;
  const onValueChange = (event) => {
    if (event.target !== element && event.detail?.kind === "selection" && event.detail.value) host.dispatch("language", { value: event.detail.value });
  };
  element.addEventListener("value-change", onValueChange);
  return () => element.removeEventListener("value-change", onValueChange);
}
