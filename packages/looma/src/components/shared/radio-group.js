const groups = new WeakMap();
const radios = new WeakMap();

// Native names own exclusivity and defaultChecked owns form reset. A group's model also has to
// update a child's reactive checked binding, which otherwise can overwrite the native property
// after controller startup. Coordinate through native elements, independently of the adapter.
export function checkRadio(input, checked) {
  radios.get(input)?.(checked);
  input.checked = checked;
}

export function radioGroupOwns(input) {
  return groups.has(input.closest('[role="radiogroup"]'));
}

/** Register a group's selection callback until its controller disconnects. */
export function connectRadioGroup(element, apply) {
  groups.set(element, apply);
  return () => groups.delete(element);
}

/** Join a live group, or let its later startup find this control's checked binding. */
export function connectRadio(input, update) {
  radios.set(input, update);
  groups.get(input.closest('[role="radiogroup"]'))?.(input);
  return () => radios.delete(input);
}
