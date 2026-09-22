// The value attribute only sets the default; a controlled value is applied to the live textarea.
export default function controller(host) {
  return host.effect(() => {
    const value = host.state.value;
    if (value !== undefined && value !== null && host.element.value !== String(value)) host.element.value = String(value);
  });
}
