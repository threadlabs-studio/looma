// The value attribute only sets the default; a controlled value is applied to the live input. The
// value is also made the native default, so a form reset returns to it.
function connect(host) {
  return host.effect(() => {
    const value = host.props.value.value;
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

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
