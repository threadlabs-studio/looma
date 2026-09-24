// The value attribute only sets the default; a controlled value is applied to the live textarea. The
// value is also made the native default, so a form reset returns to it.
export default function controller(host) {
  return host.effect(() => {
    const value = host.state.value;
    if (value === undefined || value === null) return;
    host.element.defaultValue = String(value);
    if (host.element.value !== String(value)) host.element.value = String(value);
  });
}
