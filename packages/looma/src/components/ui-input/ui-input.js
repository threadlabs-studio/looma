// The value attribute only sets the default; a controlled value is applied to the live input. The
// value is also made the native default, so a form reset returns to it.
export default function controller(host) {
  return host.effect(() => {
    const value = host.state.value;
    if (value === undefined || value === null) return;
    const input = host.element;
    const text = String(value);
    input.defaultValue = text;
    if (input.value === text) return;
    // A number field's text can differ from the number it means (1.0 is 1, and Chromium reads 12. as
    // 12). Writing the value would erase what the user is typing, so a field that means it stays.
    if (input.type === "number" && input.value !== "" && Number(input.value) === Number(value)) return;
    input.value = text;
  });
}
