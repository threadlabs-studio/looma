// A controlled value can arrive before its projected <option> elements, so it is applied again
// whenever the options change.
export default function controller(host) {
  const select = host.element;
  const apply = () => {
    const value = host.state.value;
    if (value !== undefined && value !== null && select.value !== String(value)) select.value = String(value);
  };
  const observer = new MutationObserver(apply);
  observer.observe(select, { childList: true, subtree: true });
  const stop = host.effect(apply);
  return () => {
    stop();
    observer.disconnect();
  };
}
