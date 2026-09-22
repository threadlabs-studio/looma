/**
 * Reads or writes a built-in DOM property even when HTML Next exposes a
 * same-named declarative prop on the component root.
 *
 * Direct-native components intentionally use `<input>`, `<select>`, and
 * `<textarea>` as their public roots. HTML Next currently installs declared
 * props as own accessors, so a `value` declaration shadows the browser's
 * prototype accessor. Calling that prototype accessor preserves the native
 * control state while the public accessor continues to represent the typed
 * declarative contract.
 */
function nativeDescriptor(element, name) {
  let prototype = Object.getPrototypeOf(element);
  while (prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor) return descriptor;
    prototype = Object.getPrototypeOf(prototype);
  }
  return undefined;
}

export function readNativeProperty(element, name) {
  return nativeDescriptor(element, name)?.get?.call(element);
}

export function writeNativeProperty(element, name, value) {
  const descriptor = nativeDescriptor(element, name);
  if (descriptor?.set) descriptor.set.call(element, value);
}
