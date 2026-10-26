/** Keep the sample's meter in step with its native checkboxes; leaving the page releases the listener. */
export function connect(host) {
  const checklist = host.refs.checklist;
  const update = () => { host.state.completed = checklist.querySelectorAll('input:checked').length; };
  checklist.addEventListener('change', update);
  // Child controls upgrade after this parent; retain the authored count until a native change.
  return () => checklist.removeEventListener('change', update);
}
