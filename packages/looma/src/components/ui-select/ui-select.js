// A controlled value can arrive before its projected <option> elements, so it is applied again
// whenever the options change. The value's option is also marked the native default, so a form
// reset returns to it rather than to the first option.
export default function controller(host) {
  const select = host.element;
  const apply = () => {
    const value = host.state.value;
    if (value === undefined || value === null) return;
    for (const option of select.options) option.defaultSelected = option.value === String(value);
    if (select.value !== String(value)) select.value = String(value);
  };
  const observer = new MutationObserver(apply);
  observer.observe(select, { childList: true, subtree: true });
  const stop = host.effect(apply);
  return () => {
    stop();
    observer.disconnect();
  };
}
